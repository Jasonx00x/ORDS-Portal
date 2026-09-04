alter table public.consultation_bookings
  add column if not exists source text;

update public.consultation_bookings
set source = 'Website Booking'
where source is null or length(trim(source)) = 0;

alter table public.consultation_bookings
  alter column source set default 'Website Booking',
  alter column source set not null;

alter table public.consultation_email_logs
  alter column provider set default 'brevo';

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
    coalesce(p_provider, 'brevo'),
    p_provider_message_id,
    p_status,
    p_error_message,
    case when p_status = 'sent' then now() else null end
  );
end;
$$;

revoke all on function public.log_consultation_email_attempt(uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.log_consultation_email_attempt(uuid, text, text, text, text, text, text)
  to service_role;
