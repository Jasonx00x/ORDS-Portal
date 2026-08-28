# ORDS Operations Portal

The private ORDS Music School web application for account access, lesson scheduling, room approvals, consultation booking, and role-based academy operations.

## Account Roles

- Admin: academy-wide people, scheduling, approvals, reporting, and activity access
- Instructor: assigned students, teaching calendar, availability, clock-in, reports, homework, and staff announcements
- Parent: linked student schedules, reschedule requests, progress, billing status, and account settings
- Student: approved lessons, reschedule requests, homework, announcements, and settings
- Client: coaching sessions, assigned work, announcements, reschedule requests, and settings

Public signup is disabled. ORDS administrators invite approved account holders.

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

Create `.env.local` from `.env.example` and provide the project environment values. Never commit `.env.local` or server credentials.

## Verification

```bash
npm run validate:portal
npm run test:booking-time
npm run test:consultations
npm run build
```

The production application is deployed from the `main` branch through Netlify.
