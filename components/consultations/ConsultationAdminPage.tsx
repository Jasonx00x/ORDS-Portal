import Link from "next/link";
import { requirePortalUser } from "@/lib/auth";
import {
  loadConsultationAvailabilityData,
  loadConsultationData,
  loadConsultationSettings,
  type ConsultationRecord,
} from "@/lib/consultations/admin-data";
import { ConsultationAvailabilityManager } from "./ConsultationAvailabilityManager";
import { ConsultationRecords } from "./ConsultationRecords";
import { ConsultationSettingsForm } from "./ConsultationSettingsForm";

type AdminView = "availability" | "consultations" | "settings";

export async function ConsultationAdminPage({ view }: { view: AdminView }) {
  await requirePortalUser("login-records");
  const consultationData = view === "consultations" ? await loadConsultationData() : null;
  const availabilityData = view === "availability" ? await loadConsultationAvailabilityData() : null;
  const settingsData = view === "settings" ? await loadConsultationSettings() : null;

  return (
    <main className="consultation-admin-shell">
      <section className="consultation-admin-head">
        <div>
          <span className="eyebrow tag-on-light">Consultation Admin</span>
          <h1>Free consultation booking system.</h1>
          <p>Manage consultation requests, availability, blocked dates, and booking settings from one workspace.</p>
        </div>
        <nav>
          <Link href="/booking">Portal Calendar</Link>
          <Link className={view === "consultations" ? "active" : ""} href="/admin/consultations">Consultations</Link>
          <Link className={view === "availability" ? "active" : ""} href="/admin/consultations/availability">Availability</Link>
          <Link className={view === "settings" ? "active" : ""} href="/admin/consultations/settings">Settings</Link>
        </nav>
      </section>

      {view === "consultations" && consultationData && <ConsultationsView {...consultationData} />}
      {view === "availability" && availabilityData && (
        <>
          {availabilityData.loadError && <p className="consultation-error">Consultation availability could not be loaded. Please refresh and try again.</p>}
          {!availabilityData.loadError && <ConsultationAvailabilityManager availability={availabilityData.availability} blockedPeriods={availabilityData.blockedPeriods} />}
        </>
      )}
      {view === "settings" && settingsData && (
        <>
          {settingsData.loadError && <p className="consultation-error">Consultation settings could not be loaded. Please refresh and try again.</p>}
          {!settingsData.loadError && <ConsultationSettingsForm settings={settingsData.settings} />}
        </>
      )}
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
