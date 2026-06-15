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
        <h1>Choose portal access.</h1>
        <p>Select a role to review the tailored workspace, permissions, and daily workflow for each account type.</p>
        <div className="login-role-grid">
          {roles.map((role) => (
            <button className="inline-btn" data-role={role} key={role} type="button" onClick={() => enterAs(role)}>
              Enter as {roleLabels[role]}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
