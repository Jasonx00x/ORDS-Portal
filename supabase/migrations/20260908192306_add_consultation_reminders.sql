create table if not exists public.consultation_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.consultation_bookings(id) on delete cascade,
  audience text not null check (audience in ('customer', 'admin')),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, audience, recipient)
);

create index if not exists consultation_reminder_deliveries_due_idx
  on public.consultation_reminder_deliveries(status, claimed_at, attempt_count);

alter table public.consultation_reminder_deliveries enable row level security;

drop policy if exists "ORDS admins view consultation reminder deliveries"
  on public.consultation_reminder_deliveries;
create policy "ORDS admins view consultation reminder deliveries"
on public.consultation_reminder_deliveries
for select
to authenticated
using (public.is_ords_admin());

drop trigger if exists consultation_reminder_deliveries_touch
  on public.consultation_reminder_deliveries;
create trigger consultation_reminder_deliveries_touch
before update on public.consultation_reminder_deliveries
for each row execute function public.touch_updated_at();

create or replace function public.claim_due_consultation_reminders(
  p_admin_recipients text[],
  p_limit integer default 25
)
returns table (
  delivery_id uuid,
  claim_token uuid,
  audience text,
  recipient text,
  booking_id uuid,
  booking_reference text,
  customer_name text,
  customer_email text,
  customer_phone text,
  student_name text,
  instrument_or_service text,
  musical_goals text,
  start_time timestamptz,
  timezone text,
  location_or_meeting_details text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.consultation_reminder_deliveries (booking_id, audience, recipient)
  select b.id, 'customer', lower(trim(b.customer_email))
  from public.consultation_bookings b
  where b.status = 'confirmed'
    and b.start_time > now() + interval '30 minutes'
    and b.start_time <= now() + interval '2 hours'
  on conflict (booking_id, audience, recipient) do nothing;

  insert into public.consultation_reminder_deliveries (booking_id, audience, recipient)
  select b.id, 'admin', lower(trim(admin_recipient))
  from public.consultation_bookings b
  cross join lateral unnest(coalesce(p_admin_recipients, array[]::text[])) admin_recipient
  where b.status = 'confirmed'
    and b.start_time > now() + interval '30 minutes'
    and b.start_time <= now() + interval '2 hours'
    and trim(admin_recipient) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  on conflict (booking_id, audience, recipient) do nothing;

  return query
  with candidates as (
    select d.id
    from public.consultation_reminder_deliveries d
    join public.consultation_bookings b on b.id = d.booking_id
    where b.status = 'confirmed'
      and b.start_time > now() + interval '30 minutes'
      and b.start_time <= now() + interval '2 hours'
      and d.attempt_count < 4
      and (
        d.status = 'pending'
        or (d.status in ('processing', 'failed') and d.claimed_at < now() - interval '15 minutes')
      )
    order by b.start_time, d.created_at
    for update of d skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  ),
  claimed as (
    update public.consultation_reminder_deliveries d
    set
      status = 'processing',
      attempt_count = d.attempt_count + 1,
      claimed_at = now(),
      claim_token = gen_random_uuid(),
      error_message = null
    from candidates c
    where d.id = c.id
    returning d.*
  )
  select
    c.id,
    c.claim_token,
    c.audience,
    c.recipient,
    b.id,
    b.booking_reference,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.student_name,
    b.instrument_or_service,
    b.musical_goals,
    b.start_time,
    b.timezone,
    s.location_or_meeting_details
  from claimed c
  join public.consultation_bookings b on b.id = c.booking_id
  cross join lateral (
    select cs.location_or_meeting_details
    from public.consultation_settings cs
    order by cs.created_at
    limit 1
  ) s;
end;
$$;

create or replace function public.complete_consultation_reminder_delivery(
  p_delivery_id uuid,
  p_claim_token uuid,
  p_success boolean,
  p_provider_message_id text default null,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking_id uuid;
  v_recipient text;
begin
  update public.consultation_reminder_deliveries d
  set
    status = case when p_success then 'sent' else 'failed' end,
    provider_message_id = case when p_success then p_provider_message_id else null end,
    error_message = case when p_success then null else left(coalesce(p_error_message, 'Reminder delivery failed.'), 500) end,
    sent_at = case when p_success then now() else null end
  where d.id = p_delivery_id
    and d.claim_token = p_claim_token
    and d.status = 'processing'
  returning d.booking_id, d.recipient into v_booking_id, v_recipient;

  if not found then
    return;
  end if;

  insert into public.consultation_email_logs (
    booking_id,
    email_type,
    recipient,
    provider,
    provider_message_id,
    status,
    error_message,
    sent_at
  ) values (
    v_booking_id,
    'reminder',
    v_recipient,
    'brevo',
    case when p_success then p_provider_message_id else null end,
    case when p_success then 'sent' else 'failed' end,
    case when p_success then null else left(coalesce(p_error_message, 'Reminder delivery failed.'), 500) end,
    case when p_success then now() else null end
  );
end;
$$;

revoke all on table public.consultation_reminder_deliveries from public, anon;
grant select on table public.consultation_reminder_deliveries to authenticated;
grant select, insert, update, delete on table public.consultation_reminder_deliveries to service_role;

revoke all on function public.claim_due_consultation_reminders(text[], integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_consultation_reminders(text[], integer)
  to service_role;

revoke all on function public.complete_consultation_reminder_delivery(uuid, uuid, boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_consultation_reminder_delivery(uuid, uuid, boolean, text, text)
  to service_role;

update public.consultation_settings
set location_or_meeting_details = 'ORDS Music School will confirm the consultation location or call details by email.'
where location_or_meeting_details like 'Temporary starter setup.%';
