import { sendBrevoTemplate, type BrevoSendResult } from "./brevo";
import {
  formatBookingDate,
  formatBookingTime,
  splitFullName,
  type ConsultationEmailBooking,
} from "./email-templates";
import { callSupabaseRpc } from "./supabase-rest";

type EmailType = "admin_notification" | "customer_confirmation";

type SendEmailOptions = {
  booking: ConsultationEmailBooking & { bookingId: string };
};

async function logEmailAttempt(
  bookingId: string,
  emailType: EmailType,
  recipient: string,
  status: "failed" | "sent" | "skipped",
  providerMessageId?: string,
  errorMessage?: string,
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  try {
    await callSupabaseRpc("log_consultation_email_attempt", {
      p_booking_id: bookingId,
      p_email_type: emailType,
      p_recipient: recipient,
      p_provider: "brevo",
      p_provider_message_id: providerMessageId ?? null,
      p_status: status,
      p_error_message: errorMessage ?? null,
    }, { useServiceRole: true });
  } catch {
    console.error("[Brevo] Email delivery log could not be written.", { bookingId, emailType });
  }
}

async function recordResult(
  bookingId: string,
  emailType: EmailType,
  recipients: string[],
  result: BrevoSendResult,
) {
  const status = result.ok ? "sent" : result.reason === "invalid_configuration" ? "skipped" : "failed";
  const errorMessage = result.ok ? undefined : `Brevo delivery failed: ${result.reason}.`;

  await Promise.all(recipients.map((recipient) => logEmailAttempt(
    bookingId,
    emailType,
    recipient,
    status,
    result.ok ? result.messageId : undefined,
    errorMessage,
  )));
}

async function sendCustomerConfirmation(booking: SendEmailOptions["booking"], bookingDate: string, bookingTime: string) {
  const { firstName } = splitFullName(booking.customerName);
  const result = await sendBrevoTemplate({
    params: {
      booking_date: bookingDate,
      booking_time: bookingTime,
      first_name: firstName,
    },
    recipients: [{ email: booking.customerEmail, name: booking.customerName }],
    templateId: process.env.BREVO_BOOKING_CONFIRMATION_TEMPLATE_ID,
  });

  await recordResult(booking.bookingId, "customer_confirmation", [booking.customerEmail], result);
  if (result.ok) {
    console.info("[Brevo] Customer confirmation sent", { bookingId: booking.bookingId });
  } else {
    console.error("[Brevo] Customer confirmation failed", { bookingId: booking.bookingId, reason: result.reason });
  }
}

async function sendAdminNotification(booking: SendEmailOptions["booking"], bookingDate: string, bookingTime: string) {
  const recipients = [process.env.ORDS_ADMIN_EMAIL, process.env.ORDS_SECONDARY_ADMIN_EMAIL]
    .map((recipient) => recipient?.trim() ?? "")
    .filter(Boolean);
  const { firstName, lastName } = splitFullName(booking.customerName);
  const result = await sendBrevoTemplate({
    params: {
      booking_date: bookingDate,
      booking_time: bookingTime,
      email: booking.customerEmail,
      first_name: firstName,
      last_name: lastName,
      phone: booking.customerPhone,
      source: "Website Booking",
    },
    recipients,
    templateId: process.env.BREVO_ADMIN_BOOKING_TEMPLATE_ID,
  });

  await recordResult(booking.bookingId, "admin_notification", recipients.length ? recipients : ["not-configured"], result);
  if (result.ok) {
    console.info("[Brevo] Admin notification sent", { bookingId: booking.bookingId, recipientCount: recipients.length });
  } else {
    console.error("[Brevo] Admin notification failed", { bookingId: booking.bookingId, reason: result.reason });
  }
}

export async function sendConsultationEmails({ booking }: SendEmailOptions) {
  try {
    const bookingDate = formatBookingDate(booking.startTime, booking.timezone);
    const bookingTime = formatBookingTime(booking.startTime, booking.timezone);

    await Promise.all([
      sendCustomerConfirmation(booking, bookingDate, bookingTime),
      sendAdminNotification(booking, bookingDate, bookingTime),
    ]);
  } catch {
    console.error("[Brevo] Booking email processing failed safely.", { bookingId: booking.bookingId });
  }
}
