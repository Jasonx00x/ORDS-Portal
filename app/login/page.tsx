"use client";

import { useRouter } from "next/navigation";
import { roleLabels, type Role } from "@/lib/roles";

const roles = Object.keys(roleLabels) as Role[];

export default function LoginPage() {
  const router = useRouter();

  function enterAs(role: Role) {
    window.localStorage.setItem("ords-role", role);
    router.push("/dashboard");
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <span className="eyebrow tag-on-light">ORDS Operations Portal</span>
        <h1>Choose a role to enter the local MVP.</h1>
        <p>Phase 1 uses mock authentication so we can build and test permissions before Supabase is connected.</p>
        <div className="login-role-grid">
          {roles.map((role) => (
            <button className="inline-btn" key={role} type="button" onClick={() => enterAs(role)}>
              Continue as {roleLabels[role]}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
