"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/app/login/actions";
import { requestPasswordReset } from "./actions";

const initialState: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="auth-form">
      <label className="portal-field">
        Email address
        <input autoComplete="email" inputMode="email" name="email" placeholder="you@example.com" required type="email" />
      </label>
      {state.error && <p className="auth-message auth-error" role="alert">{state.error}</p>}
      {state.message && <p className="auth-message auth-success" role="status">{state.message}</p>}
      <button className="inline-btn auth-submit" disabled={pending} type="submit">
        {pending ? "Sending..." : "Send Reset Link"}
      </button>
    </form>
  );
}
