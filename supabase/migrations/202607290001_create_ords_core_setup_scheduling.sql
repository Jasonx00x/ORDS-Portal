create table if not exists public.app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner', 'admin', 'instructor', 'parent', 'student', 'client')),
  phone text,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  best_for text not null,
  is_active boolean not null default true,
  requires_owner_approval boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opens_at < closes_at),
  unique (day_of_week)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.app_profiles(id) on delete set null,
  display_name text not null,
  primary_program text not null,
  status text not null default 'setup' check (status in ('setup', 'active', 'paused', 'archived')),
  contract_status text not null default 'approved' check (contract_status in ('pending', 'approved', 'inactive')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_students (
  parent_profile_id uuid not null references public.app_profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relationship_label text not null default 'guardian',
  created_at timestamptz not null default now(),
  primary key (parent_profile_id, student_id)
);

create table if not exists public.instructor_student_assignments (
  instructor_profile_id uuid not null references public.app_profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  program text not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (instructor_profile_id, student_id, program)
);

create table if not exists public.instructor_availability (
  id uuid primary key default gen_random_uuid(),
  instructor_profile_id uuid not null references public.app_profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table if not exists public.lesson_schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  instructor_profile_id uuid not null references public.app_profiles(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  program text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending_room_approval' check (status in ('pending_room_approval', 'scheduled', 'completed', 'cancelled', 'no_show')),
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table if not exists public.room_approval_requests (
  id uuid primary key default gen_random_uuid(),
  lesson_schedule_id uuid not null references public.lesson_schedules(id) on delete cascade,
  requested_by uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  decision_note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create extension if not exists btree_gist with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_schedules_room_no_overlap'
      and conrelid = 'public.lesson_schedules'::regclass
  ) then
    alter table public.lesson_schedules
      add constraint lesson_schedules_room_no_overlap
      exclude using gist (
        room_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in ('pending_room_approval', 'scheduled'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_schedules_instructor_no_overlap'
      and conrelid = 'public.lesson_schedules'::regclass
  ) then
    alter table public.lesson_schedules
      add constraint lesson_schedules_instructor_no_overlap
      exclude using gist (
        instructor_profile_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in ('pending_room_approval', 'scheduled'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_schedules_student_no_overlap'
      and conrelid = 'public.lesson_schedules'::regclass
  ) then
    alter table public.lesson_schedules
      add constraint lesson_schedules_student_no_overlap
      exclude using gist (
        student_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in ('pending_room_approval', 'scheduled'));
  end if;
end
$$;

create index if not exists app_profiles_role_idx on public.app_profiles(role);
create index if not exists students_created_by_idx on public.students(created_by);
create index if not exists parent_students_student_idx on public.parent_students(student_id);
create index if not exists instructor_student_assignments_student_idx on public.instructor_student_assignments(student_id);
create index if not exists instructor_availability_lookup_idx on public.instructor_availability(instructor_profile_id, day_of_week, is_enabled);
create index if not exists lesson_schedules_student_idx on public.lesson_schedules(student_id);
create index if not exists lesson_schedules_instructor_idx on public.lesson_schedules(instructor_profile_id);
create index if not exists lesson_schedules_room_idx on public.lesson_schedules(room_id);
create index if not exists lesson_schedules_created_by_idx on public.lesson_schedules(created_by);
create index if not exists lesson_schedules_approved_by_idx on public.lesson_schedules(approved_by);
create index if not exists room_approval_requests_lesson_idx on public.room_approval_requests(lesson_schedule_id);
create index if not exists room_approval_requests_requested_by_idx on public.room_approval_requests(requested_by);
create index if not exists room_approval_requests_decided_by_idx on public.room_approval_requests(decided_by);
create index if not exists room_approval_requests_status_idx on public.room_approval_requests(status);

alter table public.app_profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.school_hours enable row level security;
alter table public.students enable row level security;
alter table public.parent_students enable row level security;
alter table public.instructor_student_assignments enable row level security;
alter table public.instructor_availability enable row level security;
alter table public.lesson_schedules enable row level security;
alter table public.room_approval_requests enable row level security;

drop policy if exists "ORDS admins manage profiles" on public.app_profiles;
create policy "ORDS admins manage profiles"
on public.app_profiles
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "Users view own profile" on public.app_profiles;
create policy "Users view own profile"
on public.app_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "ORDS admins manage rooms" on public.rooms;
create policy "ORDS admins manage rooms"
on public.rooms
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "ORDS staff view rooms" on public.rooms;
create policy "ORDS staff view rooms"
on public.rooms
for select
to authenticated
using (true);

drop policy if exists "ORDS admins manage school hours" on public.school_hours;
create policy "ORDS admins manage school hours"
on public.school_hours
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "Authenticated users view school hours" on public.school_hours;
create policy "Authenticated users view school hours"
on public.school_hours
for select
to authenticated
using (true);

drop policy if exists "ORDS admins manage students" on public.students;
create policy "ORDS admins manage students"
on public.students
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "Instructors view assigned students" on public.students;
create policy "Instructors view assigned students"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.instructor_student_assignments a
    where a.student_id = students.id
      and a.instructor_profile_id = (select auth.uid())
  )
);

drop policy if exists "Parents view linked students" on public.students;
create policy "Parents view linked students"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_students ps
    where ps.student_id = students.id
      and ps.parent_profile_id = (select auth.uid())
  )
);

drop policy if exists "Students view own student record" on public.students;
create policy "Students view own student record"
on public.students
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "ORDS admins manage parent links" on public.parent_students;
create policy "ORDS admins manage parent links"
on public.parent_students
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "Parents view own student links" on public.parent_students;
create policy "Parents view own student links"
on public.parent_students
for select
to authenticated
using (parent_profile_id = (select auth.uid()));

drop policy if exists "ORDS admins manage instructor assignments" on public.instructor_student_assignments;
create policy "ORDS admins manage instructor assignments"
on public.instructor_student_assignments
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "Instructors view own assignments" on public.instructor_student_assignments;
create policy "Instructors view own assignments"
on public.instructor_student_assignments
for select
to authenticated
using (instructor_profile_id = (select auth.uid()));

drop policy if exists "ORDS admins manage instructor availability" on public.instructor_availability;
create policy "ORDS admins manage instructor availability"
on public.instructor_availability
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "Instructors manage own availability" on public.instructor_availability;
create policy "Instructors manage own availability"
on public.instructor_availability
for all
to authenticated
using (instructor_profile_id = (select auth.uid()))
with check (instructor_profile_id = (select auth.uid()));

drop policy if exists "ORDS admins manage lesson schedules" on public.lesson_schedules;
create policy "ORDS admins manage lesson schedules"
on public.lesson_schedules
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "Instructors view own lesson schedules" on public.lesson_schedules;
create policy "Instructors view own lesson schedules"
on public.lesson_schedules
for select
to authenticated
using (instructor_profile_id = (select auth.uid()));

drop policy if exists "Instructors create assigned lesson requests" on public.lesson_schedules;
create policy "Instructors create assigned lesson requests"
on public.lesson_schedules
for insert
to authenticated
with check (
  instructor_profile_id = (select auth.uid())
  and status = 'pending_room_approval'
  and approved_by is null
  and approved_at is null
  and exists (
    select 1
    from public.instructor_student_assignments a
    where a.student_id = lesson_schedules.student_id
      and a.instructor_profile_id = (select auth.uid())
  )
);

drop policy if exists "Instructors update own pending lesson requests" on public.lesson_schedules;
create policy "Instructors update own pending lesson requests"
on public.lesson_schedules
for update
to authenticated
using (
  instructor_profile_id = (select auth.uid())
  and status = 'pending_room_approval'
)
with check (
  instructor_profile_id = (select auth.uid())
  and status = 'pending_room_approval'
  and approved_by is null
  and approved_at is null
  and exists (
    select 1
    from public.instructor_student_assignments a
    where a.student_id = lesson_schedules.student_id
      and a.instructor_profile_id = (select auth.uid())
  )
);

drop policy if exists "Parents view linked lesson schedules" on public.lesson_schedules;
create policy "Parents view linked lesson schedules"
on public.lesson_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_students ps
    where ps.student_id = lesson_schedules.student_id
      and ps.parent_profile_id = (select auth.uid())
  )
);

