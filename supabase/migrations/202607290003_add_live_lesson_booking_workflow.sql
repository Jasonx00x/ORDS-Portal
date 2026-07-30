create table if not exists public.instructor_unavailability (
  id uuid primary key default gen_random_uuid(),
  instructor_profile_id uuid not null references public.app_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

alter table public.lesson_schedules
  add column if not exists notes text,
  add column if not exists recurrence_group_id uuid;

create index if not exists instructor_unavailability_lookup_idx
  on public.instructor_unavailability(instructor_profile_id, starts_at, ends_at);

create index if not exists lesson_schedules_recurrence_group_idx
  on public.lesson_schedules(recurrence_group_id)
  where recurrence_group_id is not null;

create unique index if not exists room_approval_requests_lesson_unique_idx
  on public.room_approval_requests(lesson_schedule_id);

alter table public.instructor_unavailability enable row level security;

drop policy if exists "ORDS admins manage instructor unavailability"
  on public.instructor_unavailability;
create policy "ORDS admins manage instructor unavailability"
on public.instructor_unavailability
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "Instructors manage own unavailability"
  on public.instructor_unavailability;
create policy "Instructors manage own unavailability"
on public.instructor_unavailability
for all
to authenticated
using (instructor_profile_id = (select auth.uid()))
with check (instructor_profile_id = (select auth.uid()));

grant select, insert, update, delete
  on public.instructor_unavailability
  to authenticated;

drop trigger if exists instructor_unavailability_touch
  on public.instructor_unavailability;
create trigger instructor_unavailability_touch
before update on public.instructor_unavailability
for each row execute function public.touch_updated_at();

drop trigger if exists rooms_touch on public.rooms;
create trigger rooms_touch
before update on public.rooms
for each row execute function public.touch_updated_at();

drop trigger if exists school_hours_touch on public.school_hours;
create trigger school_hours_touch
before update on public.school_hours
for each row execute function public.touch_updated_at();

drop trigger if exists students_touch on public.students;
create trigger students_touch
before update on public.students
for each row execute function public.touch_updated_at();

drop trigger if exists instructor_availability_touch
  on public.instructor_availability;
create trigger instructor_availability_touch
before update on public.instructor_availability
for each row execute function public.touch_updated_at();

drop trigger if exists lesson_schedules_touch on public.lesson_schedules;
create trigger lesson_schedules_touch
before update on public.lesson_schedules
for each row execute function public.touch_updated_at();

drop trigger if exists room_approval_requests_touch
  on public.room_approval_requests;
create trigger room_approval_requests_touch
before update on public.room_approval_requests
for each row execute function public.touch_updated_at();

create or replace function public.create_lesson_request(
  p_student_id uuid,
  p_instructor_profile_id uuid,
  p_room_id uuid,
  p_program text,
  p_starts_at timestamptz,
  p_duration_minutes integer default 60,
  p_repeat_weeks integer default 1,
  p_notes text default null
)
returns table (
  lesson_schedule_id uuid,
  lesson_starts_at timestamptz,
  lesson_status text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_requester uuid := auth.uid();
  v_is_admin boolean := public.is_ords_admin();
  v_recurrence_group_id uuid :=
    case when p_repeat_weeks > 1 then gen_random_uuid() else null end;
  v_iteration integer;
  v_start timestamptz;
  v_end timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
  v_lesson_id uuid;
begin
  if v_requester is null then
    raise exception 'Authentication is required.';
  end if;

  if p_duration_minutes < 15 or p_duration_minutes > 240 then
    raise exception 'Lesson duration must be between 15 and 240 minutes.';
  end if;

  if p_repeat_weeks < 1 or p_repeat_weeks > 24 then
    raise exception 'Recurring lessons must contain between 1 and 24 weeks.';
  end if;

  if p_starts_at <= now() then
    raise exception 'Lesson time must be in the future.';
  end if;

  if nullif(trim(p_program), '') is null then
    raise exception 'A lesson program is required.';
  end if;

  if not exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.is_active
  ) then
    raise exception 'The selected room is not active.';
  end if;

  if not exists (
    select 1
    from public.app_profiles p
    where p.id = p_instructor_profile_id
      and p.role = 'instructor'
      and p.invite_status <> 'disabled'
  ) then
    raise exception 'The selected instructor is not active.';
  end if;

  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.status in ('setup', 'active')
      and s.contract_status = 'approved'
  ) then
    raise exception 'The selected student is not approved for scheduling.';
  end if;

  if not exists (
    select 1
    from public.instructor_student_assignments a
    where a.student_id = p_student_id
      and a.instructor_profile_id = p_instructor_profile_id
      and lower(a.program) = lower(trim(p_program))
  ) then
    raise exception 'The student is not assigned to this instructor and program.';
  end if;

  if not v_is_admin and v_requester <> p_instructor_profile_id then
    raise exception 'Instructors can only schedule their own assigned students.';
  end if;

  for v_iteration in 0..(p_repeat_weeks - 1) loop
    v_start := p_starts_at + make_interval(weeks => v_iteration);
    v_end := v_start + make_interval(mins => p_duration_minutes);
    v_local_start := v_start at time zone 'America/New_York';
    v_local_end := v_end at time zone 'America/New_York';

    if v_local_start::date <> v_local_end::date then
      raise exception 'Lessons must start and finish on the same local day.';
    end if;

    if not exists (
      select 1
      from public.school_hours h
      where h.day_of_week = extract(dow from v_local_start)::integer
        and h.is_enabled
        and h.opens_at <= v_local_start::time
        and h.closes_at >= v_local_end::time
    ) then
      raise exception 'Lesson falls outside configured school hours.';
    end if;

    if not exists (
      select 1
      from public.instructor_availability a
      where a.instructor_profile_id = p_instructor_profile_id
        and a.day_of_week = extract(dow from v_local_start)::integer
        and a.is_enabled
        and a.starts_at <= v_local_start::time
        and a.ends_at >= v_local_end::time
    ) then
      raise exception 'Lesson falls outside the instructor availability.';
    end if;

    if exists (
      select 1
      from public.instructor_unavailability u
      where u.instructor_profile_id = p_instructor_profile_id
        and tstzrange(u.starts_at, u.ends_at, '[)')
          && tstzrange(v_start, v_end, '[)')
    ) then
      raise exception 'The instructor is unavailable during this lesson.';
    end if;

    insert into public.lesson_schedules (
      student_id,
      instructor_profile_id,
      room_id,
      program,
      starts_at,
      ends_at,
      status,
      created_by,
      notes,
      recurrence_group_id
    )
    values (
      p_student_id,
      p_instructor_profile_id,
      p_room_id,
      trim(p_program),
      v_start,
      v_end,
      'pending_room_approval',
      v_requester,
      nullif(trim(coalesce(p_notes, '')), ''),
      v_recurrence_group_id
    )
    returning id into v_lesson_id;

    insert into public.room_approval_requests (
      lesson_schedule_id,
      requested_by,
      status
    )
    values (
      v_lesson_id,
      v_requester,
      'pending'
    );

    lesson_schedule_id := v_lesson_id;
    lesson_starts_at := v_start;
    lesson_status := 'pending_room_approval';
    return next;
  end loop;
