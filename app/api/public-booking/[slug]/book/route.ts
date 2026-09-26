import { callSupabaseRpc } from "@/lib/consultations/supabase-rest";
import { loadPublicBookingCalendar } from "@/lib/public-booking/data";
import { sendCalendarBookingEmails } from "@/lib/public-booking/email-service";
import { validatePublicBookingInput } from "@/lib/public-booking/validation";

type BookingResultRow = {
  booking_id: string | null;
  booking_reference: string | null;
  booking_type: string | null;
  calendar_name: string | null;
  end_time: string | null;
  error_code: string | null;
  location_or_meeting_details: string | null;
  message: string;
  start_time: string | null;
  success: boolean;
  timezone: string | null;
};

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const calendar = await loadPublicBookingCalendar(slug);
  if (!calendar) return Response.json({ message: "This booking calendar could not be found." }, { status: 404 });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ message: "Please check the booking form and try again." }, { status: 400 });
  }
  const validation = validatePublicBookingInput(payload, calendar.bookingType);
  if (!validation.ok) return Response.json({ errors: validation.errors, message: validation.errors[0] }, { status: 400 });
  const input = validation.data;

  const { data, error } = await callSupabaseRpc<BookingResultRow[]>("create_calendar_booking", {
    p_attendee_name: input.attendeeName,
    p_booker_email: input.bookerEmail,
    p_booker_name: input.bookerName,
    p_booker_phone: input.bookerPhone,
    p_idempotency_key: input.idempotencyKey,
    p_responses: input.responses,
    p_slug: slug,
    p_start_time: input.startTime,
  }, { useServiceRole: true });
  if (error) return Response.json({ message: "This booking could not be completed right now." }, { status: 503 });

  const booking = data?.[0];
  if (!booking?.success || !booking.booking_id || !booking.booking_reference || !booking.start_time || !booking.end_time || !booking.timezone) {
    return Response.json({
      code: booking?.error_code ?? "booking_failed",
      message: booking?.message ?? "That time was just booked. Please choose another available time.",
    }, { status: booking?.error_code === "invalid_fields" ? 400 : 409 });
  }

  try {
    await sendCalendarBookingEmails({
      bookingId: booking.booking_id,
      bookingReference: booking.booking_reference,
      bookerEmail: input.bookerEmail,
      bookerName: input.bookerName,
      calendarName: booking.calendar_name ?? calendar.name,
      locationOrMeetingDetails: booking.location_or_meeting_details ?? calendar.locationOrMeetingDetails,
      startTime: booking.start_time,
      timezone: booking.timezone,
    });
  } catch {
    console.error("[Calendar Booking] Email processing failed safely.", { bookingId: booking.booking_id });
  }

  return Response.json({
    bookingReference: booking.booking_reference,
    calendarName: booking.calendar_name ?? calendar.name,
    endTime: booking.end_time,
    message: "Your booking is confirmed.",
    startTime: booking.start_time,
    timezone: booking.timezone,
  });
}

