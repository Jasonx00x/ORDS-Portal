create extension if not exists pgcrypto;

create table if not exists public.consultation_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true unique,
  duration_minutes integer not null default 30 check (duration_minutes > 0 and duration_minutes <= 240),
  timezone text not null default 'America/New_York',
  bookings_enabled boolean not null default true,
  minimum_notice_hours integer not null default 24 check (minimum_notice_hours >= 0),
  maximum_advance_days integer not null default 30 check (maximum_advance_days between 1 and 365),
  notification_email text,
  reply_to_email text,
  location_or_meeting_details text not null default 'ORDS Music School will confirm whether the consultation is in person or by phone.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultation_availability (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create table if not exists public.consultation_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= end_date)
);

create table if not exists public.consultation_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  customer_name text not null,
  student_name text not null,
  customer_email text not null,
  customer_phone text not null,
  student_age integer check (student_age is null or student_age between 0 and 120),
  instrument_or_service text not null,
  musical_goals text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null default 'America/New_York',
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  cancellation_token_hash text,
  internal_notes text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create table if not exists public.consultation_email_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.consultation_bookings(id) on delete cascade,
  email_type text not null check (email_type in ('customer_confirmation', 'admin_notification', 'cancellation', 'reminder')),
  recipient text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists consultation_availability_weekday_idx on public.consultation_availability(day_of_week, is_enabled);
create index if not exists consultation_blocked_dates_range_idx on public.consultation_blocked_dates(start_date, end_date);
create index if not exists consultation_bookings_start_time_idx on public.consultation_bookings(start_time);
create index if not exists consultation_bookings_status_idx on public.consultation_bookings(status);
create index if not exists consultation_bookings_customer_email_idx on public.consultation_bookings(customer_email);
create index if not exists consultation_bookings_reference_idx on public.consultation_bookings(booking_reference);
create index if not exists consultation_email_logs_booking_idx on public.consultation_email_logs(booking_id);

create unique index if not exists consultation_bookings_active_start_unique
  on public.consultation_bookings(start_time)
  where status = 'confirmed';

create unique index if not exists consultation_bookings_idempotency_unique
  on public.consultation_bookings(idempotency_key)
  where idempotency_key is not null;

alter table public.consultation_settings enable row level security;
alter table public.consultation_availability enable row level security;
alter table public.consultation_blocked_dates enable row level security;
alter table public.consultation_bookings enable row level security;
alter table public.consultation_email_logs enable row level security;

create or replace function public.is_ords_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'staff', 'owner');
$$;

drop policy if exists "ORDS admins manage consultation settings" on public.consultation_settings;
create policy "ORDS admins manage consultation settings"
on public.consultation_settings
for all
to authenticated
using (public.is_ords_admin())
with check (public.is_ords_admin());

drop policy if exists "ORDS admins manage consultation availability" on public.consultation_availability;
create policy "ORDS admins manage consultation availability"
on public.consultation_availability
for all
to authenticated
using (public.is_ords_admin())
with check (public.is_ords_admin());

drop policy if exists "ORDS admins manage consultation blocks" on public.consultation_blocked_dates;
create policy "ORDS admins manage consultation blocks"
on public.consultation_blocked_dates
for all
to authenticated
using (public.is_ords_admin())
with check (public.is_ords_admin());

drop policy if exists "ORDS admins manage consultation bookings" on public.consultation_bookings;
create policy "ORDS admins manage consultation bookings"
on public.consultation_bookings
for all
to authenticated
using (public.is_ords_admin())
with check (public.is_ords_admin());

drop policy if exists "ORDS admins view consultation email logs" on public.consultation_email_logs;
create policy "ORDS admins view consultation email logs"
on public.consultation_email_logs
for select
to authenticated
using (public.is_ords_admin());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists consultation_settings_touch on public.consultation_settings;
create trigger consultation_settings_touch before update on public.consultation_settings
for each row execute function public.touch_updated_at();

drop trigger if exists consultation_availability_touch on public.consultation_availability;
create trigger consultation_availability_touch before update on public.consultation_availability
for each row execute function public.touch_updated_at();

drop trigger if exists consultation_blocked_dates_touch on public.consultation_blocked_dates;
create trigger consultation_blocked_dates_touch before update on public.consultation_blocked_dates
for each row execute function public.touch_updated_at();

drop trigger if exists consultation_bookings_touch on public.consultation_bookings;
create trigger consultation_bookings_touch before update on public.consultation_bookings
for each row execute function public.touch_updated_at();

create or replace function public.make_consultation_reference()
returns text
language sql
volatile
as $$
  select 'ORDS-' || upper(encode(gen_random_bytes(4), 'hex'));
$$;

create or replace function public.get_consultation_available_slots(p_date date)
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
  v_settings public.consultation_settings%rowtype;
  v_day integer;
begin
  select * into v_settings
  from public.consultation_settings
  order by created_at
  limit 1;

  if not found or not v_settings.bookings_enabled then
    return;
  end if;

  if p_date < ((now() at time zone v_settings.timezone)::date) then
    return;
  end if;

  if p_date > (((now() at time zone v_settings.timezone)::date) + v_settings.maximum_advance_days) then
    return;
  end if;

  if exists (
    select 1
    from public.consultation_blocked_dates b
    where p_date between b.start_date and b.end_date
  ) then
    return;
  end if;

  v_day := extract(dow from p_date)::integer;

  return query
  with windows as (
    select
      ((p_date + a.start_time) at time zone v_settings.timezone) as window_start,
      ((p_date + a.end_time) at time zone v_settings.timezone) as window_end
    from public.consultation_availability a
    where a.day_of_week = v_day
      and a.is_enabled = true
  ),
  generated as (
    select
      gs as slot_start,
      gs + make_interval(mins => v_settings.duration_minutes) as slot_end
    from windows w
    cross join lateral generate_series(
      w.window_start,
      w.window_end - make_interval(mins => v_settings.duration_minutes),
      make_interval(mins => v_settings.duration_minutes)
    ) gs
  )
  select g.slot_start, g.slot_end, v_settings.timezone
  from generated g
  where g.slot_start >= now() + make_interval(hours => v_settings.minimum_notice_hours)
    and not exists (
      select 1
      from public.consultation_bookings b
      where b.status = 'confirmed'
        and b.start_time = g.slot_start
    )
  order by g.slot_start;
