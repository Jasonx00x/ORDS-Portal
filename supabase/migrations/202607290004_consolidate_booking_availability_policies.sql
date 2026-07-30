drop policy if exists "ORDS admins manage instructor availability"
  on public.instructor_availability;
drop policy if exists "Instructors manage own availability"
  on public.instructor_availability;

create policy "ORDS staff manage allowed instructor availability"
on public.instructor_availability
for all
to authenticated
using (
  (select public.is_ords_admin())
  or instructor_profile_id = (select auth.uid())
)
with check (
  (select public.is_ords_admin())
  or instructor_profile_id = (select auth.uid())
);

drop policy if exists "ORDS admins manage instructor unavailability"
  on public.instructor_unavailability;
drop policy if exists "Instructors manage own unavailability"
  on public.instructor_unavailability;

create policy "ORDS staff manage allowed instructor unavailability"
on public.instructor_unavailability
for all
to authenticated
using (
  (select public.is_ords_admin())
  or instructor_profile_id = (select auth.uid())
)
with check (
  (select public.is_ords_admin())
  or instructor_profile_id = (select auth.uid())
);
