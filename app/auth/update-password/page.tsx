import { PasswordSetupForm } from "./password-setup-form";

export default function UpdatePasswordPage() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <span className="eyebrow tag-on-light">ORDS Account Security</span>
        <h1>Create your password.</h1>
        <p>Use at least eight characters. This password is private and should not be shared with staff or other portal users.</p>
        <PasswordSetupForm />
      </section>
    </main>
  );
}
