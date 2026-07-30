drop policy if exists "Instructors cancel own upcoming lessons"
  on public.lesson_schedules;
create policy "Instructors cancel own upcoming lessons"
on public.lesson_schedules
for update
to authenticated
using (
  instructor_profile_id = (select auth.uid())
  and status in ('pending_room_approval', 'scheduled')
  and ends_at > now()
)
with check (
  instructor_profile_id = (select auth.uid())
  and status = 'cancelled'
);

drop policy if exists "Instructors close own pending room approval on cancellation"
  on public.room_approval_requests;
create policy "Instructors close own pending room approval on cancellation"
on public.room_approval_requests
for update
to authenticated
using (
  status = 'pending'
  and exists (
    select 1
    from public.lesson_schedules ls
    where ls.id = room_approval_requests.lesson_schedule_id
      and ls.instructor_profile_id = (select auth.uid())
  )
)
with check (
  status = 'denied'
  and decided_by = (select auth.uid())
  and decided_at is not null
  and exists (
    select 1
    from public.lesson_schedules ls
    where ls.id = room_approval_requests.lesson_schedule_id
      and ls.instructor_profile_id = (select auth.uid())
  )
);

create or replace function public.cancel_lesson_occurrence(
  p_lesson_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_requester uuid := auth.uid();
  v_is_admin boolean := public.is_ords_admin();
  v_lesson public.lesson_schedules%rowtype;
begin
  if v_requester is null then
    raise exception 'Authentication is required.';
  end if;

  select *
  into v_lesson
  from public.lesson_schedules
  where id = p_lesson_id
  for update;

  if not found then
    raise exception 'The lesson could not be found.';
  end if;

  if not v_is_admin and v_lesson.instructor_profile_id <> v_requester then
    raise exception 'You can only cancel your own lessons.';
  end if;

  if v_lesson.status not in ('pending_room_approval', 'scheduled')
    or v_lesson.ends_at <= now() then
    raise exception 'Only upcoming pending or scheduled lessons can be cancelled.';
  end if;

  if v_lesson.status = 'pending_room_approval' then
    update public.room_approval_requests
    set status = 'denied',
        decision_note = 'Lesson cancelled before room approval.',
        decided_by = v_requester,
        decided_at = now()
    where lesson_schedule_id = v_lesson.id
      and status = 'pending';

    if not found then
      raise exception 'The room approval request could not be closed.';
    end if;
  end if;

  update public.lesson_schedules
  set status = 'cancelled'
  where id = v_lesson.id;

  return v_lesson.id;
end;
$$;

revoke all on function public.cancel_lesson_occurrence(uuid)
  from public, anon;
grant execute on function public.cancel_lesson_occurrence(uuid)
  to authenticated;
