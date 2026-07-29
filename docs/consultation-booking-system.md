# ORDS Consultation Booking System

## Public URL

Local:

```text
http://127.0.0.1:3001/book-consultation
```

Production target:

```text
https://portal.ordsmusic.com/book-consultation
```

Future optional domain:

```text
https://book.ordsmusic.com
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
- Resend-compatible email service that safely skips email delivery when not configured.
- Admin consultation dashboard preview routes.

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

Current portal auth is still demo/local-role based. Production admin security requires Supabase Auth before launch.

## Environment Variables

Public:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ORDS_MARKETING_URL`
- `NEXT_PUBLIC_ORDS_PORTAL_URL`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY` optional, used only for internal email delivery logs
- `RESEND_API_KEY`
- `ORDS_EMAIL_FROM`
- `ORDS_EMAIL_REPLY_TO`
- `ORDS_DEFAULT_NOTIFICATION_EMAIL`

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

The owner/admin sets the notification email in `consultation_settings.notification_email`, or by setting `ORDS_DEFAULT_NOTIFICATION_EMAIL`.

## Resend Setup

1. Create a Resend account.
2. Add a sending domain or subdomain.
3. Recommended subdomain: `updates.ordsmusic.com`.
4. Add SPF DNS records from Resend.
5. Add DKIM DNS records from Resend.
6. Verify the domain in Resend.
7. Create a Resend API key.
8. Add `RESEND_API_KEY` to `.env.local`.
9. Add `RESEND_API_KEY` to Netlify as a server-only env var.
10. Set `ORDS_EMAIL_FROM`, for example `ORDS Music School <bookings@updates.ordsmusic.com>`.
11. Set `ORDS_EMAIL_REPLY_TO` to the correct ORDS inbox.
12. Set `ORDS_DEFAULT_NOTIFICATION_EMAIL`.
13. Redeploy.
14. Make a test booking.
15. Check Resend logs.
16. Confirm both the customer and the ORDS notification inbox receive emails.

If Resend is missing, bookings still save. Email delivery logs are written only when `SUPABASE_SERVICE_ROLE_KEY` is configured server-side.

## Netlify

Add environment variables in Netlify:

1. Open the Netlify project.
2. Go to Site configuration.
3. Go to Environment variables.
4. Add the public and server-only variables listed above.
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

Recommended direct link:

```html
<a href="https://portal.ordsmusic.com/book-consultation">Book Your Free 30-Minute Consultation</a>
```

Optional iframe:

```html
<iframe
  src="https://portal.ordsmusic.com/book-consultation"
  title="Book your free ORDS consultation"
  style="width:100%;height:980px;border:0;"
></iframe>
```

Recommended iframe height: `980px`.

Remove unused Calendly scripts after replacement and search again for remaining Calendly references.

## Prompt For Marketing Website Repo

```text
Replace the ORDS website Calendly consultation booking links and embeds with the new ORDS Portal consultation booking URL:

https://portal.ordsmusic.com/book-consultation

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
