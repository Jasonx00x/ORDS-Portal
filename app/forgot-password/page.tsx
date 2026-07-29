import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <span className="eyebrow tag-on-light">Account Recovery</span>
        <h1>Reset your password.</h1>
        <p>Enter the email address connected to your ORDS account.</p>
        <ForgotPasswordForm />
        <Link className="auth-back-link" href="/login">Return to sign in</Link>
      </section>
    </main>
  );
}
