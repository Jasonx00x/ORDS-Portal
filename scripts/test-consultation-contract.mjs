import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/202607140001_create_consultation_booking_system.sql", "utf8");
const calendarMigration = readFileSync("supabase/migrations/20260730131428_add_consultation_calendar_dates.sql", "utf8");
const hardenedRpcMigration = readFileSync("supabase/migrations/20260827193000_harden_consultation_rpc_access.sql", "utf8");
const brevoMigration = readFileSync("supabase/migrations/20260903204121_add_brevo_booking_metadata.sql", "utf8");
const reminderMigration = readFileSync("supabase/migrations/20260908192306_add_consultation_reminders.sql", "utf8");
const reminderFunction = readFileSync("netlify/functions/consultation-reminders.ts", "utf8");
const bookingRoute = readFileSync("app/api/consultations/book/route.ts", "utf8");
const datesRoute = readFileSync("app/api/consultations/dates/route.ts", "utf8");
const inviteFunction = readFileSync("supabase/functions/invite-portal-user/index.ts", "utf8");
const statusRoute = readFileSync("app/api/supabase/status/route.ts", "utf8");
const publicPage = readFileSync("components/consultations/ConsultationBookingPage.tsx", "utf8");
const embedBuilder = readFileSync("components/booking/BookingEmbedBuilder.tsx", "utf8");
const embedConfig = readFileSync("lib/consultations/embed.ts", "utf8");
const embedScript = readFileSync("public/booking-embed.js", "utf8");
const supabaseRest = readFileSync("lib/consultations/supabase-rest.ts", "utf8");
const authProxy = readFileSync("lib/supabase/proxy.ts", "utf8");
const peopleWorkspace = readFileSync("components/people/PeopleWorkspace.tsx", "utf8");
const validation = readFileSync("lib/consultations/validation.ts", "utf8");
const brevo = readFileSync("lib/consultations/brevo.ts", "utf8");
const emailService = readFileSync("lib/consultations/email-service.ts", "utf8");
const adminPage = readFileSync("components/consultations/ConsultationAdminPage.tsx", "utf8");
const adminData = readFileSync("lib/consultations/admin-data.ts", "utf8");
const adminActions = readFileSync("app/admin/consultations/actions.ts", "utf8");

