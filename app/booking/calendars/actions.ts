"use server";

import { revalidatePath } from "next/cache";
import { requirePortalUser } from "@/lib/auth";
import type { BookingCalendarType } from "@/lib/booking/calendars";
import { createClient } from "@/lib/supabase/server";

export type CalendarActionResult = {
  calendarId?: string;
  message: string;
  ok: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const colorPattern = /^#[0-9a-f]{6}$/i;
const allowedTypes: BookingCalendarType[] = ["consultation", "general", "interview"];

function success(message: string, calendarId?: string): CalendarActionResult {
  return { calendarId, message, ok: true };
}

function failure(message: string): CalendarActionResult {
  return { message, ok: false };
}

function text(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return cleaned;
}

function uuid(value: unknown) {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new Error("Select a valid calendar record.");
  return value;
}

function integer(value: unknown, label: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function slug(value: unknown) {
  const cleaned = text(value, "Public URL", 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (cleaned.length < 3) throw new Error("Public URL must contain at least three letters or numbers.");
  return cleaned;
}

async function requireCalendarAdmin() {
  const user = await requirePortalUser("booking");
  if (user.role !== "admin") throw new Error("Owner or admin access is required.");
  return user;
}

function revalidateCalendar(calendarId?: string) {
  revalidatePath("/booking");
  revalidatePath("/booking/calendars");
  if (calendarId) revalidatePath(`/booking/calendars/${calendarId}`);
}

function actionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("duplicate key") || message.includes("booking_calendars_slug_key")) {
    return "That public URL is already being used. Choose a different one.";
  }
  const known = [
    "is required.",
    "characters or fewer.",
    "must be between",
    "Public URL must",
    "Select a valid",
    "Owner or admin access is required.",
    "End time must be after start time.",
    "That availability overlaps",
    "End date must be on or after",
  ];
  return known.some((item) => message.includes(item))
    ? message
    : "The calendar change could not be saved. Please review the details and try again.";
}

export async function createBookingCalendarAction(input: {
  accentColor: string;
  bookingType: BookingCalendarType;
  description: string;
  durationMinutes: number;
  locationOrMeetingDetails: string;
  maximumAdvanceDays: number;
  minimumNoticeHours: number;
  name: string;
  slug: string;
}): Promise<CalendarActionResult> {
  try {
    const user = await requireCalendarAdmin();
    const bookingType = allowedTypes.includes(input.bookingType) ? input.bookingType : "general";
    const accentColor = colorPattern.test(input.accentColor) ? input.accentColor : "#b58a45";
    const supabase = await createClient();
    const { data, error } = await supabase.from("booking_calendars").insert({
      accent_color: accentColor,
      booking_type: bookingType,
      description: text(input.description, "Description", 500),
      duration_minutes: integer(input.durationMinutes, "Duration", 15, 240),
      location_or_meeting_details: text(input.locationOrMeetingDetails, "Meeting details", 500),
      maximum_advance_days: integer(input.maximumAdvanceDays, "Booking window", 1, 365),
      minimum_notice_hours: integer(input.minimumNoticeHours, "Minimum notice", 0, 720),
      name: text(input.name, "Calendar name", 100),
      owner_profile_id: user.id,
      slug: slug(input.slug),
    }).select("id").single();
    if (error) throw new Error(error.message);

    revalidateCalendar(data.id);
    return success("Calendar created. Add weekly availability to start accepting bookings.", data.id);
  } catch (error) {
    return failure(actionError(error));
  }
}

export async function updateBookingCalendarAction(input: {
  accentColor: string;
  bookingsEnabled: boolean;
  calendarId: string;
  description: string;
  durationMinutes: number;
  locationOrMeetingDetails: string;
  maximumAdvanceDays: number;
  minimumNoticeHours: number;
  name: string;
  slug: string;
}): Promise<CalendarActionResult> {
  try {
    await requireCalendarAdmin();
    const calendarId = uuid(input.calendarId);
    if (!colorPattern.test(input.accentColor)) throw new Error("Select a valid accent color.");
    const supabase = await createClient();
    const { data, error } = await supabase.from("booking_calendars").update({
      accent_color: input.accentColor,
      bookings_enabled: Boolean(input.bookingsEnabled),
      description: text(input.description, "Description", 500),
      duration_minutes: integer(input.durationMinutes, "Duration", 15, 240),
      location_or_meeting_details: text(input.locationOrMeetingDetails, "Meeting details", 500),
      maximum_advance_days: integer(input.maximumAdvanceDays, "Booking window", 1, 365),
      minimum_notice_hours: integer(input.minimumNoticeHours, "Minimum notice", 0, 720),
      name: text(input.name, "Calendar name", 100),
      slug: slug(input.slug),
    }).eq("id", calendarId).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Select a valid calendar record.");
    revalidateCalendar(calendarId);
    return success("Calendar settings saved.", calendarId);
  } catch (error) {
    return failure(actionError(error));
  }
}

export async function addCalendarAvailabilityAction(input: {
  calendarId: string;
  dayOfWeek: number;
  endTime: string;
  startTime: string;
}): Promise<CalendarActionResult> {
  try {
    await requireCalendarAdmin();
    const calendarId = uuid(input.calendarId);
    const dayOfWeek = integer(input.dayOfWeek, "Day", 0, 6);
    if (!timePattern.test(input.startTime) || !timePattern.test(input.endTime)) throw new Error("Select a valid time.");
    if (input.startTime >= input.endTime) throw new Error("End time must be after start time.");
    const supabase = await createClient();
    const { data: overlap, error: overlapError } = await supabase
      .from("booking_calendar_availability")
      .select("id")
      .eq("calendar_id", calendarId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_enabled", true)
      .lt("start_time", input.endTime)
      .gt("end_time", input.startTime)
      .limit(1)
      .maybeSingle();
    if (overlapError) throw new Error(overlapError.message);
    if (overlap) throw new Error("That availability overlaps an existing window.");

    const { error } = await supabase.from("booking_calendar_availability").insert({
      calendar_id: calendarId,
      day_of_week: dayOfWeek,
      end_time: input.endTime,
      is_enabled: true,
      start_time: input.startTime,
    });
    if (error) throw new Error(error.message);
    revalidateCalendar(calendarId);
    return success("Weekly availability added.", calendarId);
  } catch (error) {
    return failure(actionError(error));
  }
}

export async function deleteCalendarAvailabilityAction(calendarIdValue: string, availabilityId: string): Promise<CalendarActionResult> {
  try {
    await requireCalendarAdmin();
    const calendarId = uuid(calendarIdValue);
    const supabase = await createClient();
    const { data, error } = await supabase.from("booking_calendar_availability")
      .delete()
      .eq("id", uuid(availabilityId))
      .eq("calendar_id", calendarId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Select a valid availability record.");
    revalidateCalendar(calendarId);
    return success("Availability removed.", calendarId);
  } catch (error) {
    return failure(actionError(error));
  }
}

export async function addCalendarBlockAction(input: {
  calendarId: string;
  endDate: string;
  reason: string;
  startDate: string;
}): Promise<CalendarActionResult> {
  try {
    const user = await requireCalendarAdmin();
    const calendarId = uuid(input.calendarId);
    if (!datePattern.test(input.startDate) || !datePattern.test(input.endDate)) throw new Error("Select a valid date.");
    if (input.endDate < input.startDate) throw new Error("End date must be on or after the start date.");
    const supabase = await createClient();
    const { error } = await supabase.from("booking_calendar_blocks").insert({
      calendar_id: calendarId,
      created_by: user.id,
      end_date: input.endDate,
      reason: text(input.reason, "Reason", 160),
      start_date: input.startDate,
    });
    if (error) throw new Error(error.message);
    revalidateCalendar(calendarId);
    return success("Dates blocked from public booking.", calendarId);
  } catch (error) {
    return failure(actionError(error));
  }
}

export async function deleteCalendarBlockAction(calendarIdValue: string, blockId: string): Promise<CalendarActionResult> {
  try {
    await requireCalendarAdmin();
    const calendarId = uuid(calendarIdValue);
    const supabase = await createClient();
    const { data, error } = await supabase.from("booking_calendar_blocks")
      .delete()
      .eq("id", uuid(blockId))
      .eq("calendar_id", calendarId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Select a valid blocked-date record.");
    revalidateCalendar(calendarId);
    return success("Blocked dates removed.", calendarId);
  } catch (error) {
    return failure(actionError(error));
  }
}

