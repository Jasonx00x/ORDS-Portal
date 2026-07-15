"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdminView = "availability" | "consultations" | "settings";

const demoConsultations = [
  ["ORDS-8F3A21B0", "Mateo Ramos", "Ramos Family", "Drums", "Confirmed", "Email skipped"],
  ["ORDS-94C2D801", "Naomi Lee", "Lee Family", "Voice", "Completed", "Sent"],
  ["ORDS-C118A40F", "Jordan Cruz", "Jordan Cruz", "Music Production", "No-show", "Failed"],
];

export function ConsultationAdminPage({ view }: { view: AdminView }) {
  const [role, setRole] = useState("");

  useEffect(() => {
    setRole(window.localStorage.getItem("ords-role") ?? "");
  }, []);

  if (role && role !== "admin") {
    return (
      <main className="consultation-admin-shell">
        <section className="consultation-panel">
          <span className="eyebrow tag-on-light">Protected Area</span>
          <h1>Admin access required.</h1>
          <p>This preview uses the current local role switcher. Production admin access must be connected to Supabase Auth before launch.</p>
          <Link className="inline-btn" href="/login">Choose Admin Role</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="consultation-admin-shell">
      <section className="consultation-admin-head">
        <div>
          <span className="eyebrow tag-on-light">Consultation Admin</span>
          <h1>Free consultation booking system.</h1>
          <p>Manage consultation requests, availability, blocked dates, and launch settings. This admin area is demo-guarded until Supabase Auth roles are connected.</p>
        </div>
        <nav>
          <Link className={view === "consultations" ? "active" : ""} href="/admin/consultations">Consultations</Link>
          <Link className={view === "availability" ? "active" : ""} href="/admin/consultations/availability">Availability</Link>
          <Link className={view === "settings" ? "active" : ""} href="/admin/consultations/settings">Settings</Link>
        </nav>
      </section>

      {view === "consultations" && <ConsultationsView />}
      {view === "availability" && <AvailabilityView />}
      {view === "settings" && <SettingsView />}
    </main>
  );
}

function ConsultationsView() {
  return (
    <>
      <div className="portal-grid stat-grid ops-stats">
        <article className="portal-panel stat-card"><span>Upcoming</span><strong>1</strong><small>Confirmed consultations</small></article>
        <article className="portal-panel stat-card"><span>Today</span><strong>0</strong><small>No consultations today</small></article>
        <article className="portal-panel stat-card"><span>Past</span><strong>2</strong><small>Completed/no-show</small></article>
        <article className="portal-panel stat-card"><span>Email issues</span><strong>2</strong><small>Setup or retry needed</small></article>
      </div>
      <section className="portal-panel">
        <div className="portal-panel-head">
          <div><div className="panel-kicker">Dashboard</div><h3>Consultation records</h3></div>
          <input className="consultation-admin-search" placeholder="Search by name, email, phone, instrument, or reference" />
        </div>
        <div className="ops-table consultation-admin-table">
          {demoConsultations.map((row) => <div key={row[0]}>{row.map((cell, index) => index === 0 ? <strong key={cell}>{cell}</strong> : <span key={`${cell}-${index}`}>{cell}</span>)}</div>)}
        </div>
        <p className="approval-note">Real consultation records will appear here after the Supabase migration is applied and admin auth is connected.</p>
      </section>
    </>
  );
}

function AvailabilityView() {
  return (
    <div className="portal-grid two-grid">
      <section className="portal-panel">
        <div className="panel-kicker">Weekly Availability</div>
        <h3>Temporary starter schedule</h3>
        <div className="availability-admin-grid">
          {["Monday 10:00 AM-2:00 PM", "Wednesday 12:00 PM-4:00 PM", "Saturday 10:00 AM-1:00 PM"].map((item) => <label key={item}><input defaultChecked type="checkbox" /> {item}</label>)}
          {["Tuesday unavailable", "Thursday unavailable", "Friday unavailable", "Sunday unavailable"].map((item) => <label key={item}><input type="checkbox" /> {item}</label>)}
        </div>
      </section>
      <section className="portal-panel">
        <div className="panel-kicker">Blocked Dates</div>
        <h3>Vacation and unavailable dates</h3>
        <label className="portal-field">Start date<input type="date" /></label>
        <label className="portal-field">End date<input type="date" /></label>
        <label className="portal-field">Reason<textarea defaultValue="Vacation week" /></label>
        <button className="inline-btn" type="button">Add Blocked Period</button>
      </section>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="portal-grid two-grid">
      <section className="portal-panel">
        <div className="panel-kicker">Booking Settings</div>
        <h3>Consultation controls</h3>
        <label className="portal-field">Bookings enabled<select defaultValue="true"><option value="true">Enabled</option><option value="false">Paused</option></select></label>
        <label className="portal-field">Minimum notice hours<input defaultValue="24" type="number" /></label>
        <label className="portal-field">Maximum advance days<input defaultValue="30" type="number" /></label>
      </section>
      <section className="portal-panel">
        <div className="panel-kicker">Email Setup</div>
        <h3>Notification settings</h3>
        <label className="portal-field">Notification email<input placeholder="oscar@example.com" /></label>
        <label className="portal-field">Reply-to email<input placeholder="oscar@example.com" /></label>
        <label className="portal-field">Meeting details<textarea defaultValue="ORDS Music School will confirm whether the consultation is in person or by phone." /></label>
      </section>
    </div>
  );
}
