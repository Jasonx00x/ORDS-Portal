create unique index if not exists instructor_student_assignments_program_ci_unique_idx
  on public.instructor_student_assignments (
    instructor_profile_id,
    student_id,
    lower(program)
  );

create or replace function public.assign_student_to_instructor(
  p_student_id uuid,
  p_instructor_profile_id uuid,
  p_program text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_program text := trim(coalesce(p_program, ''));
begin
  if not public.is_ords_admin() then
    raise exception 'Owner or admin access is required.';
  end if;

  if v_program = '' or length(v_program) > 80 then
    raise exception 'Program is required and must be 80 characters or fewer.';
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
      and s.contract_status = 'approved'
      and s.status in ('setup', 'active')
  ) then
    raise exception 'The selected student is not approved for scheduling.';
  end if;

  update public.instructor_student_assignments
  set is_primary = true,
      program = v_program
  where instructor_profile_id = p_instructor_profile_id
    and student_id = p_student_id
    and lower(program) = lower(v_program);

  if not found then
    insert into public.instructor_student_assignments (
      instructor_profile_id,
      student_id,
      program,
      is_primary
    )
    values (
      p_instructor_profile_id,
      p_student_id,
      v_program,
      true
    );
  end if;

  update public.students
  set status = 'active'
  where id = p_student_id;
end;
$$;

revoke all on function public.assign_student_to_instructor(uuid, uuid, text)
  from public, anon;
grant execute on function public.assign_student_to_instructor(uuid, uuid, text)
  to authenticated;
