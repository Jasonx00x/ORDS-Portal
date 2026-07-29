# Phase 3 Production Setup

## Purpose

Move the ORDS Portal from a used-looking demo into a fresh operating system that the ORDS owner/admin can set up from zero.

The production portal should start empty. The owner/admin creates accounts, rooms, students, instructor assignments, availability, and schedules before parents or students can access anything.

## Confirmed Rules

- Parents cannot sign themselves up.
- The owner/admin creates parent accounts only after contract approval.
- Instructors receive an email invite to create their password.
- One parent account can manage one or more linked students.
- One student can support multiple instructor assignments later, even if ORDS does not currently need that.
- Default regular lesson length is 1 hour.
- Multiple lessons can happen at the same time if they are in different rooms.
- Every lesson needs a room.
- Current rooms:
  - Studio
  - Drum Room
  - Auditorium
  - Youth Room
  - Extra Room
- The owner/admin approves room use.
- Parents/students request reschedules from a list of available times only.
- Assigned instructors approve student reschedule requests.
- Billing stays in the external accounting system for now.
- Roles:
  - Owner/Admin
  - Instructor
  - Parent
  - Student
  - Client

## First-Run Admin Flow

1. Invite the first ORDS owner/admin account.
2. Configure ORDS rooms.
3. Set school hours and closed days.
4. Invite instructors.
5. Add contracted families.
6. Add student records and link them to parent accounts.
7. Assign each student to an instructor and program.
8. Instructor adds availability.
9. Instructor creates a 1-hour lesson schedule for the assigned student.
10. Lesson room use remains pending until the owner/admin approves.
11. Parent/student can request changes only from generated available times.

## Database Foundation

Migration:

```text
supabase/migrations/202607290001_create_ords_core_setup_scheduling.sql
```

Creates:

- `app_profiles`
- `rooms`
- `school_hours`
- `students`
- `parent_students`
- `instructor_student_assignments`
- `instructor_availability`
- `lesson_schedules`
- `room_approval_requests`

Security:

- RLS enabled on all new tables.
- Admin policies use app-controlled role claims.
- Parents can only view linked students and lessons.
- Instructors can only view their own assignments, availability, lessons, and room requests.
- Public users cannot create accounts, parents, students, lessons, or rooms.

## What Still Needs Real Backend Work

- Supabase Auth invite flow for owners, instructors, parents, students, and clients.
- Server-side admin APIs for creating users and sending invite emails.
- Real availability slot generation for regular 1-hour lessons.
- Room approval actions.
- Reschedule request generation from assigned instructor availability.
- Reminder delivery after Resend is configured.
- External accounting status display later.
