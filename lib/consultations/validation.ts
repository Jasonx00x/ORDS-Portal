import { isInstrumentOption } from "./constants";

export type ConsultationBookingInput = {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  honeypot?: string;
  idempotencyKey: string;
  instrumentOrService: string;
  musicalGoals: string;
  startTime: string;
  studentAge?: string;
  studentName: string;
};

export type ValidationResult =
  | { data: ConsultationBookingInput & { studentAgeNumber: number | null }; ok: true }
  | { errors: string[]; ok: false };

export function validateBookingInput(input: Partial<ConsultationBookingInput>): ValidationResult {
  const errors: string[] = [];
  const customerName = String(input.customerName ?? "").trim();
  const studentName = String(input.studentName || input.customerName || "").trim();
  const customerEmail = String(input.customerEmail ?? "").trim().toLowerCase();
  const customerPhone = String(input.customerPhone ?? "").trim();
  const instrumentOrService = String(input.instrumentOrService ?? "").trim();
  const musicalGoals = String(input.musicalGoals ?? "").trim();
  const startTime = String(input.startTime ?? "").trim();
  const idempotencyKey = String(input.idempotencyKey ?? "").trim();
  const honeypot = String(input.honeypot ?? "").trim();
  const studentAge = String(input.studentAge ?? "").trim();

  if (honeypot) errors.push("Unable to submit this booking.");
  if (customerName.length < 2) errors.push("Parent or customer name is required.");
  if (studentName.length < 2) errors.push("Student name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)) errors.push("A valid email is required.");
  if (customerPhone.replace(/\D/g, "").length < 7) errors.push("A valid phone number is required.");
  if (!isInstrumentOption(instrumentOrService)) errors.push("Select a valid instrument or service.");
  if (musicalGoals.length < 5) errors.push("Tell us a little about the student's musical goals.");
  if (musicalGoals.length > 1200) errors.push("Musical goals must be 1,200 characters or less.");
  if (!startTime || Number.isNaN(Date.parse(startTime))) errors.push("Select a valid consultation time.");
  if (idempotencyKey.length < 12 || idempotencyKey.length > 120) errors.push("Please refresh and try again.");

  const studentAgeNumber = studentAge ? Number(studentAge) : null;
  if (studentAge && (studentAgeNumber === null || !Number.isInteger(studentAgeNumber) || studentAgeNumber < 0 || studentAgeNumber > 120)) {
    errors.push("Student age must be a reasonable whole number.");
  }

  if (errors.length) return { errors, ok: false };

  return {
    data: {
      customerEmail,
      customerName,
      customerPhone,
      honeypot,
      idempotencyKey,
      instrumentOrService,
      musicalGoals,
      startTime,
      studentAge,
      studentAgeNumber,
      studentName,
    },
    ok: true,
  };
}

export function validateAvailabilityDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}
