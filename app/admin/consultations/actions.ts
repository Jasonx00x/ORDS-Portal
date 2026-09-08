"use server";

import { revalidatePath } from "next/cache";
import { requirePortalUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ConsultationAdminActionResult = {
  message: string;
  ok: boolean;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function success(message: string): ConsultationAdminActionResult {
  return { message, ok: true };
}

function failure(message: string): ConsultationAdminActionResult {
  return { message, ok: false };
}

function cleanText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return cleaned;
}

function requireUuid(value: unknown) {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new Error("Select a valid record.");
  return value;
}

async function requireAdmin() {
  const user = await requirePortalUser("login-records");
  if (user.role !== "admin") throw new Error("Owner or admin access is required.");
  return user;
}

function revalidateConsultations() {
  revalidatePath("/admin/consultations");
  revalidatePath("/admin/consultations/availability");
  revalidatePath("/admin/consultations/settings");
  revalidatePath("/book-consultation");
  revalidatePath("/booking");
}

function actionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const known = [
    "Owner or admin access is required.",
    "Select a valid",
    "is required.",
    "characters or fewer.",
    "Closing time must be after opening time.",
    "That time overlaps existing consultation availability.",
    "End date must be on or after the start date.",
    "Duration must be",
    "Minimum notice must be",
    "Booking window must be",
  ];
  return known.some((item) => message.includes(item))
    ? message
    : "The consultation calendar could not be updated. Please try again.";
}

export async function addConsultationAvailabilityAction(input: {
  dayOfWeek: number;
  endTime: string;
  startTime: string;
}): Promise<ConsultationAdminActionResult> {
  try {
    await requireAdmin();
    const dayOfWeek = Number(input.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) throw new Error("Select a valid day.");
    if (!timePattern.test(input.startTime) || !timePattern.test(input.endTime)) throw new Error("Select a valid time.");
    if (input.startTime >= input.endTime) throw new Error("Closing time must be after opening time.");

    const supabase = await createClient();
    const { data: overlap, error: overlapError } = await supabase
      .from("consultation_availability")
      .select("id")
      .eq("day_of_week", dayOfWeek)
      .eq("is_enabled", true)
      .lt("start_time", input.endTime)
      .gt("end_time", input.startTime)
      .limit(1)
      .maybeSingle();
    if (overlapError) throw new Error(overlapError.message);
    if (overlap) return failure("That time overlaps existing consultation availability.");

    const { error } = await supabase.from("consultation_availability").insert({
      day_of_week: dayOfWeek,
      end_time: input.endTime,
      is_enabled: true,
      start_time: input.startTime,
    });
    if (error) throw new Error(error.message);
    revalidateConsultations();
    return success("Consultation availability added.");
  } catch (error) {
    return failure(actionError(error));
  }
}

export async function deleteConsultationAvailabilityAction(id: string): Promise<ConsultationAdminActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("consultation_availability")
      .delete()
      .eq("id", requireUuid(id))
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Select a valid availability window.");
    revalidateConsultations();
    return success("Consultation availability removed.");
  } catch (error) {
    return failure(actionError(error));
  }
}

export async function addConsultationBlockedPeriodAction(input: {
  endDate: string;
  reason: string;
  startDate: string;
}): Promise<ConsultationAdminActionResult> {
  try {
    const user = await requireAdmin();
    if (!datePattern.test(input.startDate) || !datePattern.test(input.endDate)) throw new Error("Select a valid date range.");
    if (input.startDate > input.endDate) throw new Error("End date must be on or after the start date.");

    const supabase = await createClient();
    const { error } = await supabase.from("consultation_blocked_dates").insert({
      created_by: user.id,
      end_date: input.endDate,
      reason: cleanText(input.reason, "Reason", 180),
      start_date: input.startDate,
    });
    if (error) throw new Error(error.message);
    revalidateConsultations();
    return success("Dates blocked. They are no longer available on the public calendar.");
  } catch (error) {
    return failure(actionError(error));
  }
}

export async function deleteConsultationBlockedPeriodAction(id: string): Promise<ConsultationAdminActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("consultation_blocked_dates")
      .delete()
      .eq("id", requireUuid(id))
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Select a valid blocked period.");
    revalidateConsultations();
    return success("Blocked period removed. Normal weekly availability applies again.");
  } catch (error) {
    return failure(actionError(error));
  }
}

export async function saveConsultationSettingsAction(input: {
  bookingsEnabled: boolean;
  durationMinutes: number;
  locationOrMeetingDetails: string;
  maximumAdvanceDays: number;
  minimumNoticeHours: number;
}): Promise<ConsultationAdminActionResult> {
  try {
    await requireAdmin();
    const durationMinutes = Number(input.durationMinutes);
    const minimumNoticeHours = Number(input.minimumNoticeHours);
    const maximumAdvanceDays = Number(input.maximumAdvanceDays);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) throw new Error("Duration must be between 15 and 240 minutes.");
    if (!Number.isInteger(minimumNoticeHours) || minimumNoticeHours < 0 || minimumNoticeHours > 720) throw new Error("Minimum notice must be between 0 and 720 hours.");
    if (!Number.isInteger(maximumAdvanceDays) || maximumAdvanceDays < 1 || maximumAdvanceDays > 365) throw new Error("Booking window must be between 1 and 365 days.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("consultation_settings")
      .update({
        bookings_enabled: Boolean(input.bookingsEnabled),
        duration_minutes: durationMinutes,
        location_or_meeting_details: cleanText(input.locationOrMeetingDetails, "Meeting details", 500),
        maximum_advance_days: maximumAdvanceDays,
        minimum_notice_hours: minimumNoticeHours,
        timezone: "America/New_York",
      })
      .eq("singleton_key", true);
    if (error) throw new Error(error.message);
    revalidateConsultations();
    return success("Consultation settings saved.");
  } catch (error) {
    return failure(actionError(error));
  }
}
