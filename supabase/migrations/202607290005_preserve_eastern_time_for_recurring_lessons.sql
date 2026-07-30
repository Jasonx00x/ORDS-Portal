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
  v_base_local timestamp := p_starts_at at time zone 'America/New_York';
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
    v_local_start := v_base_local + make_interval(weeks => v_iteration);
    v_local_end := v_local_start + make_interval(mins => p_duration_minutes);
    v_start := v_local_start at time zone 'America/New_York';
    v_end := v_local_end at time zone 'America/New_York';

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
