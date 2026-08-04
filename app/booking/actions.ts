"use server";

import { revalidatePath } from "next/cache";
import { requirePortalUser } from "@/lib/auth";
import { localDateTimeToIso } from "@/lib/booking/time";
import { getSupabaseConfig } from "@/lib/supabase-config";
import { createClient } from "@/lib/supabase/server";

export type BookingActionResult = {
  message: string;
  ok: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function success(message: string): BookingActionResult {
  return { message, ok: true };
}

function failure(message: string): BookingActionResult {
  return { message, ok: false };
}

function cleanText(value: unknown, label: string, maxLength = 120) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  const cleaned = value.trim();
  if (cleaned.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return cleaned;
}

function optionalText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function requireUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new Error(`Select a valid ${label}.`);
  }
  return value;
}

function requireTime(value: unknown, label: string) {
  if (typeof value !== "string" || !timePattern.test(value)) {
    throw new Error(`Select a valid ${label}.`);
  }
  return value;
}

function bookingError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const knownMessages = [
    "Authentication is required.",
    "Lesson duration must be between",
    "Recurring lessons must contain",
    "Lesson time must be in the future.",
    "A lesson program is required.",
    "The selected room is not active.",
    "The selected instructor is not active.",
    "The selected student is not approved for scheduling.",
    "Program is required and must be",
    "The student is not assigned to this instructor and program.",
    "Instructors can only schedule their own assigned students.",
    "Lessons must start and finish on the same local day.",
    "Lesson falls outside configured school hours.",
    "Lesson falls outside the instructor availability.",
    "The instructor is unavailable during this lesson.",
    "This request is no longer pending.",
    "The lesson is no longer pending approval.",
    "The lesson could not be found.",
    "The room approval request could not be closed.",
    "Only upcoming pending or scheduled lessons can be cancelled.",
    "You can only cancel your own lessons.",
    "Owner or admin access is required.",
    "Instructor access is required.",
    "Availability must fit inside active school hours.",
    "Closing time must be after opening time.",
    "End time must be after start time.",
    "Select a valid",
    "Room name is required.",
    "Room use is required.",
    "The selected room could not be found.",
    "The selected availability could not be found.",
    "The selected unavailable period could not be found.",
    "Student name is required.",
    "Program is required.",
    "does not exist in Eastern Time",
  ];

  if (knownMessages.some((known) => message.includes(known))) {
    return message.split("\n")[0];
  }
  if (message.includes("conflicting key value") || message.includes("exclusion constraint")) {
    return "That time conflicts with another room, instructor, or student booking.";
  }
  if (message.includes("duplicate key")) {
    return "That record already exists.";
  }
  return "The booking change could not be saved. Please review the details and try again.";
}

function revalidateBooking() {
  revalidatePath("/booking");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/students");
}

async function requireAdmin() {
  const user = await requirePortalUser("booking");
  if (user.role !== "admin") throw new Error("Owner or admin access is required.");
  return user;
}

type PortalInviteInput = {
  displayName: string;
  email: string;
  phone?: string;
  role: "instructor" | "student";
  studentId?: string;
};

async function sendPortalInvitation(input: PortalInviteInput) {
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return failure("Authentication is required.");

  const { publishableKey, url } = getSupabaseConfig();
  const portalUrl = process.env.NEXT_PUBLIC_ORDS_PORTAL_URL || "https://ords-portal.netlify.app";
  const redirectTo = new URL("/login", portalUrl).toString();
  const response = await fetch(`${url}/functions/v1/invite-portal-user`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ...input, redirectTo }),
    cache: "no-store",
  });
  const result = await response.json() as { message?: string };
  if (!response.ok) {
    return failure(result.message || "The account invitation could not be sent.");
  }

  return success(result.message || `Invitation sent to ${input.email}.`);
}

