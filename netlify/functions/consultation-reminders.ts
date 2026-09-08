import type { Config } from "@netlify/functions";
import { sendBrevoTemplate } from "../../lib/consultations/brevo";
import { formatBookingDate, formatBookingTime, splitFullName } from "../../lib/consultations/email-templates";

declare const Netlify: {
  env: { get(name: string): string | undefined };
};

type ReminderDelivery = {
  audience: "admin" | "customer";
  booking_id: string;
  booking_reference: string;
  claim_token: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  delivery_id: string;
  instrument_or_service: string;
  location_or_meeting_details: string;
  musical_goals: string;
  recipient: string;
  start_time: string;
  student_name: string;
  timezone: string;
};

function env(name: string) {
  return Netlify.env.get(name)?.trim() ?? "";
}

async function callServiceRpc<T>(functionName: string, body: Record<string, unknown>) {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("supabase_configuration");

  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    body: JSON.stringify(body),
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    console.error("[Reminder] Supabase RPC rejected.", { functionName, status: response.status });
    throw new Error("supabase_request");
  }

  return await response.json() as T;
}

function adminRecipients() {
  return [...new Set([
    env("ORDS_ADMIN_EMAIL").toLowerCase(),
    env("ORDS_SECONDARY_ADMIN_EMAIL").toLowerCase(),
  ].filter(Boolean))];
}

async function completeDelivery(
  delivery: ReminderDelivery,
  result: Awaited<ReturnType<typeof sendBrevoTemplate>>,
) {
  await callServiceRpc("complete_consultation_reminder_delivery", {
    p_claim_token: delivery.claim_token,
    p_delivery_id: delivery.delivery_id,
    p_error_message: result.ok ? null : `Brevo reminder delivery failed: ${result.reason}.`,
    p_provider_message_id: result.ok ? result.messageId ?? null : null,
    p_success: result.ok,
  });
}

async function sendReminder(delivery: ReminderDelivery) {
  const { firstName, lastName } = splitFullName(delivery.customer_name);
  const result = await sendBrevoTemplate({
    apiKey: env("BREVO_API_KEY"),
    params: {
      booking_date: formatBookingDate(delivery.start_time, delivery.timezone),
      booking_reference: delivery.booking_reference,
      booking_time: formatBookingTime(delivery.start_time, delivery.timezone),
      email: delivery.customer_email,
      first_name: firstName,
      instrument_or_service: delivery.instrument_or_service,
      last_name: lastName,
      location_or_meeting_details: delivery.location_or_meeting_details,
      musical_goals: delivery.musical_goals,
      phone: delivery.customer_phone,
      source: "Website Booking",
      student_name: delivery.student_name,
    },
    recipients: [{ email: delivery.recipient, name: delivery.audience === "customer" ? delivery.customer_name : "ORDS Team" }],
    templateId: delivery.audience === "customer"
      ? env("BREVO_CUSTOMER_REMINDER_TEMPLATE_ID")
      : env("BREVO_ADMIN_REMINDER_TEMPLATE_ID"),
  });

  await completeDelivery(delivery, result);
  return result.ok;
}

export default async () => {
  const admins = adminRecipients();
  if (admins.length === 0) {
    console.error("[Reminder] No ORDS administrator recipients are configured.");
  }

  try {
    const deliveries = await callServiceRpc<ReminderDelivery[]>("claim_due_consultation_reminders", {
      p_admin_recipients: admins,
      p_limit: 25,
    });

    if (deliveries.length === 0) {
      console.info("[Reminder] No consultation reminders are due.");
      return new Response(null, { status: 204 });
    }

    const results = await Promise.all(deliveries.map(sendReminder));
    const sent = results.filter(Boolean).length;
    console.info("[Reminder] Consultation reminder run completed.", {
      failed: results.length - sent,
      processed: results.length,
      sent,
    });

    return Response.json({ processed: results.length, sent });
  } catch (error) {
    console.error("[Reminder] Consultation reminder run failed safely.", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return new Response("Reminder run failed.", { status: 500 });
  }
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
