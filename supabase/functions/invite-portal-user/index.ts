import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { headers: corsHeaders, status });
}

function defaultKey(variable: string) {
  try {
    const values = JSON.parse(Deno.env.get(variable) ?? "{}") as Record<string, string>;
    return values.default ?? "";
  } catch {
    return "";
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ message: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return json({ message: "Authentication is required." }, 401);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey =
    defaultKey("SUPABASE_PUBLISHABLE_KEYS") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    "";
  const secretKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    defaultKey("SUPABASE_SECRET_KEYS");

  if (!url || !publishableKey || !secretKey) {
    return json({ message: "Account invitations are not configured." }, 503);
  }

  const userClient = createClient(url, publishableKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return json({ message: "Authentication is required." }, 401);

  const { data: requester, error: requesterError } = await userClient
    .from("app_profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();
  if (requesterError || !requester || !["owner", "admin"].includes(requester.role)) {
    return json({ message: "Owner or admin access is required." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ message: "Check the account details and try again." }, 400);
  }

  const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const redirectTo = typeof payload.redirectTo === "string" ? payload.redirectTo : "";
  const role = payload.role === "student" ? "student" : payload.role === "instructor" ? "instructor" : "";
  const studentId = typeof payload.studentId === "string" ? payload.studentId : "";

  if (displayName.length < 2 || displayName.length > 100) {
    return json({ message: "Enter the account holder's full name." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ message: "Enter a valid email address." }, 400);
  }
  if (!role) {
    return json({ message: "Select a valid portal account type." }, 400);
  }
  if (role === "student" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentId)) {
    return json({ message: "Select a valid student record." }, 400);
  }

  let redirectUrl: URL;
  try {
    redirectUrl = new URL(redirectTo);
  } catch {
    return json({ message: "The portal invitation URL is not configured." }, 503);
  }
  if (!["http:", "https:"].includes(redirectUrl.protocol) || redirectUrl.pathname !== "/login") {
    return json({ message: "The portal invitation URL is not configured." }, 503);
  }

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (role === "student") {
    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id,profile_id")
      .eq("id", studentId)
      .maybeSingle();
    if (studentError || !student) {
      return json({ message: "The student record could not be found." }, 404);
    }
    if (student.profile_id) {
      return json({ message: "That student already has portal access." }, 409);
    }
  }

  const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { display_name: displayName },
      redirectTo: redirectUrl.toString(),
    },
  );

  if (invitationError || !invitation.user) {
    const duplicate = invitationError?.message.toLowerCase().includes("already");
    return json(
      {
        message: duplicate
          ? "An account already exists for that email address."
          : "The invitation could not be sent. Check the email setup and try again.",
      },
      duplicate ? 409 : 503,
    );
  }

  const { error: roleError } = await admin.auth.admin.updateUserById(invitation.user.id, {
    app_metadata: { role },
    user_metadata: { display_name: displayName },
  });
  if (roleError) {
    await admin.auth.admin.deleteUser(invitation.user.id);
    return json({ message: "The portal role could not be assigned." }, 500);
  }

  if (role === "student") {
    const { data: linkedStudent, error: linkError } = await admin
      .from("students")
      .update({ profile_id: invitation.user.id })
      .eq("id", studentId)
      .is("profile_id", null)
      .select("id")
      .maybeSingle();
    if (linkError || !linkedStudent) {
      await admin.auth.admin.deleteUser(invitation.user.id);
      return json({ message: "The student portal account could not be linked." }, 500);
    }
  }

  if (phone) {
    await admin.from("app_profiles").update({ phone }).eq("id", invitation.user.id);
  }

  return json({
    accountId: invitation.user.id,
    message: `Invitation sent to ${email}.`,
    role,
  });
});