export async function addRoomAction(input: {
  bestFor: string;
  name: string;
}): Promise<BookingActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("rooms").insert({
      best_for: cleanText(input.bestFor, "Room use", 180),
      is_active: true,
      name: cleanText(input.name, "Room name", 70),
      requires_owner_approval: true,
    });
    if (error) throw new Error(error.message);
    revalidateBooking();
    return success("Room added. New lesson requests will require owner approval.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function inviteInstructorAction(input: {
  displayName: string;
  email: string;
  phone: string;
}): Promise<BookingActionResult> {
  try {
    await requireAdmin();
    const displayName = cleanText(input.displayName, "Instructor name", 100);
    const email = cleanText(input.email, "Instructor email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Enter a valid instructor email address.");
    }

    const result = await sendPortalInvitation({
      displayName,
      email,
      phone: optionalText(input.phone, 40),
      role: "instructor",
    });
    if (result.ok) revalidateBooking();
    return result;
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function setRoomStatusAction(input: {
  id: string;
  isActive: boolean;
}): Promise<BookingActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .update({ is_active: Boolean(input.isActive) })
      .eq("id", requireUuid(input.id, "room"))
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("The selected room could not be found.");
    revalidateBooking();
    return success(input.isActive ? "Room activated." : "Room paused for new bookings.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function saveSchoolHoursAction(input: {
  closesAt: string;
  dayOfWeek: number;
  isEnabled: boolean;
  opensAt: string;
}): Promise<BookingActionResult> {
  try {
    await requireAdmin();
    const dayOfWeek = Number(input.dayOfWeek);
    const opensAt = requireTime(input.opensAt, "opening time");
    const closesAt = requireTime(input.closesAt, "closing time");
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error("Select a valid day.");
    }
    if (opensAt >= closesAt) throw new Error("Closing time must be after opening time.");

    const supabase = await createClient();
    const { error } = await supabase.from("school_hours").upsert({
      closes_at: closesAt,
      day_of_week: dayOfWeek,
      is_enabled: Boolean(input.isEnabled),
      opens_at: opensAt,
    }, { onConflict: "day_of_week" });
    if (error) throw new Error(error.message);
    revalidateBooking();
    return success("School hours saved.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function addStudentAction(input: {
  displayName: string;
  email?: string;
  primaryProgram: string;
}): Promise<BookingActionResult> {
  try {
    const user = await requireAdmin();
    const supabase = await createClient();
    const displayName = cleanText(input.displayName, "Student name", 100);
    const email = optionalText(input.email, 254).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Enter a valid student email address or leave it blank.");
    }

    const { data: student, error } = await supabase
      .from("students")
      .insert({
        contract_status: "approved",
        created_by: user.id,
        display_name: displayName,
        primary_program: cleanText(input.primaryProgram, "Program", 80),
        status: "setup",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (email) {
      const invite = await sendPortalInvitation({
        displayName,
        email,
        role: "student",
        studentId: requireUuid(student?.id, "student"),
      });
      revalidateBooking();
      if (!invite.ok) {
        return success(`Student added to the roster. Portal invitation was not sent: ${invite.message}`);
      }
      return success("Student added and portal invitation sent.");
    }

    revalidateBooking();
    return success("Student added to the roster. Assign an instructor before scheduling.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function inviteStudentAction(input: {
  email: string;
  studentId: string;
}): Promise<BookingActionResult> {
  try {
    await requireAdmin();
    const studentId = requireUuid(input.studentId, "student");
    const email = cleanText(input.email, "Student email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Enter a valid student email address.");
    }

    const supabase = await createClient();
    const { data: student, error } = await supabase
      .from("students")
      .select("display_name,profile_id")
      .eq("id", studentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!student) return failure("The student record could not be found.");
    if (student.profile_id) return failure("That student already has portal access.");

    const result = await sendPortalInvitation({
      displayName: cleanText(student.display_name, "Student name", 100),
      email,
      role: "student",
      studentId,
    });
    if (result.ok) revalidateBooking();
    return result;
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function assignStudentAction(input: {
  instructorProfileId: string;
  program: string;
  studentId: string;
}): Promise<BookingActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.rpc("assign_student_to_instructor", {
      p_instructor_profile_id: requireUuid(input.instructorProfileId, "instructor"),
      p_program: cleanText(input.program, "Program", 80),
      p_student_id: requireUuid(input.studentId, "student"),
    });
    if (error) throw new Error(error.message);
    revalidateBooking();
    return success("Instructor assigned. The student is ready for scheduling.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function addAvailabilityAction(input: {
  dayOfWeek: number;
  endsAt: string;
  instructorProfileId: string;
  startsAt: string;
}): Promise<BookingActionResult> {
  try {
    const user = await requirePortalUser("booking");
    if (user.role !== "admin" && user.role !== "instructor") {
      throw new Error("Instructor access is required.");
    }
    const instructorProfileId = user.role === "instructor"
      ? user.id
      : requireUuid(input.instructorProfileId, "instructor");
    const dayOfWeek = Number(input.dayOfWeek);
    const startsAt = requireTime(input.startsAt, "start time");
    const endsAt = requireTime(input.endsAt, "end time");
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error("Select a valid day.");
    }
    if (startsAt >= endsAt) throw new Error("End time must be after start time.");

    const supabase = await createClient();
    const { data: schoolHour, error: hourError } = await supabase
      .from("school_hours")
      .select("opens_at,closes_at,is_enabled")
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();
    if (hourError) throw new Error(hourError.message);
    if (!schoolHour?.is_enabled || startsAt < schoolHour.opens_at.slice(0, 5) || endsAt > schoolHour.closes_at.slice(0, 5)) {
      throw new Error("Availability must fit inside active school hours.");
    }

    const { error } = await supabase.from("instructor_availability").insert({
      day_of_week: dayOfWeek,
      ends_at: endsAt,
      instructor_profile_id: instructorProfileId,
      is_enabled: true,
      starts_at: startsAt,
    });
    if (error) throw new Error(error.message);
    revalidateBooking();
    return success("Instructor availability added.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function deleteAvailabilityAction(id: string): Promise<BookingActionResult> {
  try {
    const user = await requirePortalUser("booking");
    if (user.role !== "admin" && user.role !== "instructor") throw new Error("Instructor access is required.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("instructor_availability")
      .delete()
      .eq("id", requireUuid(id, "availability"))
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("The selected availability could not be found.");
    revalidateBooking();
    return success("Availability removed.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function addUnavailabilityAction(input: {
  endsAt: string;
  instructorProfileId: string;
  reason: string;
  startsAt: string;
}): Promise<BookingActionResult> {
  try {
    const user = await requirePortalUser("booking");
    if (user.role !== "admin" && user.role !== "instructor") throw new Error("Instructor access is required.");
    const instructorProfileId = user.role === "instructor"
      ? user.id
      : requireUuid(input.instructorProfileId, "instructor");
    const startsAt = localDateTimeToIso(input.startsAt, "unavailable start");
    const endsAt = localDateTimeToIso(input.endsAt, "unavailable end");
    if (new Date(startsAt) >= new Date(endsAt)) {
      throw new Error("Select a valid unavailable time range.");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("instructor_unavailability").insert({
      ends_at: endsAt,
      instructor_profile_id: instructorProfileId,
      reason: optionalText(input.reason, 180) || null,
      starts_at: startsAt,
    });
    if (error) throw new Error(error.message);
    revalidateBooking();
    return success("Unavailable time added.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function deleteUnavailabilityAction(id: string): Promise<BookingActionResult> {
  try {
    const user = await requirePortalUser("booking");
    if (user.role !== "admin" && user.role !== "instructor") throw new Error("Instructor access is required.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("instructor_unavailability")
      .delete()
      .eq("id", requireUuid(id, "unavailable period"))
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("The selected unavailable period could not be found.");
    revalidateBooking();
    return success("Unavailable time removed.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function createLessonAction(input: {
  durationMinutes: number;
  instructorProfileId: string;
  notes: string;
  program: string;
  repeatWeeks: number;
  roomId: string;
  startsAt: string;
  studentId: string;
}): Promise<BookingActionResult> {
  try {
    const user = await requirePortalUser("booking");
    if (user.role !== "admin" && user.role !== "instructor") throw new Error("Instructor access is required.");
    const startsAt = localDateTimeToIso(input.startsAt, "lesson date and time");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_lesson_request", {
      p_duration_minutes: Number(input.durationMinutes),
      p_instructor_profile_id: user.role === "instructor" ? user.id : requireUuid(input.instructorProfileId, "instructor"),
      p_notes: optionalText(input.notes),
      p_program: cleanText(input.program, "Program", 80),
      p_repeat_weeks: Number(input.repeatWeeks),
      p_room_id: requireUuid(input.roomId, "room"),
      p_starts_at: startsAt,
      p_student_id: requireUuid(input.studentId, "student"),
    });
    if (error) throw new Error(error.message);
    const count = Array.isArray(data) ? data.length : 1;
    revalidateBooking();
    return success(`${count} lesson${count === 1 ? "" : "s"} submitted for room approval.`);
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function decideApprovalAction(input: {
  decision: "approved" | "denied";
  decisionNote: string;
  requestId: string;
}): Promise<BookingActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.rpc("decide_room_approval", {
      p_decision: input.decision,
      p_decision_note: optionalText(input.decisionNote, 240),
      p_request_id: requireUuid(input.requestId, "approval request"),
    });
    if (error) throw new Error(error.message);
    revalidateBooking();
    return success(input.decision === "approved" ? "Room approved and lesson scheduled." : "Request denied and the room released.");
  } catch (error) {
    return failure(bookingError(error));
  }
}

export async function cancelLessonAction(lessonId: string): Promise<BookingActionResult> {
  try {
    const user = await requirePortalUser("booking");
    if (user.role !== "admin" && user.role !== "instructor") {
      throw new Error("Instructor access is required.");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_lesson_occurrence", {
      p_lesson_id: requireUuid(lessonId, "lesson"),
    });
    if (error) throw new Error(error.message);
    revalidateBooking();
    return success("Lesson cancelled. The instructor, student, and room are available again.");
  } catch (error) {
    return failure(bookingError(error));
  }
}
