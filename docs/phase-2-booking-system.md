# Phase 2 Booking System

## Goal

Build ORDS booking as a real operating workflow: instructor availability, student and parent booking requests, admin or instructor approval, confirmed lessons, and automated reminders.

## Core Rules

- Students, parents, and clients only see openings for their assigned instructor.
- Booked, blocked, and pending slots are not selectable for new booking.
- ORDS can choose whether a slot becomes confirmed immediately or requires instructor/admin approval.
- Every confirmed booking should create reminder records.
- Payment and accounting stay in QuickBooks. The portal can display billing status later, but it should not replace QuickBooks.

## First Supabase Tables

- `profiles`: one row per auth user, with role stored in app-controlled data.
- `students`: student records and program details.
- `student_guardians`: parent to student relationships.
- `instructor_assignments`: which instructor owns each student/client.
- `instructor_availability`: weekly recurring availability windows.
- `availability_exceptions`: blocked dates, time off, room conflicts, special openings.
- `lesson_bookings`: requested, approved, denied, cancelled, completed, and no-show lessons.
- `booking_requests`: request reason, requested slot, approver, decision, decision note.
- `reminder_jobs`: email/SMS reminder tasks with scheduled time, status, and delivery result.
- `notification_preferences`: email/SMS preferences by account.
- `activity_events`: login, booking viewed, reminder sent, announcement read, homework viewed.

## Reminder Flow

1. Booking request is submitted.
2. Instructor/admin approves the request.
3. Portal creates a confirmed `lesson_bookings` row.
4. Portal creates reminder jobs:
   - confirmation immediately
   - 24-hour email reminder
   - same-day optional SMS reminder
   - change notice if booking is updated or cancelled
5. Scheduled backend job sends due reminders and records delivery status.

## Backend Plan

- Use Supabase Auth for login.
- Use Supabase Postgres for bookings, reminders, assignments, and activity events.
- Enable Row Level Security on every exposed table.
- Use Netlify Functions for privileged booking actions.
- Use Netlify Scheduled Functions for reminder processing.
- Use Resend for email reminders.
- Use Twilio for SMS reminders if ORDS wants texting.

## Permissions

- Admin: all booking, reminder, student, instructor, and activity records.
- Instructor: own availability, assigned students, own lessons, own booking approvals.
- Parent: own linked student bookings and reminders.
- Student: own bookings, homework, announcements, reminders.
- Client: own coaching bookings, homework, announcements, reminders.
