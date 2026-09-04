# ORDS Consultation Booking System

## Public URL

Local:

```text
http://127.0.0.1:3001/book-consultation
```

Production:

```text
https://ords-portal.netlify.app/book-consultation
```

## What Was Built

- Public consultation booking route.
- Server-generated availability endpoint.
- Server-side booking endpoint.
- Supabase migration for consultation settings, availability, blocked dates, bookings, and email logs.
- PostgreSQL RPC for available slots.
- PostgreSQL RPC for atomic booking creation.
- Partial unique index preventing duplicate active bookings at the same start time.
- RLS enabled on every consultation table.
- Brevo template email delivery that never rolls back a valid booking.
- Live admin consultation records protected by Supabase Auth and RLS.

## Routes

- `/book-consultation`
- `/api/consultations/slots?date=YYYY-MM-DD`
- `/api/consultations/book`
- `/admin/consultations`
- `/admin/consultations/availability`
- `/admin/consultations/settings`

## Tables

- `consultation_settings`
- `consultation_availability`
- `consultation_blocked_dates`
- `consultation_bookings`
- `consultation_email_logs`

## Indexes And Constraints

- `consultation_availability_weekday_idx`
- `consultation_blocked_dates_range_idx`
- `consultation_bookings_start_time_idx`
- `consultation_bookings_status_idx`
- `consultation_bookings_customer_email_idx`
- `consultation_bookings_reference_idx`
- `consultation_email_logs_booking_idx`
- `consultation_bookings_active_start_unique`
- `consultation_bookings_idempotency_unique`

## Database Functions

- `is_ords_admin()`
- `get_consultation_available_slots(date)`
- `create_consultation_booking(...)`
- `log_consultation_email_attempt(...)`
- `make_consultation_reference()`
- `touch_updated_at()`

## RLS

RLS is enabled on all consultation tables.

Public visitors do not read tables directly. They use safe server routes and RPC functions.

Admin policies require authenticated users with `app_metadata.role` of:

- `admin`
- `staff`
- `owner`

The admin consultation routes require Supabase Auth and an admin role stored in `app_metadata`.

## Environment Variables

Public:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ORDS_MARKETING_URL`
- `NEXT_PUBLIC_ORDS_PORTAL_URL`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`, used for the booking RPC and internal email delivery logs
- `BREVO_API_KEY`
- `BREVO_BOOKING_CONFIRMATION_TEMPLATE_ID`
- `BREVO_ADMIN_BOOKING_TEMPLATE_ID`
- `ORDS_ADMIN_EMAIL`
- `ORDS_SECONDARY_ADMIN_EMAIL`

Never put server-only values in `NEXT_PUBLIC_` variables.

## Apply Supabase Migration

Review:

```bash
cat supabase/migrations/202607140001_create_consultation_booking_system.sql
```

Verify the Supabase project is the intended project:

```bash
npx supabase projects list
```

Apply:

```bash
npx supabase db push
```

After applying, verify in Supabase:

- Tables exist.
- RLS is enabled.
- RPC functions exist.
- `consultation_bookings_active_start_unique` exists.
- Starter availability rows exist.

Before the migration is applied, `/api/consultations/slots` will return a friendly setup/unavailable response instead of exposing a database error. That is expected.

## Owner Setup

The ORDS owner/admin edits weekly availability from:

```text
/admin/consultations/availability
```

Production note: the UI preview exists now, but write operations require Supabase Auth admin wiring before launch.

The owner/admin can pause bookings by setting `bookings_enabled` to `false` in `consultation_settings`.

The owner/admin can block one day by inserting a row in `consultation_blocked_dates` where `start_date` and `end_date` are the same.

The owner/admin can block a vacation week by inserting a row where `start_date` is the first vacation date and `end_date` is the last vacation date.

Admin notifications use the two server-only ORDS admin email variables. The database notification field is retained for future settings work but is not used by the Brevo booking notification.

## Brevo Setup

1. Verify the sender configured on both Brevo templates.
2. Activate both templates in Brevo.
3. Confirm the customer template uses `first_name`, `booking_date`, and `booking_time` params.
4. Confirm the admin template uses `first_name`, `last_name`, `email`, `phone`, `booking_date`, `booking_time`, and `source` params.
5. Add all five Brevo/admin environment variables to Netlify with runtime scope.
6. Redeploy, create a test booking, and review Brevo transactional logs.

If Brevo is unavailable or misconfigured, the booking remains confirmed. The server logs a sanitized failure and records a failed or skipped delivery attempt when Supabase logging is available.

## Netlify

Add environment variables in Netlify:

1. Open the Netlify project.
2. Go to Site configuration.
3. Go to Environment variables.
4. Add the public and server-only variables listed above. Keep every secret out of `NEXT_PUBLIC_` variables.
5. Trigger a new deployment.
6. Test `/book-consultation`.
7. Test `/api/consultations/slots?date=YYYY-MM-DD`.

Rollback:

1. Open Netlify deploys.
2. Select the previous known-good deploy.
3. Publish deploy.

## Test Booking

1. Apply the migration.
2. Open `/book-consultation`.
3. Select an available date.
4. Select a time.
5. Complete the form.
6. Submit.
7. Confirm a booking reference appears.
8. Check `consultation_bookings`.
9. Check `consultation_email_logs`.

## Duplicate Booking Test

1. Open the same available slot in two browser windows.
2. Submit the first booking.
3. Submit the second booking for the same time.
4. The second request should fail with:

```text
That time was just booked by someone else. Please choose another available time.
```

## Calendly Replacement

Do not remove Calendly until production testing passes.

Search the marketing repository for:

- `calendly`
- `Calendly`
- `calendly.com`
- `calendly-inline-widget`
- `data-url`
- `Book a Consultation`
- `Free Consultation`
- `Schedule Consultation`
- `30 Minute Meeting`

Likely locations:

- Homepage hero
- Main navigation
- Mobile menu
- Consultation section
- Instrument pages
- Footer
- Floating booking button
- Calendly popup button

Current direct link:

```html
<a href="https://ords-portal.netlify.app/book-consultation">Book Your Free 30-Minute Consultation</a>
```

Optional iframe:

```html
<iframe
  src="https://ords-portal.netlify.app/book-consultation"
  title="Book your free ORDS consultation"
  style="width:100%;height:980px;border:0;"
></iframe>
```

Recommended iframe height: `980px`.

Remove unused Calendly scripts after replacement and search again for remaining Calendly references.

## Prompt For Marketing Website Repo

```text
Replace the ORDS website Calendly consultation booking links and embeds with the new ORDS Portal consultation booking URL:

https://ords-portal.netlify.app/book-consultation

Search for calendly, Calendly, calendly.com, calendly-inline-widget, data-url, Book a Consultation, Free Consultation, Schedule Consultation, and 30 Minute Meeting.

Update homepage hero, navigation, mobile menu, consultation sections, instrument pages, footer, floating buttons, and any Calendly popup/embed usage. Prefer a direct link button labeled “Book Your Free 30-Minute Consultation.” Remove unused Calendly scripts after confirming no Calendly embeds remain.
```

## Google Calendar Plan

Future services should add:

- Internal availability calculation.
- External busy-time retrieval.
- Google Calendar free/busy check.
- Google Calendar event creation.
- Customer attendee invitation.
- Calendar event update.
- Calendar event cancellation.
- External calendar event ID storage.
- Owner/admin calendar connection.

Google Calendar is not required for this MVP.
