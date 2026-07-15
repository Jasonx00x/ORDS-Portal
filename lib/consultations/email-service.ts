import { adminNotificationEmail, customerConfirmationEmail, type ConsultationEmailBooking } from "./email-templates";
import { callSupabaseRpc } from "./supabase-rest";

type EmailType = "admin_notification" | "customer_confirmation";

type SendEmailOptions = {
  booking: ConsultationEmailBooking & { bookingId: string };
  notificationEmail?: string | null;
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

  await callSupabaseRpc("log_consultation_email_attempt", {
    p_booking_id: bookingId,
    p_email_type: emailType,
    p_recipient: recipient,
    p_provider: "resend",
    p_provider_message_id: providerMessageId ?? null,
    p_status: status,
    p_error_message: errorMessage ?? null,
  }, { useServiceRole: true });
}

async function sendResendEmail(emailType: EmailType, recipient: string, subject: string, text: string, bookingId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDS_EMAIL_FROM;
  const replyTo = process.env.ORDS_EMAIL_REPLY_TO;

  if (!apiKey || !from) {
    await logEmailAttempt(bookingId, emailType, recipient, "skipped", undefined, "Email delivery is not configured.");
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        reply_to: replyTo || undefined,
        subject,
        text,
        to: recipient,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      await logEmailAttempt(bookingId, emailType, recipient, "failed", undefined, "Email provider rejected the message.");
      return;
    }

    await logEmailAttempt(bookingId, emailType, recipient, "sent", payload?.id);
  } catch {
    await logEmailAttempt(bookingId, emailType, recipient, "failed", undefined, "Email provider request failed.");
  }
}

export async function sendConsultationEmails({ booking, notificationEmail }: SendEmailOptions) {
  const portalUrl = process.env.NEXT_PUBLIC_ORDS_PORTAL_URL ?? "https://portal.ordsmusic.com";
  const adminRecipient = notificationEmail || process.env.ORDS_DEFAULT_NOTIFICATION_EMAIL;

  const customer = customerConfirmationEmail(booking);
  await sendResendEmail("customer_confirmation", booking.customerEmail, customer.subject, customer.text, booking.bookingId);

  if (!adminRecipient) {
    await logEmailAttempt(booking.bookingId, "admin_notification", "not-configured", "skipped", undefined, "Notification email is not configured.");
    return;
  }

  const admin = adminNotificationEmail(booking, portalUrl);
  await sendResendEmail("admin_notification", adminRecipient, admin.subject, admin.text, booking.bookingId);
}
