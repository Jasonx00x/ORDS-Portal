import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260925170000_add_custom_booking_calendars.sql", "utf8");
const proxy = readFileSync("lib/supabase/proxy.ts", "utf8");
const publicPage = readFileSync("components/booking/PublicBookingPage.tsx", "utf8");
const bookingRoute = readFileSync("app/api/public-booking/[slug]/book/route.ts", "utf8");
const calendarActions = readFileSync("app/booking/calendars/actions.ts", "utf8");

const checks = [
  ["calendar tables use RLS", /alter table public\.booking_calendars enable row level security/i.test(migration) && /alter table public\.calendar_bookings enable row level security/i.test(migration)],
  ["public RPCs are service-role only", /revoke all on function public\.create_calendar_booking[\s\S]*from public, anon, authenticated/i.test(migration) && /grant execute on function public\.create_calendar_booking[\s\S]*to service_role/i.test(migration)],
  ["host bookings cannot overlap", /calendar_bookings_host_no_overlap/i.test(migration) && /tstzrange\(start_time, end_time, '\[\)'\)/i.test(migration)],
  ["availability checks public bookings", /get_booking_calendar_available_slots[\s\S]*calendar_bookings/i.test(migration)],
  ["availability checks lesson conflicts", /get_booking_calendar_available_slots[\s\S]*lesson_schedules/i.test(migration)],
  ["availability checks consultation conflicts", /get_booking_calendar_available_slots[\s\S]*consultation_bookings/i.test(migration)],
  ["booking creation uses an advisory lock", /pg_advisory_xact_lock/i.test(migration)],
  ["calendar URL slugs are constrained", /slug ~ '\^\[a-z0-9\]/i.test(migration)],
  ["public calendar route is unauthenticated", proxy.includes('"/book"') && proxy.includes('pathname.startsWith("/api/public-booking/")')],
  ["public form contains a honeypot", publicPage.includes("companyWebsite") && publicPage.includes("honeypot")],
  ["booking emails cannot prevent confirmation", /try \{[\s\S]*sendCalendarBookingEmails[\s\S]*catch/.test(bookingRoute)],
  ["calendar management requires admin access", /user\.role !== "admin"/.test(calendarActions)],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
assert.deepEqual(failures, [], failures.map((failure) => `- ${failure}`).join("\n"));
console.log("Custom calendar contract tests passed.");

