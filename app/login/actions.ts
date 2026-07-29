"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
};

function safeNextPath(value: FormDataEntryValue | null, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function signIn(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "The email or password is incorrect. Check your invitation and try again." };
  }

  redirect(next);
}