end;
$$;

create or replace function public.create_consultation_booking(
  p_customer_name text,
  p_student_name text,
  p_customer_email text,
  p_customer_phone text,
  p_student_age integer,
  p_instrument_or_service text,
  p_musical_goals text,
  p_start_time timestamptz,
  p_idempotency_key text default null
)
returns table (
  success boolean,
  booking_id uuid,
  booking_reference text,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  location_or_meeting_details text,
  error_code text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.consultation_settings%rowtype;
  v_existing public.consultation_bookings%rowtype;
  v_reference text;
  v_end_time timestamptz;
begin
  select * into v_settings
  from public.consultation_settings
  order by created_at
  limit 1;

  if not found or not v_settings.bookings_enabled then
    return query select false, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text, null::text, 'bookings_disabled', 'Consultations are temporarily unavailable. Please contact ORDS Music School for assistance.';
    return;
  end if;

  if p_idempotency_key is not null then
    select * into v_existing
    from public.consultation_bookings b
    where b.idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return query select true, v_existing.id, v_existing.booking_reference, v_existing.start_time, v_existing.end_time, v_existing.timezone, v_settings.location_or_meeting_details, null::text, 'Booking already confirmed.';
      return;
    end if;
  end if;

  if length(trim(coalesce(p_customer_name, ''))) < 2
    or length(trim(coalesce(p_student_name, ''))) < 2
    or coalesce(p_customer_email, '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or length(regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g')) < 7
    or length(trim(coalesce(p_musical_goals, ''))) < 5 then
    return query select false, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text, null::text, 'invalid_fields', 'Please check the required booking details and try again.';
    return;
  end if;

  if not exists (
    select 1
    from public.get_consultation_available_slots((p_start_time at time zone v_settings.timezone)::date) s
    where s.start_time = p_start_time
  ) then
    return query select false, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text, null::text, 'slot_unavailable', 'That time was just booked by someone else. Please choose another available time.';
    return;
  end if;

  v_end_time := p_start_time + make_interval(mins => v_settings.duration_minutes);
  v_reference := public.make_consultation_reference();

  begin
    insert into public.consultation_bookings (
      booking_reference,
      customer_name,
      student_name,
      customer_email,
      customer_phone,
      student_age,
      instrument_or_service,
      musical_goals,
      start_time,
      end_time,
      timezone,
      idempotency_key
    )
    values (
      v_reference,
      trim(p_customer_name),
      trim(p_student_name),
      lower(trim(p_customer_email)),
      trim(p_customer_phone),
      p_student_age,
      trim(p_instrument_or_service),
      trim(p_musical_goals),
      p_start_time,
      v_end_time,
      v_settings.timezone,
      p_idempotency_key
    )
    returning * into v_existing;
  exception
    when unique_violation then
      return query select false, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text, null::text, 'slot_taken', 'That time was just booked by someone else. Please choose another available time.';
      return;
  end;

  return query select true, v_existing.id, v_existing.booking_reference, v_existing.start_time, v_existing.end_time, v_existing.timezone, v_settings.location_or_meeting_details, null::text, 'Booking confirmed.';
end;
$$;

create or replace function public.log_consultation_email_attempt(
  p_booking_id uuid,
  p_email_type text,
  p_recipient text,
  p_provider text,
  p_provider_message_id text,
  p_status text,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.consultation_email_logs (
    booking_id,
    email_type,
    recipient,
    provider,
    provider_message_id,
    status,
    error_message,
    sent_at
  )
  values (
    p_booking_id,
    p_email_type,
    p_recipient,
    coalesce(p_provider, 'resend'),
    p_provider_message_id,
    p_status,
    p_error_message,
    case when p_status = 'sent' then now() else null end
  );
end;
$$;

grant execute on function public.get_consultation_available_slots(date) to anon, authenticated;
grant execute on function public.create_consultation_booking(text, text, text, text, integer, text, text, timestamptz, text) to anon, authenticated;
revoke all on function public.log_consultation_email_attempt(uuid, text, text, text, text, text, text) from public;
grant execute on function public.log_consultation_email_attempt(uuid, text, text, text, text, text, text) to service_role;

insert into public.consultation_settings (
  singleton_key,
  duration_minutes,
  timezone,
  bookings_enabled,
  minimum_notice_hours,
  maximum_advance_days,
  notification_email,
  reply_to_email,
  location_or_meeting_details
)
values (
  true,
  30,
  'America/New_York',
  true,
  24,
  30,
  null,
  null,
  'Temporary starter setup. The ORDS owner/admin can edit consultation availability and meeting details before replacing the current scheduler.'
)
on conflict (singleton_key) do nothing;

insert into public.consultation_availability (day_of_week, start_time, end_time, is_enabled)
values
  (1, '10:00', '14:00', true),
  (3, '12:00', '16:00', true),
  (6, '10:00', '13:00', true)
on conflict do nothing;
