create extension if not exists btree_gist with schema extensions;

create table if not exists public.booking_calendars (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.app_profiles(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  description text not null default '' check (char_length(description) <= 500),
  booking_type text not null default 'general' check (booking_type in ('consultation', 'interview', 'general')),
  duration_minutes integer not null default 30 check (duration_minutes between 15 and 240),
  timezone text not null default 'America/New_York',
  bookings_enabled boolean not null default true,
  minimum_notice_hours integer not null default 24 check (minimum_notice_hours between 0 and 720),
  maximum_advance_days integer not null default 30 check (maximum_advance_days between 1 and 365),
  location_or_meeting_details text not null default 'ORDS Music School will confirm the meeting details by email.' check (char_length(location_or_meeting_details) <= 500),
  accent_color text not null default '#b58a45' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_calendar_availability (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.booking_calendars(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (calendar_id, day_of_week, start_time, end_time)
);

create table if not exists public.booking_calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.booking_calendars(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null check (char_length(reason) between 2 and 160),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.calendar_bookings (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.booking_calendars(id) on delete restrict,
  host_profile_id uuid not null references public.app_profiles(id) on delete restrict,
  booking_reference text not null unique,
  booker_name text not null check (char_length(booker_name) between 2 and 120),
  booker_email text not null check (char_length(booker_email) <= 254),
  booker_phone text not null check (char_length(booker_phone) <= 40),
  attendee_name text not null default '' check (char_length(attendee_name) <= 120),
  responses jsonb not null default '{}'::jsonb,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null default 'America/New_York',
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  idempotency_key text unique,
  source text not null default 'Public Calendar',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table public.calendar_bookings
  add constraint calendar_bookings_host_no_overlap
  exclude using gist (
    host_profile_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status = 'confirmed');

create table if not exists public.calendar_booking_email_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.calendar_bookings(id) on delete cascade,
  email_type text not null check (email_type in ('customer_confirmation', 'admin_notification', 'cancellation', 'reminder')),
  recipient text not null,
  provider text not null default 'brevo',
  provider_message_id text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists booking_calendars_owner_idx on public.booking_calendars(owner_profile_id);
create index if not exists booking_calendar_availability_lookup_idx on public.booking_calendar_availability(calendar_id, day_of_week, is_enabled);
create index if not exists booking_calendar_blocks_lookup_idx on public.booking_calendar_blocks(calendar_id, start_date, end_date);
create index if not exists calendar_bookings_calendar_start_idx on public.calendar_bookings(calendar_id, start_time);
create index if not exists calendar_bookings_host_start_idx on public.calendar_bookings(host_profile_id, start_time);
create index if not exists calendar_bookings_status_idx on public.calendar_bookings(status);
create index if not exists calendar_booking_email_logs_booking_idx on public.calendar_booking_email_logs(booking_id);

alter table public.booking_calendars enable row level security;
alter table public.booking_calendar_availability enable row level security;
alter table public.booking_calendar_blocks enable row level security;
alter table public.calendar_bookings enable row level security;
alter table public.calendar_booking_email_logs enable row level security;

drop policy if exists "Calendar owners manage calendars" on public.booking_calendars;
create policy "Calendar owners manage calendars"
on public.booking_calendars
for all
to authenticated
using ((select public.is_ords_admin()) or owner_profile_id = (select auth.uid()))
with check ((select public.is_ords_admin()) or owner_profile_id = (select auth.uid()));

drop policy if exists "Calendar owners manage availability" on public.booking_calendar_availability;
create policy "Calendar owners manage availability"
on public.booking_calendar_availability
for all
to authenticated
using (exists (
  select 1 from public.booking_calendars c
  where c.id = booking_calendar_availability.calendar_id
    and ((select public.is_ords_admin()) or c.owner_profile_id = (select auth.uid()))
))
with check (exists (
  select 1 from public.booking_calendars c
  where c.id = booking_calendar_availability.calendar_id
    and ((select public.is_ords_admin()) or c.owner_profile_id = (select auth.uid()))
));

drop policy if exists "Calendar owners manage blocks" on public.booking_calendar_blocks;
create policy "Calendar owners manage blocks"
on public.booking_calendar_blocks
for all
to authenticated
using (exists (
  select 1 from public.booking_calendars c
  where c.id = booking_calendar_blocks.calendar_id
    and ((select public.is_ords_admin()) or c.owner_profile_id = (select auth.uid()))
))
with check (exists (
  select 1 from public.booking_calendars c
  where c.id = booking_calendar_blocks.calendar_id
    and ((select public.is_ords_admin()) or c.owner_profile_id = (select auth.uid()))
));

drop policy if exists "Calendar owners manage bookings" on public.calendar_bookings;
create policy "Calendar owners manage bookings"
on public.calendar_bookings
for all
to authenticated
using ((select public.is_ords_admin()) or host_profile_id = (select auth.uid()))
with check ((select public.is_ords_admin()) or host_profile_id = (select auth.uid()));

drop policy if exists "Calendar owners view email logs" on public.calendar_booking_email_logs;
create policy "Calendar owners view email logs"
on public.calendar_booking_email_logs
for select
to authenticated
using (exists (
  select 1
  from public.calendar_bookings b
  where b.id = calendar_booking_email_logs.booking_id
    and ((select public.is_ords_admin()) or b.host_profile_id = (select auth.uid()))
));

drop trigger if exists booking_calendars_touch on public.booking_calendars;
create trigger booking_calendars_touch before update on public.booking_calendars
for each row execute function public.touch_updated_at();

drop trigger if exists booking_calendar_availability_touch on public.booking_calendar_availability;
create trigger booking_calendar_availability_touch before update on public.booking_calendar_availability
for each row execute function public.touch_updated_at();

drop trigger if exists booking_calendar_blocks_touch on public.booking_calendar_blocks;
create trigger booking_calendar_blocks_touch before update on public.booking_calendar_blocks
for each row execute function public.touch_updated_at();

drop trigger if exists calendar_bookings_touch on public.calendar_bookings;
create trigger calendar_bookings_touch before update on public.calendar_bookings
for each row execute function public.touch_updated_at();

create or replace function public.make_calendar_booking_reference()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select 'ORDS-' || upper(encode(gen_random_bytes(4), 'hex'));
$$;

create or replace function public.get_public_booking_calendar(p_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  booking_type text,
  duration_minutes integer,
  timezone text,
  bookings_enabled boolean,
  minimum_notice_hours integer,
  maximum_advance_days integer,
  location_or_meeting_details text,
  accent_color text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.slug,
    c.description,
    c.booking_type,
    c.duration_minutes,
    c.timezone,
    c.bookings_enabled,
    c.minimum_notice_hours,
    c.maximum_advance_days,
    c.location_or_meeting_details,
    c.accent_color
  from public.booking_calendars c
  where c.slug = lower(trim(p_slug))
  limit 1;
$$;

create or replace function public.get_booking_calendar_available_slots(p_slug text, p_date date)
returns table (
  start_time timestamptz,
  end_time timestamptz,
  timezone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calendar public.booking_calendars%rowtype;
  v_day integer;
begin
  select * into v_calendar
  from public.booking_calendars c
  where c.slug = lower(trim(p_slug))
  limit 1;

  if not found or not v_calendar.bookings_enabled then
    return;
  end if;

  if p_date < ((now() at time zone v_calendar.timezone)::date)
    or p_date > (((now() at time zone v_calendar.timezone)::date) + v_calendar.maximum_advance_days) then
    return;
  end if;

  if exists (
    select 1 from public.booking_calendar_blocks b
    where b.calendar_id = v_calendar.id
      and p_date between b.start_date and b.end_date
  ) then
    return;
  end if;

  v_day := extract(dow from p_date)::integer;

  return query
  with windows as (
    select
      ((p_date + a.start_time) at time zone v_calendar.timezone) as window_start,
      ((p_date + a.end_time) at time zone v_calendar.timezone) as window_end
    from public.booking_calendar_availability a
    where a.calendar_id = v_calendar.id
      and a.day_of_week = v_day
      and a.is_enabled = true
  ),
  generated as (
    select
      gs as slot_start,
      gs + make_interval(mins => v_calendar.duration_minutes) as slot_end
    from windows w
    cross join lateral generate_series(
      w.window_start,
      w.window_end - make_interval(mins => v_calendar.duration_minutes),
      make_interval(mins => v_calendar.duration_minutes)
    ) gs
  )
  select g.slot_start, g.slot_end, v_calendar.timezone
  from generated g
  where g.slot_start >= now() + make_interval(hours => v_calendar.minimum_notice_hours)
    and not exists (
      select 1 from public.calendar_bookings b
      where b.host_profile_id = v_calendar.owner_profile_id
        and b.status = 'confirmed'
        and tstzrange(b.start_time, b.end_time, '[)') && tstzrange(g.slot_start, g.slot_end, '[)')
    )
    and not exists (
      select 1 from public.lesson_schedules l
      where l.instructor_profile_id = v_calendar.owner_profile_id
        and l.status in ('pending_room_approval', 'scheduled')
        and tstzrange(l.starts_at, l.ends_at, '[)') && tstzrange(g.slot_start, g.slot_end, '[)')
    )
    and not exists (
      select 1 from public.consultation_bookings cb
      where cb.status = 'confirmed'
        and tstzrange(cb.start_time, cb.end_time, '[)') && tstzrange(g.slot_start, g.slot_end, '[)')
    )
  order by g.slot_start;
end;
$$;

create or replace function public.get_booking_calendar_available_dates(
  p_slug text,
  p_start_date date,
  p_end_date date
)
returns table (available_date date, available_slots bigint)
language sql
security invoker
set search_path = public
as $$
  select candidate.day::date, count(slot.start_time)
  from generate_series(p_start_date, p_end_date, interval '1 day') candidate(day)
  cross join lateral public.get_booking_calendar_available_slots(p_slug, candidate.day::date) slot
  where p_end_date >= p_start_date
    and p_end_date <= p_start_date + 45
  group by candidate.day
  order by candidate.day;
$$;

create or replace function public.create_calendar_booking(
  p_slug text,
  p_booker_name text,
  p_booker_email text,
  p_booker_phone text,
  p_attendee_name text,
  p_responses jsonb,
  p_start_time timestamptz,
  p_idempotency_key text default null
)
returns table (
  success boolean,
  booking_id uuid,
  booking_reference text,
  calendar_name text,
  booking_type text,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  location_or_meeting_details text,
  error_code text,
  message text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_calendar public.booking_calendars%rowtype;
  v_existing public.calendar_bookings%rowtype;
  v_reference text;
  v_end_time timestamptz;
begin
  select * into v_calendar
  from public.booking_calendars c
  where c.slug = lower(trim(p_slug))
  limit 1;

  if not found or not v_calendar.bookings_enabled then
    return query select false, null::uuid, null::text, null::text, null::text, null::timestamptz, null::timestamptz, null::text, null::text, 'bookings_disabled', 'This calendar is not accepting bookings right now.';
    return;
  end if;

  if p_idempotency_key is not null then
    select * into v_existing
    from public.calendar_bookings b
    where b.idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return query select true, v_existing.id, v_existing.booking_reference, v_calendar.name, v_calendar.booking_type, v_existing.start_time, v_existing.end_time, v_existing.timezone, v_calendar.location_or_meeting_details, null::text, 'Booking already confirmed.';
      return;
    end if;
  end if;

  if length(trim(coalesce(p_booker_name, ''))) < 2
    or coalesce(p_booker_email, '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or length(regexp_replace(coalesce(p_booker_phone, ''), '\D', '', 'g')) < 7
    or p_start_time is null
    or p_responses is null
    or jsonb_typeof(p_responses) <> 'object' then
    return query select false, null::uuid, null::text, null::text, null::text, null::timestamptz, null::timestamptz, null::text, null::text, 'invalid_fields', 'Please check the required booking details and try again.';
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_calendar.owner_profile_id::text || p_start_time::text, 0));

  if not exists (
    select 1
    from public.get_booking_calendar_available_slots(v_calendar.slug, (p_start_time at time zone v_calendar.timezone)::date) s
    where s.start_time = p_start_time
  ) then
    return query select false, null::uuid, null::text, null::text, null::text, null::timestamptz, null::timestamptz, null::text, null::text, 'slot_unavailable', 'That time was just booked. Please choose another available time.';
    return;
  end if;

  v_end_time := p_start_time + make_interval(mins => v_calendar.duration_minutes);
  v_reference := public.make_calendar_booking_reference();

  begin
    insert into public.calendar_bookings (
      calendar_id,
      host_profile_id,
      booking_reference,
      booker_name,
      booker_email,
      booker_phone,
      attendee_name,
      responses,
      start_time,
      end_time,
      timezone,
      idempotency_key,
      source
    ) values (
      v_calendar.id,
      v_calendar.owner_profile_id,
      v_reference,
      trim(p_booker_name),
      lower(trim(p_booker_email)),
      trim(p_booker_phone),
      trim(coalesce(p_attendee_name, '')),
      p_responses,
      p_start_time,
      v_end_time,
      v_calendar.timezone,
      p_idempotency_key,
      'Public Calendar: ' || v_calendar.name
    ) returning * into v_existing;
  exception
    when unique_violation or exclusion_violation then
      return query select false, null::uuid, null::text, null::text, null::text, null::timestamptz, null::timestamptz, null::text, null::text, 'slot_taken', 'That time was just booked. Please choose another available time.';
      return;
  end;

  return query select true, v_existing.id, v_existing.booking_reference, v_calendar.name, v_calendar.booking_type, v_existing.start_time, v_existing.end_time, v_existing.timezone, v_calendar.location_or_meeting_details, null::text, 'Booking confirmed.';
end;
$$;

create or replace function public.log_calendar_booking_email_attempt(
  p_booking_id uuid,
  p_email_type text,
  p_recipient text,
  p_provider text,
  p_provider_message_id text,
  p_status text,
  p_error_message text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.calendar_booking_email_logs (
    booking_id,
    email_type,
    recipient,
    provider,
    provider_message_id,
    status,
    error_message,
    sent_at
  ) values (
    p_booking_id,
    p_email_type,
    p_recipient,
    coalesce(nullif(trim(p_provider), ''), 'brevo'),
    p_provider_message_id,
    p_status,
    p_error_message,
    case when p_status = 'sent' then now() else null end
  );
end;
$$;

revoke all on table public.booking_calendars from public, anon;
revoke all on table public.booking_calendar_availability from public, anon;
revoke all on table public.booking_calendar_blocks from public, anon;
revoke all on table public.calendar_bookings from public, anon;
revoke all on table public.calendar_booking_email_logs from public, anon;

grant select, insert, update, delete on public.booking_calendars to authenticated;
grant select, insert, update, delete on public.booking_calendar_availability to authenticated;
grant select, insert, update, delete on public.booking_calendar_blocks to authenticated;
grant select, insert, update, delete on public.calendar_bookings to authenticated;
grant select on public.calendar_booking_email_logs to authenticated;
grant select, insert, update, delete on public.booking_calendars to service_role;
grant select, insert, update, delete on public.booking_calendar_availability to service_role;
grant select, insert, update, delete on public.booking_calendar_blocks to service_role;
grant select, insert, update, delete on public.calendar_bookings to service_role;
grant select, insert, update, delete on public.calendar_booking_email_logs to service_role;

revoke all on function public.get_public_booking_calendar(text) from public, anon, authenticated;
revoke all on function public.get_booking_calendar_available_slots(text, date) from public, anon, authenticated;
revoke all on function public.get_booking_calendar_available_dates(text, date, date) from public, anon, authenticated;
revoke all on function public.create_calendar_booking(text, text, text, text, text, jsonb, timestamptz, text) from public, anon, authenticated;
revoke all on function public.log_calendar_booking_email_attempt(uuid, text, text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_public_booking_calendar(text) to service_role;
grant execute on function public.get_booking_calendar_available_slots(text, date) to service_role;
grant execute on function public.get_booking_calendar_available_dates(text, date, date) to service_role;
grant execute on function public.create_calendar_booking(text, text, text, text, text, jsonb, timestamptz, text) to service_role;
grant execute on function public.log_calendar_booking_email_attempt(uuid, text, text, text, text, text, text) to service_role;
