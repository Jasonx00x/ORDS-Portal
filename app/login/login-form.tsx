"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signIn, type AuthFormState } from "./actions";

const initialState: AuthFormState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const linkError = searchParams.get("error") === "invalid-link";

  return (
    <form action={formAction} className="auth-form">
      <input name="next" type="hidden" value={searchParams.get("next") ?? "/dashboard"} />
      <label className="portal-field">
        Email address
        <input autoComplete="email" inputMode="email" name="email" placeholder="you@example.com" required type="email" />
      </label>
      <label className="portal-field">
        Password
        <input autoComplete="current-password" minLength={8} name="password" required type="password" />
      </label>
      {linkError && <p className="auth-message auth-error" role="alert">That sign-in link is invalid or has expired. Request a new invitation or password reset.</p>}
      {state.error && <p className="auth-message auth-error" role="alert">{state.error}</p>}
      <button className="inline-btn auth-submit" disabled={pending} type="submit">
        {pending ? "Signing in..." : "Sign In"}
      </button>
      <div className="auth-form-footer">
        <Link href="/forgot-password">Forgot password?</Link>
        <span>Accounts are created by ORDS invitation only.</span>
      </div>
    </form>
  );
}
