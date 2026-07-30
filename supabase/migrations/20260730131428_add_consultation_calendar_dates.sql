create or replace function public.get_consultation_available_dates(
  p_start_date date,
  p_end_date date
)
returns table (
  available_date date,
  available_slots bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    candidate.day::date as available_date,
    count(slot.start_time)::bigint as available_slots
  from generate_series(
    greatest(p_start_date, current_date),
    least(p_end_date, current_date + 180),
    interval '1 day'
  ) as candidate(day)
  cross join lateral public.get_consultation_available_slots(candidate.day::date) as slot
  where p_end_date >= p_start_date
    and p_end_date <= p_start_date + 45
  group by candidate.day
  having count(slot.start_time) > 0
  order by candidate.day;
$$;

revoke all on function public.get_consultation_available_dates(date, date)
  from public;
grant execute on function public.get_consultation_available_dates(date, date)
  to anon, authenticated;
