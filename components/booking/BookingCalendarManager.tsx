"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, CalendarDays, Copy, ExternalLink, Settings2, Trash2, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  addCalendarAvailabilityAction,
  addCalendarBlockAction,
  deleteCalendarAvailabilityAction,
  deleteCalendarBlockAction,
  updateBookingCalendarAction,
  type CalendarActionResult,
} from "@/app/booking/calendars/actions";
import { BookingPageLayout } from "@/components/booking/BookingSectionNav";
import type { BookingCalendarDetail } from "@/lib/booking/calendars";
import type { Role } from "@/lib/roles";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type CalendarManagerView = "availability" | "bookings" | "settings";

function formatTime(value: string) {
  const [hour = "0", minute = "00"] = value.split(":");
  return new Date(2026, 0, 1, Number(hour), Number(minute)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

function bookingTypeLabel(type: BookingCalendarDetail["bookingType"]) {
  if (type === "interview") return "Hiring interview";
  if (type === "consultation") return "Student consultation";
  return "General meeting";
}

export function BookingCalendarManager({
  calendar,
  publicBaseUrl,
  role,
  view,
}: {
  calendar: BookingCalendarDetail;
  publicBaseUrl: string;
  role: Role;
  view: CalendarManagerView;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookingsEnabled, setBookingsEnabled] = useState(calendar.bookingsEnabled);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const publicUrl = `${publicBaseUrl}/book/${calendar.slug}`;

  function run(action: () => Promise<CalendarActionResult>, reset?: () => void) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok) {
        reset?.();
        router.refresh();
      }
    });
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    run(() => updateBookingCalendarAction({
      accentColor: String(values.get("accentColor") ?? "#b58a45"),
      bookingsEnabled,
      calendarId: calendar.id,
      description: String(values.get("description") ?? ""),
      durationMinutes: Number(values.get("durationMinutes")),
      locationOrMeetingDetails: String(values.get("locationOrMeetingDetails") ?? ""),
      maximumAdvanceDays: Number(values.get("maximumAdvanceDays")),
      minimumNoticeHours: Number(values.get("minimumNoticeHours")),
      name: String(values.get("name") ?? ""),
      slug: String(values.get("slug") ?? ""),
    }));
  }

  function addAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run(() => addCalendarAvailabilityAction({
      calendarId: calendar.id,
      dayOfWeek: Number(values.get("dayOfWeek")),
      endTime: String(values.get("endTime") ?? ""),
      startTime: String(values.get("startTime") ?? ""),
    }), () => form.reset());
  }

  function addBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run(() => addCalendarBlockAction({
      calendarId: calendar.id,
      endDate: String(values.get("endDate") ?? ""),
      reason: String(values.get("reason") ?? ""),
      startDate: String(values.get("startDate") ?? ""),
    }), () => form.reset());
  }

  async function copyPublicLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const basePath = `/booking/calendars/${calendar.id}`;

  return (
    <BookingPageLayout role={role}>
      <header className="booking-calendar-manager-head" style={{ borderColor: calendar.accentColor }}>
        <div>
          <span className="panel-kicker">{bookingTypeLabel(calendar.bookingType)}</span>
          <h2>{calendar.name}</h2>
          <p>{calendar.description}</p>
        </div>
        <div className="booking-calendar-manager-actions">
          <span className={`booking-calendar-state ${calendar.bookingsEnabled ? "live" : "paused"}`}>{calendar.bookingsEnabled ? "Live" : "Paused"}</span>
          <a className="inline-btn ghost-btn icon-text-btn" href={publicUrl} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" size={17} />Open Public Page</a>
        </div>
      </header>

      <nav aria-label="Calendar management" className="booking-calendar-tabs">
        <Link className={view === "settings" ? "active" : ""} href={basePath}><Settings2 aria-hidden="true" size={17} />Settings</Link>
        <Link className={view === "availability" ? "active" : ""} href={`${basePath}/availability`}><CalendarClock aria-hidden="true" size={17} />Availability</Link>
        <Link className={view === "bookings" ? "active" : ""} href={`${basePath}/bookings`}><UsersRound aria-hidden="true" size={17} />Bookings</Link>
      </nav>

      {message && <p aria-live="polite" className={message.includes("could not") || message.includes("valid") || message.includes("required") ? "consultation-error" : "consultation-admin-message"}>{message}</p>}

      {view === "settings" && (
        <div className="portal-grid booking-calendar-settings-layout">
          <section className="portal-panel">
            <div className="panel-kicker">Calendar Settings</div><h3>Public details and rules</h3>
            <form className="booking-calendar-settings-form" onSubmit={saveSettings}>
              <label className="booking-embed-toggle consultation-booking-toggle"><input checked={bookingsEnabled} onChange={(event) => setBookingsEnabled(event.target.checked)} type="checkbox" /><span><strong>Accept public bookings</strong><small>Pause this calendar without deleting its hours or records.</small></span></label>
              <div className="booking-calendar-form-grid">
                <label className="portal-field">Calendar name<input defaultValue={calendar.name} name="name" required /></label>
                <label className="portal-field">Public URL<span className="booking-slug-input"><span>/book/</span><input aria-label="Public URL slug" defaultValue={calendar.slug} name="slug" required /></span></label>
                <label className="portal-field booking-form-wide">Description<textarea defaultValue={calendar.description} name="description" required rows={3} /></label>
                <label className="portal-field booking-form-wide">Location or meeting details<textarea defaultValue={calendar.locationOrMeetingDetails} name="locationOrMeetingDetails" required rows={3} /></label>
                <label className="portal-field">Duration<select defaultValue={String(calendar.durationMinutes)} name="durationMinutes"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label>
                <label className="portal-field">Minimum notice<input defaultValue={calendar.minimumNoticeHours} max="720" min="0" name="minimumNoticeHours" required type="number" /></label>
                <label className="portal-field">Booking window<input defaultValue={calendar.maximumAdvanceDays} max="365" min="1" name="maximumAdvanceDays" required type="number" /></label>
                <label className="portal-field">Accent color<input defaultValue={calendar.accentColor} name="accentColor" type="color" /></label>
              </div>
              <button className="inline-btn" disabled={isPending} type="submit">{isPending ? "Saving..." : "Save Settings"}</button>
            </form>
          </section>
          <aside className="portal-panel booking-share-card">
            <div className="panel-kicker">Publish</div><h3>Public booking link</h3><p>Share this link in ads, email, social posts, or the ORDS website.</p>
            <div className="booking-public-link-row"><span>{publicUrl}</span><button aria-label="Copy public link" onClick={copyPublicLink} title="Copy public link" type="button"><Copy aria-hidden="true" size={17} /></button></div>
            {copied && <small className="booking-copy-note" role="status">Link copied</small>}
            <div className="booking-share-facts"><span><CalendarDays aria-hidden="true" size={17} />{calendar.durationMinutes} minutes</span><span><UsersRound aria-hidden="true" size={17} />{calendar.upcomingBookings} upcoming</span></div>
          </aside>
        </div>
      )}

      {view === "availability" && (
        <div className="portal-grid booking-calendar-availability-layout">
          <section className="portal-panel">
            <div className="panel-kicker">Weekly Hours</div><h3>Times people can book</h3><p>Add one or more windows for each available day.</p>
            <form className="booking-calendar-availability-form" onSubmit={addAvailability}>
              <label className="portal-field">Day<select defaultValue="1" name="dayOfWeek">{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
              <label className="portal-field">Starts<input defaultValue="09:00" name="startTime" required type="time" /></label>
              <label className="portal-field">Ends<input defaultValue="17:00" name="endTime" required type="time" /></label>
              <button className="inline-btn" disabled={isPending} type="submit">Add Hours</button>
            </form>
            {calendar.availability.length === 0 ? <div className="booking-empty">No public hours yet. This calendar will not show bookable times until hours are added.</div> : (
              <div className="booking-record-list">{calendar.availability.map((window) => (
                <div className="booking-record" key={window.id}><div><strong>{dayNames[window.dayOfWeek]}</strong><span>{formatTime(window.startTime)} - {formatTime(window.endTime)}</span></div><button aria-label={`Remove ${dayNames[window.dayOfWeek]} hours`} className="booking-icon-button" disabled={isPending} onClick={() => run(() => deleteCalendarAvailabilityAction(calendar.id, window.id))} title="Remove hours" type="button"><Trash2 aria-hidden="true" size={17} /></button></div>
              ))}</div>
            )}
          </section>
          <section className="portal-panel">
            <div className="panel-kicker">Blackout Dates</div><h3>Holidays, vacations, and closures</h3><p>Blocked dates override the weekly hours above.</p>
            <form className="booking-calendar-block-form" onSubmit={addBlock}>
              <label className="portal-field">Start date<input name="startDate" required type="date" /></label>
              <label className="portal-field">End date<input name="endDate" required type="date" /></label>
              <label className="portal-field booking-form-wide">Reason<input name="reason" placeholder="Holiday, vacation, or unavailable" required /></label>
              <button className="inline-btn" disabled={isPending} type="submit">Block Dates</button>
            </form>
            {calendar.blocks.length === 0 ? <div className="booking-empty">No dates are blocked.</div> : (
              <div className="booking-record-list">{calendar.blocks.map((block) => (
                <div className="booking-record" key={block.id}><div><strong>{block.reason}</strong><span>{formatDate(block.startDate)}{block.endDate === block.startDate ? "" : ` - ${formatDate(block.endDate)}`}</span></div><button aria-label={`Remove ${block.reason}`} className="booking-icon-button" disabled={isPending} onClick={() => run(() => deleteCalendarBlockAction(calendar.id, block.id))} title="Remove blocked dates" type="button"><Trash2 aria-hidden="true" size={17} /></button></div>
              ))}</div>
            )}
          </section>
        </div>
      )}

      {view === "bookings" && (
        <section className="portal-panel">
          <div className="portal-panel-head"><div><div className="panel-kicker">Booking Records</div><h3>{calendar.bookings.length} recent bookings</h3></div></div>
          {calendar.bookings.length === 0 ? <div className="booking-calendar-empty-state compact"><UsersRound aria-hidden="true" size={25} /><strong>No bookings yet</strong><span>Confirmed public bookings will appear here with contact details and appointment status.</span></div> : (
            <div className="ops-table booking-calendar-records"><div className="table-head"><span>Person</span><span>Contact</span><span>Appointment</span><span>Status</span></div>{calendar.bookings.map((booking) => <div key={booking.id}><div><strong>{booking.bookerName}</strong><span>{booking.attendeeName || booking.bookingReference}</span></div><div><strong>{booking.bookerEmail}</strong><span>{booking.bookerPhone}</span></div><div><strong>{formatDateTime(booking.startTime, calendar.timezone)}</strong><span>{booking.bookingReference}</span></div><span className={`booking-status status-${booking.status}`}>{booking.status.replaceAll("_", " ")}</span></div>)}</div>
          )}
        </section>
      )}
    </BookingPageLayout>
  );
}

