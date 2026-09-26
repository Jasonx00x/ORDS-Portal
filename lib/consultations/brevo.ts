const BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

export type BrevoRecipient = {
  email: string;
  name?: string;
};

export type BrevoSendResult =
  | { messageId?: string; ok: true }
  | {
      ok: false;
      reason: "invalid_configuration" | "invalid_recipients" | "network_error" | "provider_error";
      status?: number;
    };

type SendBrevoTemplateOptions = {
  apiKey?: string | null;
  params: Record<string, boolean | number | string | null>;
  recipients: Array<BrevoRecipient | string | null | undefined>;
  templateId: number | string | null | undefined;
};

type SendBrevoHtmlOptions = {
  apiKey?: string | null;
  htmlContent: string;
  recipients: Array<BrevoRecipient | string | null | undefined>;
  subject: string;
};

function normalizedTemplateId(value: SendBrevoTemplateOptions["templateId"]) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;

  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizedRecipients(recipients: SendBrevoTemplateOptions["recipients"]) {
  const unique = new Map<string, BrevoRecipient>();

  for (const recipient of recipients) {
    const email = (typeof recipient === "string" ? recipient : recipient?.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;

    const name = typeof recipient === "object" && recipient?.name ? recipient.name.trim() : "";
    unique.set(email, name ? { email, name } : { email });
  }

  return [...unique.values()];
}

export async function sendBrevoTemplate({
  apiKey: suppliedApiKey,
  params,
  recipients,
  templateId,
}: SendBrevoTemplateOptions): Promise<BrevoSendResult> {
  const apiKey = suppliedApiKey?.trim() || process.env.BREVO_API_KEY?.trim();
  const validTemplateId = normalizedTemplateId(templateId);
  const validRecipients = normalizedRecipients(recipients);

  if (!apiKey || !validTemplateId) {
    console.error("[Brevo] Transactional email configuration is incomplete.");
    return { ok: false, reason: "invalid_configuration" };
  }

  if (validRecipients.length === 0) {
    console.error("[Brevo] Transactional email has no valid recipients.");
    return { ok: false, reason: "invalid_recipients" };
  }

  try {
    const response = await fetch(BREVO_TRANSACTIONAL_EMAIL_URL, {
      body: JSON.stringify({ params, templateId: validTemplateId, to: validRecipients }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      method: "POST",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      console.error("[Brevo] Transactional email request was rejected.", { status: response.status });
      return { ok: false, reason: "provider_error", status: response.status };
    }

    const payload = (await response.json().catch(() => ({}))) as { messageId?: unknown };
    return {
      messageId: typeof payload.messageId === "string" ? payload.messageId : undefined,
      ok: true,
    };
  } catch {
    console.error("[Brevo] Transactional email request could not be completed.");
    return { ok: false, reason: "network_error" };
  }
}

export async function sendBrevoHtml({
  apiKey: suppliedApiKey,
  htmlContent,
  recipients,
  subject,
}: SendBrevoHtmlOptions): Promise<BrevoSendResult> {
  const apiKey = suppliedApiKey?.trim() || process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || process.env.ORDS_ADMIN_EMAIL?.trim();
  const validRecipients = normalizedRecipients(recipients);

  if (!apiKey || !senderEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(senderEmail)) {
    console.error("[Brevo] Transactional email configuration is incomplete.");
    return { ok: false, reason: "invalid_configuration" };
  }
  if (!subject.trim() || !htmlContent.trim() || validRecipients.length === 0) {
    return { ok: false, reason: "invalid_recipients" };
  }

  try {
    const response = await fetch(BREVO_TRANSACTIONAL_EMAIL_URL, {
      body: JSON.stringify({
        htmlContent,
        sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME?.trim() || "ORDS Music School" },
        subject: subject.trim(),
        to: validRecipients,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      method: "POST",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      console.error("[Brevo] Transactional email request was rejected.", { status: response.status });
      return { ok: false, reason: "provider_error", status: response.status };
    }

    const payload = (await response.json().catch(() => ({}))) as { messageId?: unknown };
    return {
      messageId: typeof payload.messageId === "string" ? payload.messageId : undefined,
      ok: true,
    };
  } catch {
    console.error("[Brevo] Transactional email request could not be completed.");
    return { ok: false, reason: "network_error" };
  }
}
