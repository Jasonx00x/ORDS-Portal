import { Suspense } from "react";
import { AuthHashHandler } from "./auth-hash-handler";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <AuthHashHandler />
      <section className="login-panel">
        <div className="login-brand-row">
          <img src="https://static.wixstatic.com/media/a51682_27dfdd46028443e7a016d349782ffa8f~mv2.png" alt="ORDS logo" />
          <span>ORDS Operations Portal</span>
        </div>
        <span className="eyebrow tag-on-light">Secure Account Access</span>
        <h1>Welcome back.</h1>
        <p>Sign in with the email address connected to your ORDS account.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
