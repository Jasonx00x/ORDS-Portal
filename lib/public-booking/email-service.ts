import { sendBrevoHtml, type BrevoSendResult } from "@/lib/consultations/brevo";
import { formatBookingDate, formatBookingTime, splitFullName } from "@/lib/consultations/email-templates";
import { callSupabaseRpc } from "@/lib/consultations/supabase-rest";

type CalendarEmailBooking = {
  bookingId: string;
  bookingReference: string;
  bookerEmail: string;
  bookerName: string;
  calendarName: string;
  locationOrMeetingDetails: string;
  startTime: string;
  timezone: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

async function logResult(
  bookingId: string,
  type: "admin_notification" | "customer_confirmation",
  recipients: string[],
  result: BrevoSendResult,
) {
  const status = result.ok ? "sent" : result.reason === "invalid_configuration" ? "skipped" : "failed";
  await Promise.all(recipients.map((recipient) => callSupabaseRpc("log_calendar_booking_email_attempt", {
    p_booking_id: bookingId,
    p_email_type: type,
    p_error_message: result.ok ? null : `Brevo delivery failed: ${result.reason}.`,
    p_provider: "brevo",
    p_provider_message_id: result.ok ? result.messageId ?? null : null,
    p_recipient: recipient,
    p_status: status,
  }, { useServiceRole: true })));
}

function emailFrame(content: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#151c2c"><div style="max-width:620px;margin:0 auto;padding:32px 20px"><div style="background:#0b1328;color:#fff;padding:22px 28px;border-radius:8px 8px 0 0"><strong style="font-size:18px">ORDS Music School</strong></div><div style="background:#fff;padding:28px;border:1px solid #e2e5ea;border-top:0;border-radius:0 0 8px 8px">${content}</div></div></body></html>`;
}

export async function sendCalendarBookingEmails(booking: CalendarEmailBooking) {
  const bookingDate = formatBookingDate(booking.startTime, booking.timezone);
  const bookingTime = formatBookingTime(booking.startTime, booking.timezone);
  const { firstName } = splitFullName(booking.bookerName);
  const safeCalendar = escapeHtml(booking.calendarName);
  const safeDetails = escapeHtml(booking.locationOrMeetingDetails);
  const safeReference = escapeHtml(booking.bookingReference);

  const customerResult = await sendBrevoHtml({
    htmlContent: emailFrame(`<p style="margin-top:0">Hi ${escapeHtml(firstName || booking.bookerName)},</p><h1 style="font-size:24px">Your booking is confirmed</h1><p><strong>${safeCalendar}</strong><br>${escapeHtml(bookingDate)} at ${escapeHtml(bookingTime)}<br>${safeDetails}</p><p>Reference: ${safeReference}</p>`),
    recipients: [{ email: booking.bookerEmail, name: booking.bookerName }],
    subject: `${booking.calendarName} booking confirmed`,
  });
  await logResult(booking.bookingId, "customer_confirmation", [booking.bookerEmail], customerResult);

  const admins = [process.env.ORDS_ADMIN_EMAIL, process.env.ORDS_SECONDARY_ADMIN_EMAIL]
    .map((email) => email?.trim() ?? "")
    .filter(Boolean);
  const adminResult = await sendBrevoHtml({
    htmlContent: emailFrame(`<h1 style="font-size:24px;margin-top:0">New ${safeCalendar} booking</h1><p><strong>${escapeHtml(booking.bookerName)}</strong><br>${escapeHtml(booking.bookerEmail)}</p><p>${escapeHtml(bookingDate)} at ${escapeHtml(bookingTime)}<br>Reference: ${safeReference}</p>`),
    recipients: admins,
    subject: `New booking: ${booking.calendarName}`,
  });
  await logResult(booking.bookingId, "admin_notification", admins.length ? admins : ["not-configured"], adminResult);
}

