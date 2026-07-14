# Supabase Connection

The ORDS Portal now has local Supabase environment wiring.

## Local Environment

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The real `.env.local` file is intentionally gitignored.

## Connection Check

Run the app locally and open:

```text
/api/supabase/status
```

Expected result:

```json
{
  "connected": true,
  "projectRef": "your-project-ref"
}
```

## Current Scope

This is connection wiring only. The portal still uses fake demo data for booking, rooms, reminders, students, and reports until the real Supabase schema and Row Level Security policies are created.

## Next Backend Step

Add the real tables for:

- profiles
- rooms
- instructor availability
- lesson bookings
- booking requests
- reminder jobs
- activity events

Then connect the booking page to those tables through secure server actions or API routes.
