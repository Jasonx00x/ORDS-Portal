"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "@/app/login/actions";

export async function requestPasswordReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? (host?.startsWith("127.0.0.1") || host?.startsWith("localhost") ? "http" : "https");

  if (!host) return { error: "Password recovery is temporarily unavailable." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/auth/callback?next=/auth/update-password`,
  });

  return { message: "If an ORDS account exists for that email, a password reset link is on the way." };
}
