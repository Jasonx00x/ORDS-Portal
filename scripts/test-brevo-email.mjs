import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { sendBrevoTemplate } from "../lib/consultations/brevo.ts";
import { formatBookingDate, formatBookingTime, splitFullName } from "../lib/consultations/email-templates.ts";

const originalApiKey = process.env.BREVO_API_KEY;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.BREVO_API_KEY = "test-only-api-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.BREVO_API_KEY;
  else process.env.BREVO_API_KEY = originalApiKey;
});

test("sends a Brevo template to normalized unique recipients", async () => {
  let request;
  globalThis.fetch = async (url, init) => {
    request = { init, url };
    return Response.json({ messageId: "test-message-id" });
  };

  const result = await sendBrevoTemplate({
    params: { booking_date: "September 10, 2026", first_name: "Jason" },
    recipients: ["ADMIN@example.com", "admin@example.com", null, { email: "second@example.com", name: "Second Admin" }],
    templateId: "42",
  });

  assert.deepEqual(result, { messageId: "test-message-id", ok: true });
  assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers["api-key"], "test-only-api-key");
  assert.deepEqual(JSON.parse(request.init.body), {
    params: { booking_date: "September 10, 2026", first_name: "Jason" },
    templateId: 42,
    to: [{ email: "admin@example.com" }, { email: "second@example.com", name: "Second Admin" }],
  });
});

test("fails safely when Brevo configuration is incomplete", async () => {
  delete process.env.BREVO_API_KEY;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const result = await sendBrevoTemplate({ params: {}, recipients: ["person@example.com"], templateId: "42" });
  assert.deepEqual(result, { ok: false, reason: "invalid_configuration" });
  assert.equal(called, false);
});

test("fails safely when Brevo rejects or cannot complete a request", async (context) => {
  await context.test("provider error", async () => {
    globalThis.fetch = async () => new Response("Rejected", { status: 400 });
    const result = await sendBrevoTemplate({ params: {}, recipients: ["person@example.com"], templateId: 42 });
    assert.deepEqual(result, { ok: false, reason: "provider_error", status: 400 });
  });

  await context.test("network error", async () => {
    globalThis.fetch = async () => { throw new Error("simulated outage"); };
    const result = await sendBrevoTemplate({ params: {}, recipients: ["person@example.com"], templateId: 42 });
    assert.deepEqual(result, { ok: false, reason: "network_error" });
  });
});

test("formats the selected consultation in Eastern Time", () => {
  const startTime = "2026-09-10T20:30:00.000Z";
  assert.equal(formatBookingDate(startTime, "America/New_York"), "September 10, 2026");
  assert.equal(formatBookingTime(startTime, "America/New_York"), "4:30 PM");
  assert.deepEqual(splitFullName("Jason Alfaro"), { firstName: "Jason", lastName: "Alfaro" });
});
