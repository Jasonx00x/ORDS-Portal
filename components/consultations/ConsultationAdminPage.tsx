import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";

type AdminView = "availability" | "consultations" | "settings";

export async function ConsultationAdminPage({ view }: { view: AdminView }) {
  await requirePortalUser("login-records");

  return (
    <main className="consultation-admin-shell">
      <section className="consultation-admin-head">
        <div>
          <span className="eyebrow tag-on-light">Consultation Admin</span>
          <h1>Free consultation booking system.</h1>
          <p>Manage consultation requests, availability, blocked dates, and booking settings from one workspace.</p>
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
        <article className="portal-panel stat-card"><span>Upcoming</span><strong>0</strong><small>No confirmed consultations</small></article>
        <article className="portal-panel stat-card"><span>Today</span><strong>0</strong><small>No consultations today</small></article>
        <article className="portal-panel stat-card"><span>Past</span><strong>0</strong><small>No consultation history</small></article>
        <article className="portal-panel stat-card"><span>Email issues</span><strong>0</strong><small>No delivery issues</small></article>
      </div>
      <section className="portal-panel">
        <div className="portal-panel-head">
          <div><div className="panel-kicker">Dashboard</div><h3>Consultation records</h3></div>
          <input className="consultation-admin-search" placeholder="Search by name, email, phone, instrument, or reference" />
        </div>
        <div className="booking-empty-state">
          <strong>No consultation records yet</strong>
          <span>Confirmed consultation requests will appear here with contact details, program interest, status, and email delivery history.</span>
        </div>
      </section>
    </>
  );
}

function AvailabilityView() {
  return (
    <div className="portal-grid two-grid">
      <section className="portal-panel">
        <div className="panel-kicker">Weekly Availability</div>
        <h3>Consultation hours</h3>
        <div className="availability-admin-grid">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((item) => <label key={item}><input type="checkbox" /> {item} available</label>)}
        </div>
      </section>
      <section className="portal-panel">
        <div className="panel-kicker">Blocked Dates</div>
        <h3>Vacation and unavailable dates</h3>
        <label className="portal-field">Start date<input type="date" /></label>
        <label className="portal-field">End date<input type="date" /></label>
        <label className="portal-field">Reason<textarea placeholder="Reason for blocking these dates" /></label>
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
        <label className="portal-field">Notification email<input placeholder="owner@example.com" /></label>
        <label className="portal-field">Reply-to email<input placeholder="owner@example.com" /></label>
        <label className="portal-field">Meeting details<textarea defaultValue="ORDS Music School will confirm whether the consultation is in person or by phone." /></label>
      </section>
    </div>
  );
}
