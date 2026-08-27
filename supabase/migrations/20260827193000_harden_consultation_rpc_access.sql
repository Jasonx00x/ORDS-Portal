revoke execute on function public.get_consultation_available_slots(date)
  from public, anon, authenticated;
grant execute on function public.get_consultation_available_slots(date)
  to service_role;

revoke execute on function public.get_consultation_available_dates(date, date)
  from public, anon, authenticated;
grant execute on function public.get_consultation_available_dates(date, date)
  to service_role;

revoke execute on function public.create_consultation_booking(
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  timestamptz,
  text
) from public, anon, authenticated;
grant execute on function public.create_consultation_booking(
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  timestamptz,
  text
) to service_role;
