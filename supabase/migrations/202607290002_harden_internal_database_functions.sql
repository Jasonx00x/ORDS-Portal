alter function public.is_ords_admin() set search_path = '';
alter function public.touch_updated_at() set search_path = '';
alter function public.make_consultation_reference() set search_path = public, extensions;

revoke all on function public.log_consultation_email_attempt(uuid, text, text, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.log_consultation_email_attempt(uuid, text, text, text, text, text, text)
to service_role;

revoke all on function public.sync_ords_auth_profile()
from public, anon, authenticated;

revoke all on function public.rls_auto_enable()
from public, anon, authenticated;
