"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordSetupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function updatePassword(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Use at least eight characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("This invitation or recovery link is no longer valid. Request a new email from ORDS.");
      setPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form action={updatePassword} className="auth-form">
      <label className="portal-field">
        New password
        <input autoComplete="new-password" minLength={8} name="password" required type="password" />
      </label>
      <label className="portal-field">
        Confirm new password
        <input autoComplete="new-password" minLength={8} name="confirmPassword" required type="password" />
      </label>
      {error && <p className="auth-message auth-error" role="alert">{error}</p>}
      <button className="inline-btn auth-submit" disabled={pending} type="submit">
        {pending ? "Saving password..." : "Save Password"}
      </button>
    </form>
  );
}
