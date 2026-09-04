import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";
import { loadConsultationData, type ConsultationRecord } from "@/lib/consultations/admin-data";
import { ConsultationRecords } from "./ConsultationRecords";

type AdminView = "availability" | "consultations" | "settings";

export async function ConsultationAdminPage({ view }: { view: AdminView }) {
  await requirePortalUser("login-records");
  const consultationData = view === "consultations" ? await loadConsultationData() : null;

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

      {view === "consultations" && consultationData && <ConsultationsView {...consultationData} />}
      {view === "availability" && <AvailabilityView />}
      {view === "settings" && <SettingsView />}
    </main>
  );
}

function easternDateKey(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function ConsultationsView({
  emailIssueCount,
  loadError,
  records,
}: {
  emailIssueCount: number;
  loadError: string;
  records: ConsultationRecord[];
}) {
  const now = new Date();
  const today = easternDateKey(now);
  const upcoming = records.filter((record) => record.status === "confirmed" && new Date(record.startTime) >= now);
  const todayCount = records.filter((record) => record.status === "confirmed" && easternDateKey(record.startTime) === today).length;
  const pastCount = records.filter((record) => new Date(record.startTime) < now || record.status !== "confirmed").length;

  return (
    <>
      <div className="portal-grid stat-grid ops-stats">
        <article className="portal-panel stat-card"><span>Upcoming</span><strong>{upcoming.length}</strong><small>Confirmed consultations</small></article>
        <article className="portal-panel stat-card"><span>Today</span><strong>{todayCount}</strong><small>Eastern Time schedule</small></article>
        <article className="portal-panel stat-card"><span>Past</span><strong>{pastCount}</strong><small>History and closed records</small></article>
        <article className="portal-panel stat-card"><span>Email issues</span><strong>{emailIssueCount}</strong><small>Failed delivery attempts</small></article>
      </div>
      <section className="portal-panel">
        <div className="portal-panel-head">
          <div><div className="panel-kicker">Dashboard</div><h3>Consultation records</h3></div>
        </div>
        {loadError && <p className="consultation-error">Consultation records could not be loaded. Please refresh or try again shortly.</p>}
        {!loadError && <ConsultationRecords records={records} />}
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
