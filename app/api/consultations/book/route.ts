import { sendConsultationEmails } from "@/lib/consultations/email-service";
import { callSupabaseRpc } from "@/lib/consultations/supabase-rest";
import { validateBookingInput } from "@/lib/consultations/validation";

type BookingRpcRow = {
  booking_id: string | null;
  booking_reference: string | null;
  end_time: string | null;
  error_code: string | null;
  location_or_meeting_details: string | null;
  message: string;
  start_time: string | null;
  success: boolean;
  timezone: string | null;
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ message: "Please check the booking form and try again." }, { status: 400 });
  }

  const validation = validateBookingInput(payload as Record<string, string>);

  if (!validation.ok) {
    return Response.json({ errors: validation.errors, message: validation.errors[0] }, { status: 400 });
  }

  const input = validation.data;

  const { data, error } = await callSupabaseRpc<BookingRpcRow[]>(
    "create_consultation_booking",
    {
      p_customer_email: input.customerEmail,
      p_customer_name: input.customerName,
      p_customer_phone: input.customerPhone,
      p_idempotency_key: input.idempotencyKey,
      p_instrument_or_service: input.instrumentOrService,
      p_musical_goals: input.musicalGoals,
      p_start_time: input.startTime,
      p_student_age: input.studentAgeNumber,
      p_student_name: input.studentName,
    },
    { useServiceRole: true },
  );

  if (error) {
    return Response.json(
      { message: "Consultations are temporarily unavailable. Please contact ORDS Music School for assistance." },
      { status: 503 },
    );
  }

  const booking = data?.[0];

  if (!booking?.success || !booking.booking_id || !booking.booking_reference || !booking.start_time || !booking.end_time || !booking.timezone) {
    return Response.json(
      {
        code: booking?.error_code ?? "booking_failed",
        message: booking?.message ?? "That time was just booked by someone else. Please choose another available time.",
      },
      { status: booking?.error_code === "invalid_fields" ? 400 : 409 },
    );
  }

  await sendConsultationEmails({
    booking: {
      bookingId: booking.booking_id,
      bookingReference: booking.booking_reference,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      instrumentOrService: input.instrumentOrService,
      locationOrMeetingDetails: booking.location_or_meeting_details ?? "ORDS Music School will confirm details.",
      musicalGoals: input.musicalGoals,
      startTime: booking.start_time,
      studentAge: input.studentAgeNumber,
      studentName: input.studentName,
      timezone: booking.timezone,
    },
  });

  return Response.json({
    bookingReference: booking.booking_reference,
    endTime: booking.end_time,
    message: "Your consultation is confirmed.",
    startTime: booking.start_time,
    timezone: booking.timezone,
  });
}