drop policy if exists "Students view own lesson schedules" on public.lesson_schedules;
create policy "Students view own lesson schedules"
on public.lesson_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = lesson_schedules.student_id
      and s.profile_id = (select auth.uid())
  )
);

drop policy if exists "ORDS admins manage room approvals" on public.room_approval_requests;
create policy "ORDS admins manage room approvals"
on public.room_approval_requests
for all
to authenticated
using ((select public.is_ords_admin()))
with check ((select public.is_ords_admin()));

drop policy if exists "Instructors view own room approvals" on public.room_approval_requests;
create policy "Instructors view own room approvals"
on public.room_approval_requests
for select
to authenticated
using (requested_by = (select auth.uid()));

drop policy if exists "Instructors create own room approvals" on public.room_approval_requests;
create policy "Instructors create own room approvals"
on public.room_approval_requests
for insert
to authenticated
with check (
  requested_by = (select auth.uid())
  and status = 'pending'
  and decided_by is null
  and decided_at is null
  and exists (
    select 1
    from public.lesson_schedules ls
    where ls.id = room_approval_requests.lesson_schedule_id
      and ls.instructor_profile_id = (select auth.uid())
      and ls.status = 'pending_room_approval'
  )
);

grant select, insert, update, delete on public.app_profiles to authenticated;
grant select, insert, update, delete on public.rooms to authenticated;
grant select, insert, update, delete on public.school_hours to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.parent_students to authenticated;
grant select, insert, update, delete on public.instructor_student_assignments to authenticated;
grant select, insert, update, delete on public.instructor_availability to authenticated;
grant select, insert, update, delete on public.lesson_schedules to authenticated;
grant select, insert, update, delete on public.room_approval_requests to authenticated;

insert into public.rooms (name, best_for, is_active, requires_owner_approval)
values
  ('Studio', 'Audio production, recording, mixing, coaching', true, true),
  ('Drum Room', 'Drums, rhythm coaching, louder lesson blocks', true, true),
  ('Auditorium', 'Vocals, piano, ensemble coaching, recitals', true, true),
  ('Youth Room', 'Youth lessons, small groups, overflow instruction', true, true),
  ('Extra Room', 'Overflow lessons, makeups, temporary scheduling needs', true, true)
on conflict (name) do update
set best_for = excluded.best_for,
    is_active = excluded.is_active,
    requires_owner_approval = excluded.requires_owner_approval;
