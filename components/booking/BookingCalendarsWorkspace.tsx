"use client";

import Link from "next/link";
import { CalendarPlus, CalendarRange, Clock3, Copy, ExternalLink, Settings2, UsersRound } from "lucide-react";
import { useState } from "react";
import { BookingPageLayout } from "@/components/booking/BookingSectionNav";
import type { BookingCalendarSummary } from "@/lib/booking/calendars";
import type { Role } from "@/lib/roles";

function typeLabel(type: BookingCalendarSummary["bookingType"]) {
  if (type === "interview") return "Hiring interview";
  if (type === "consultation") return "Student consultation";
  return "General meeting";
}

export function BookingCalendarsWorkspace({
  calendars,
  loadError,
  publicBaseUrl,
  role,
}: {
  calendars: BookingCalendarSummary[];
  loadError: string;
  publicBaseUrl: string;
  role: Role;
}) {
  const [copied, setCopied] = useState("");

  async function copyLink(slug: string) {
    const url = `${publicBaseUrl}/book/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(slug);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <BookingPageLayout role={role}>
      <header className="booking-view-header booking-view-header-action">
        <div>
          <span className="panel-kicker">Public Calendars</span>
          <h2>Booking links for every meeting type</h2>
          <p>Create separate calendars for consultations, interviews, or other meetings. Each one has its own public link, availability, and booking records.</p>
        </div>
        <Link className="inline-btn icon-text-btn" href="/booking/calendars/new"><CalendarPlus aria-hidden="true" size={18} />Create Calendar</Link>
      </header>

      {loadError && <p className="consultation-error">Calendars could not be loaded. Refresh and try again.</p>}
      {!loadError && calendars.length === 0 && (
        <section className="portal-panel booking-calendar-empty-state">
          <span className="booking-calendar-empty-icon"><CalendarRange aria-hidden="true" size={28} /></span>
          <h3>Create the first public booking calendar</h3>
          <p>Start with a student consultation, hiring interview, or general meeting. You can publish the link after weekly hours are added.</p>
          <Link className="inline-btn icon-text-btn" href="/booking/calendars/new"><CalendarPlus aria-hidden="true" size={18} />Create Calendar</Link>
        </section>
      )}

      <section className="booking-calendar-card-grid">
        {calendars.map((calendar) => {
          const publicUrl = `${publicBaseUrl}/book/${calendar.slug}`;
          return (
            <article className="portal-panel booking-calendar-card" key={calendar.id} style={{ borderTopColor: calendar.accentColor }}>
              <div className="booking-calendar-card-head">
                <span className="booking-calendar-type"><CalendarRange aria-hidden="true" size={17} />{typeLabel(calendar.bookingType)}</span>
                <span className={`booking-calendar-state ${calendar.bookingsEnabled ? "live" : "paused"}`}>{calendar.bookingsEnabled ? "Live" : "Paused"}</span>
              </div>
              <h3>{calendar.name}</h3>
              <p>{calendar.description}</p>
              <div className="booking-calendar-facts">
                <span><Clock3 aria-hidden="true" size={16} />{calendar.durationMinutes} minutes</span>
                <span><UsersRound aria-hidden="true" size={16} />{calendar.upcomingBookings} upcoming</span>
              </div>
              <div className="booking-public-link-row">
                <span>{publicUrl.replace(/^https?:\/\//, "")}</span>
                <button aria-label={`Copy ${calendar.name} public link`} onClick={() => copyLink(calendar.slug)} title="Copy public link" type="button"><Copy aria-hidden="true" size={17} /></button>
              </div>
              {copied === calendar.slug && <small className="booking-copy-note" role="status">Link copied</small>}
              <div className="booking-calendar-actions">
                <Link className="inline-btn icon-text-btn" href={`/booking/calendars/${calendar.id}`}><Settings2 aria-hidden="true" size={17} />Manage</Link>
                <a className="inline-btn ghost-btn icon-text-btn" href={publicUrl} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" size={17} />Open</a>
              </div>
            </article>
          );
        })}
      </section>
    </BookingPageLayout>
  );
}