const checks = [
  ["RLS enabled for bookings", /alter table public\.consultation_bookings enable row level security/i.test(migration)],
  ["Public availability RPC exists", /get_consultation_available_slots/i.test(migration)],
  ["Atomic booking RPC exists", /create_consultation_booking/i.test(migration)],
  ["Duplicate active booking unique index exists", /consultation_bookings_active_start_unique/i.test(migration)],
  ["Cancelled bookings are not unique-blocking", /where status = 'confirmed'/i.test(migration)],
  ["Blocked dates are checked", /consultation_blocked_dates/i.test(migration) && /between b\.start_date and b\.end_date/i.test(migration)],
  ["Bookings-disabled mode exists", /bookings_enabled/i.test(migration)],
  ["Minimum notice is enforced", /minimum_notice_hours/i.test(migration)],
  ["Maximum advance is enforced", /maximum_advance_days/i.test(migration)],
  ["Email failure is non-fatal", /sendConsultationEmails/i.test(bookingRoute) && /return Response\.json/i.test(bookingRoute)],
  ["Booking email failures are explicitly isolated", /try \{[\s\S]*await sendConsultationEmails[\s\S]*catch/.test(bookingRoute)],
  ["Booking creation and slot conflicts are logged", /\[Booking\] Booking created/.test(bookingRoute) && /\[Booking\] Slot conflict/.test(bookingRoute)],
  ["Brevo template API is server-side", /api\.brevo\.com\/v3\/smtp\/email/.test(brevo) && /process\.env\.BREVO_API_KEY/.test(brevo) && !/NEXT_PUBLIC_BREVO/.test(brevo)],
  ["Brevo helper supports template params and multiple recipients", /templateId/.test(brevo) && /params/.test(brevo) && /recipients/.test(brevo)],
  ["Customer and both admin template settings are used", /BREVO_BOOKING_CONFIRMATION_TEMPLATE_ID/.test(emailService) && /BREVO_ADMIN_BOOKING_TEMPLATE_ID/.test(emailService) && /ORDS_ADMIN_EMAIL/.test(emailService) && /ORDS_SECONDARY_ADMIN_EMAIL/.test(emailService)],
  ["Brevo delivery logs cover customer and admin outcomes", /\[Brevo\] Customer confirmation sent/.test(emailService) && /\[Brevo\] Customer confirmation failed/.test(emailService) && /\[Brevo\] Admin notification sent/.test(emailService) && /\[Brevo\] Admin notification failed/.test(emailService)],
  ["Reminder deliveries are claimed atomically", /for update of d skip locked/i.test(reminderMigration) && /claim_token/i.test(reminderMigration)],
  ["Reminder RPCs are restricted to the service role", /claim_due_consultation_reminders[\s\S]*from public, anon, authenticated/i.test(reminderMigration) && /complete_consultation_reminder_delivery[\s\S]*to service_role/i.test(reminderMigration)],
  ["Two-hour reminder worker runs every five minutes", /schedule: "\*\/5 \* \* \* \*"/.test(reminderFunction) && /interval '2 hours'/i.test(reminderMigration)],
  ["Reminder worker includes customer and both admin recipients", /ORDS_ADMIN_EMAIL/.test(reminderFunction) && /ORDS_SECONDARY_ADMIN_EMAIL/.test(reminderFunction) && /audience === "customer"/.test(reminderFunction)],
  ["Reminder worker uses dedicated Brevo templates", /BREVO_CUSTOMER_REMINDER_TEMPLATE_ID/.test(reminderFunction) && /BREVO_ADMIN_REMINDER_TEMPLATE_ID/.test(reminderFunction)],
  ["Booking source migration is non-destructive", /add column if not exists source/i.test(brevoMigration) && /Website Booking/.test(brevoMigration) && /provider set default 'brevo'/i.test(brevoMigration)],
  ["Admin consultation view loads real booking records", /loadConsultationData/.test(adminPage) && /from\("consultation_bookings"\)/.test(adminData) && /source,created_at/.test(adminData)],
  ["Admin consultation availability is database-backed", /consultation_availability/.test(adminActions) && /consultation_blocked_dates/.test(adminActions) && /loadConsultationAvailabilityData/.test(adminPage)],
  ["Admin consultation settings are database-backed", /consultation_settings/.test(adminActions) && /loadConsultationSettings/.test(adminPage)],
  ["Email log RPC is server-only", /revoke all on function public\.log_consultation_email_attempt[\s\S]*from public/i.test(migration) && /grant execute on function public\.log_consultation_email_attempt[\s\S]*to service_role/i.test(migration)],
  ["Honeypot is present", /companyWebsite/i.test(publicPage) && /honeypot/i.test(validation)],
  ["Embed-ready calendar is present", /FullCalendar/.test(publicPage) && /consultation-embedded/.test(publicPage)],
  ["Embed customization values are allowlisted", /hexColorPattern/.test(embedConfig) && /theme.*=== "dark"/.test(embedConfig) && /layout.*=== "compact"/.test(embedConfig)],
  ["Owner embed builder includes a live calendar", /Consultation calendar embed/.test(embedBuilder) && /Live calendar/.test(embedBuilder) && /Copy Embed Code/.test(embedBuilder)],
  ["Embed script validates message origin", /new URL\(candidate\.src\)\.origin === event\.origin/.test(embedScript)],
  ["Embed script is publicly accessible", /"\/booking-embed\.js"/.test(authProxy)],
  ["Public widget sends responsive height updates", /ords-booking-resize/.test(publicPage) && /ResizeObserver/.test(publicPage)],
  ["Supabase REST failures cannot crash JSON parsing", /AbortSignal\.timeout/.test(supabaseRest) && /try \{[\s\S]*JSON\.parse/.test(supabaseRest)],
  ["Public consultation RPC execution is revoked", /from public, anon, authenticated/i.test(hardenedRpcMigration) && /to service_role/i.test(hardenedRpcMigration)],
  ["Public booking APIs use server credentials", (datesRoute.match(/useServiceRole: true/g) ?? []).length === 1 && /useServiceRole: true/.test(bookingRoute)],
  ["Available-date RPC uses invoker security", /get_consultation_available_dates/.test(calendarMigration) && /security invoker/i.test(calendarMigration)],
  ["Available-date RPC range is bounded", /p_end_date <= p_start_date \+ 45/i.test(calendarMigration) && /rangeDays > 45/.test(datesRoute)],
  ["Instructor invitation verifies owner access", /auth\.getUser/.test(inviteFunction) && /\[\"owner\", \"admin\"\]/.test(inviteFunction)],
  ["Portal invitations use app metadata", /app_metadata: \{ role \}/.test(inviteFunction)],
  ["Portal invitation roles are allowlisted", /payload\.role === \"student\"[\s\S]*payload\.role === \"instructor\"/.test(inviteFunction)],
  ["Student invitations link the roster profile", /from\(\"students\"\)[\s\S]*profile_id: invitation\.user\.id/.test(inviteFunction)],
  ["Owner people workspace has real account forms", /data-testid=\"instructor-invite-form\"/.test(peopleWorkspace) && /data-testid=\"student-create-form\"/.test(peopleWorkspace) && /data-testid=\"student-access-form\"/.test(peopleWorkspace)],
  ["Status endpoint does not return keys", !/publishableKey|apikey|authorization|url,/.test(statusRoute.match(/return Response\.json\(\{[\s\S]*?\}\);/)?.[0] ?? "")],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Consultation contract tests passed.");
