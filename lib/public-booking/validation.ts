import type { BookingCalendarType } from "@/lib/booking/calendars";

export type PublicBookingInput = {
  attendeeName: string;
  bookerEmail: string;
  bookerName: string;
  bookerPhone: string;
  honeypot: string;
  idempotencyKey: string;
  responses: Record<string, unknown>;
  startTime: string;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function validatePublicBookingInput(payload: Record<string, unknown>, bookingType: BookingCalendarType) {
  const errors: string[] = [];
  const input: PublicBookingInput = {
    attendeeName: clean(payload.attendeeName, 120),
    bookerEmail: clean(payload.bookerEmail, 254).toLowerCase(),
    bookerName: clean(payload.bookerName, 120),
    bookerPhone: clean(payload.bookerPhone, 40),
    honeypot: clean(payload.honeypot, 200),
    idempotencyKey: clean(payload.idempotencyKey, 120),
    responses: typeof payload.responses === "object" && payload.responses && !Array.isArray(payload.responses)
      ? payload.responses as Record<string, unknown>
      : {},
    startTime: clean(payload.startTime, 80),
  };

  if (input.honeypot) errors.push("Unable to submit this booking.");
  if (input.bookerName.length < 2) errors.push(bookingType === "interview" ? "Candidate name is required." : "Your name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.bookerEmail)) errors.push("A valid email is required.");
  if (input.bookerPhone.replace(/\D/g, "").length < 7) errors.push("A valid phone number is required.");
  if (!input.startTime || Number.isNaN(Date.parse(input.startTime))) errors.push("Select a valid meeting time.");
  if (input.idempotencyKey.length < 12) errors.push("Please refresh and try again.");

  if (bookingType === "consultation") {
    if (input.attendeeName.length < 2) errors.push("Student name is required.");
    if (clean(input.responses.instrumentOrService, 120).length < 2) errors.push("Select an instrument or service.");
    if (clean(input.responses.goals, 1200).length < 5) errors.push("Tell us a little about the student’s goals.");
  }

  if (bookingType === "interview") {
    if (clean(input.responses.position, 120).length < 2) errors.push("Select or enter the position.");
    if (clean(input.responses.experience, 1200).length < 5) errors.push("Tell us a little about your teaching experience.");
  }

  if (
    bookingType === "general"
    && typeof input.responses.notes === "string"
    && input.responses.notes.trim().length > 1200
  ) {
    errors.push("Notes must be 1,200 characters or fewer.");
  }

  return errors.length ? { errors, ok: false as const } : { data: input, ok: true as const };
}