end;
$$;

revoke all on function public.create_lesson_request(
  uuid, uuid, uuid, text, timestamptz, integer, integer, text
) from public, anon;
grant execute on function public.create_lesson_request(
  uuid, uuid, uuid, text, timestamptz, integer, integer, text
) to authenticated;

create or replace function public.decide_room_approval(
  p_request_id uuid,
  p_decision text,
  p_decision_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lesson_id uuid;
begin
  if not public.is_ords_admin() then
    raise exception 'Owner or admin access is required.';
  end if;

  if p_decision not in ('approved', 'denied') then
    raise exception 'Decision must be approved or denied.';
  end if;

  select r.lesson_schedule_id
  into v_lesson_id
  from public.room_approval_requests r
  where r.id = p_request_id
    and r.status = 'pending'
  for update;

  if v_lesson_id is null then
    raise exception 'This request is no longer pending.';
  end if;

  update public.room_approval_requests
  set status = p_decision,
      decision_note = nullif(trim(coalesce(p_decision_note, '')), ''),
      decided_by = auth.uid(),
      decided_at = now()
  where id = p_request_id;

  update public.lesson_schedules
  set status = case when p_decision = 'approved' then 'scheduled' else 'cancelled' end,
      approved_by = case when p_decision = 'approved' then auth.uid() else null end,
      approved_at = case when p_decision = 'approved' then now() else null end
  where id = v_lesson_id
    and status = 'pending_room_approval';

  if not found then
    raise exception 'The lesson is no longer pending approval.';
  end if;

  return v_lesson_id;
end;
$$;

revoke all on function public.decide_room_approval(uuid, text, text)
  from public, anon;
grant execute on function public.decide_room_approval(uuid, text, text)
  to authenticated;
