"use client";

import FullCalendar from "@fullcalendar/react";
import type { DatesSetArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { instrumentOptions } from "@/lib/consultations/constants";
import type { PublicBookingCalendar } from "@/lib/booking/calendars";

type Slot = { endTime: string; startTime: string; timezone: string };
type AvailableDate = { date: string; slots: number };

function dateValue(date: Date) {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateInTimezone(timezone: string, offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "2-digit", timeZone: timezone, year: "numeric" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: timezone }).format(new Date(`${value}T12:00:00Z`));
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value));
}

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

function idempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function typeCopy(type: PublicBookingCalendar["bookingType"]) {
  if (type === "interview") return { eyebrow: "Instructor Opportunity", info: "Choose an interview time and share a little about your teaching background.", person: "Candidate" };
  if (type === "consultation") return { eyebrow: "Student Consultation", info: "Choose a time to discuss the student’s goals and the right instruction path.", person: "Parent or customer" };
  return { eyebrow: "Schedule a Meeting", info: "Choose an available time and tell ORDS what you would like to discuss.", person: "Your" };
}

export function PublicBookingPage({ calendar, embedded = false }: { calendar: PublicBookingCalendar; embedded?: boolean }) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const loadedRange = useRef("");
  const initialDate = useMemo(() => dateInTimezone(calendar.timezone, 1), [calendar.timezone]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ bookingReference: string; startTime: string } | null>(null);
  const [requestKey, setRequestKey] = useState(idempotencyKey);
  const availableDateSet = useMemo(() => new Set(availableDates.map((item) => item.date)), [availableDates]);
  const copy = typeCopy(calendar.bookingType);

  useEffect(() => {
    if (!embedded || window.parent === window) return;
    const sendHeight = () => window.parent.postMessage({ height: document.documentElement.scrollHeight, type: "ords-booking-resize" }, "*");
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.documentElement);
    sendHeight();
    return () => observer.disconnect();
  }, [embedded]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setError("");
    setSelectedStartTime("");
    fetch(`/api/public-booking/${encodeURIComponent(calendar.slug)}/slots?date=${selectedDate}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "Available times could not be loaded.");
        return payload.slots as Slot[];
      })
      .then((nextSlots) => {
        if (cancelled) return;
        setSlots(nextSlots);
        setSelectedStartTime(nextSlots[0]?.startTime ?? "");
      })
      .catch((caught) => {
        if (!cancelled) { setSlots([]); setError(caught instanceof Error ? caught.message : "Available times could not be loaded."); }
      })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [calendar.slug, selectedDate]);

  function loadDates(info: DatesSetArg) {
    const viewDate = info.view.calendar.getDate();
    const startDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 44);
    const start = dateValue(startDate);
    const end = dateValue(endDate);
    const key = `${start}:${end}`;
    if (loadedRange.current === key) return;
    loadedRange.current = key;
    setLoadingDates(true);
    fetch(`/api/public-booking/${encodeURIComponent(calendar.slug)}/dates?start=${start}&end=${end}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "Available dates could not be loaded.");
        return payload.dates as AvailableDate[];
      })
      .then((dates) => {
        setAvailableDates(dates);
        if (dates.length && !dates.some((item) => item.date === selectedDate)) setSelectedDate(dates[0].date);
      })
      .catch((caught) => { setAvailableDates([]); setError(caught instanceof Error ? caught.message : "Available dates could not be loaded."); })
      .finally(() => setLoadingDates(false));
  }

  function chooseDate(info: DateClickArg) {
    const value = dateValue(info.date);
    if (!availableDateSet.has(value)) { setError("No times are available on that date."); return; }
    setSelectedDate(value);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStartTime || submitting) return;
    const form = new FormData(event.currentTarget);
    const responses = calendar.bookingType === "consultation"
      ? { goals: String(form.get("goals") ?? ""), instrumentOrService: String(form.get("instrumentOrService") ?? ""), studentAge: String(form.get("studentAge") ?? "") }
      : calendar.bookingType === "interview"
        ? { availability: String(form.get("availability") ?? ""), experience: String(form.get("experience") ?? ""), position: String(form.get("position") ?? "") }
        : { notes: String(form.get("notes") ?? "") };

    setSubmitting(true);
    setError("");
    setSuccess(null);
    try {
      const response = await fetch(`/api/public-booking/${encodeURIComponent(calendar.slug)}/book`, {
        body: JSON.stringify({
          attendeeName: String(form.get("attendeeName") ?? ""),
          bookerEmail: String(form.get("bookerEmail") ?? ""),
          bookerName: String(form.get("bookerName") ?? ""),
          bookerPhone: String(form.get("bookerPhone") ?? ""),
          honeypot: String(form.get("companyWebsite") ?? ""),
          idempotencyKey: requestKey,
          responses,
          startTime: selectedStartTime,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to complete this booking.");
      setSuccess({ bookingReference: result.bookingReference, startTime: result.startTime });
      setSlots((current) => current.filter((slot) => slot.startTime !== result.startTime));
      setSelectedStartTime("");
      setRequestKey(idempotencyKey());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete this booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`consultation-public-page public-booking-page${embedded ? " consultation-embedded" : ""}`} style={{ "--consultation-accent": calendar.accentColor } as CSSProperties}>
      {!embedded && <section className="consultation-public-hero"><div className="consultation-brand-row"><img alt="ORDS logo" src="https://static.wixstatic.com/media/a51682_27dfdd46028443e7a016d349782ffa8f~mv2.png" /><span>ORDS Music School</span></div><div className="consultation-hero-copy"><span className="eyebrow">{copy.eyebrow}</span><h1>{calendar.name}</h1><p>{calendar.description}</p></div></section>}
      {embedded && <header className="consultation-embed-intro"><div className="consultation-embed-brand"><img alt="ORDS Music School" src="https://static.wixstatic.com/media/a51682_27dfdd46028443e7a016d349782ffa8f~mv2.png" /><div><strong>{calendar.name}</strong><span>ORDS Music School</span></div></div><div className="consultation-embed-facts"><span>{calendar.durationMinutes} minutes</span><span>{calendar.timezone.replace("America/", "")}</span><span>Confirmation by email</span></div></header>}

      <section aria-label={`${calendar.name} booking form`} className="consultation-booking-shell">
        {!embedded && <div className="consultation-panel consultation-info-panel"><h2>Choose a time that works</h2><p>{copy.info}</p><div className="consultation-proof-grid"><span>{calendar.durationMinutes} minutes</span><span>Eastern Time</span><span>Email confirmation</span><span>No payment required</span></div></div>}
        <form className="consultation-panel consultation-form" onSubmit={submit}>
          <input autoComplete="off" className="hp-field" name="companyWebsite" tabIndex={-1} />
          <div className="consultation-step-head"><span>1</span><div><strong>Choose a date and time</strong><small>All times are shown in Eastern Time.</small></div></div>
          <div className="consultation-calendar-layout">
            <div aria-busy={loadingDates} className="consultation-date-calendar"><FullCalendar buttonText={{ today: "Today" }} dateClick={chooseDate} datesSet={loadDates} dayCellClassNames={(info) => { const value = dateValue(info.date); return [availableDateSet.has(value) ? "consultation-day-available" : "consultation-day-unavailable", value === selectedDate ? "consultation-day-selected" : ""].filter(Boolean); }} dayHeaderFormat={{ weekday: "short" }} fixedWeekCount={false} headerToolbar={{ center: "title", end: "next", start: "prev" }} height="auto" initialView="dayGridMonth" plugins={[dayGridPlugin, interactionPlugin]} ref={calendarRef} showNonCurrentDates={false} /></div>
            <div className="consultation-time-panel"><h3>{formatDate(selectedDate, calendar.timezone)}</h3>{loadingSlots ? <p className="consultation-message">Loading available times...</p> : slots.length === 0 ? <p className="consultation-message">No times are available on this date.</p> : <div className="consultation-time-grid">{slots.map((slot) => <button className={selectedStartTime === slot.startTime ? "selected" : ""} key={slot.startTime} onClick={() => setSelectedStartTime(slot.startTime)} type="button">{formatTime(slot.startTime, calendar.timezone)}</button>)}</div>}</div>
          </div>

          <div className="consultation-step-head"><span>2</span><div><strong>{calendar.bookingType === "interview" ? "Tell us about yourself" : "Add your details"}</strong><small>ORDS will use this information to prepare for the meeting.</small></div></div>
          <div className="consultation-field-grid"><label>{copy.person} name<input autoComplete="name" name="bookerName" required /></label>{calendar.bookingType === "consultation" && <label>Student name<input name="attendeeName" required /></label>}</div>
          <div className="consultation-field-grid"><label>Email<input autoComplete="email" name="bookerEmail" required type="email" /></label><label>Phone<input autoComplete="tel" name="bookerPhone" required type="tel" /></label></div>
          {calendar.bookingType === "consultation" && <><div className="consultation-field-grid"><label>Student age <span>optional</span><input max="120" min="0" name="studentAge" type="number" /></label><label>Instrument or service<select defaultValue="" name="instrumentOrService" required><option disabled value="">Select one</option>{instrumentOptions.map((option) => <option key={option}>{option}</option>)}</select></label></div><label>Student goals<textarea maxLength={1200} minLength={5} name="goals" required /></label></>}
          {calendar.bookingType === "interview" && <><div className="consultation-field-grid"><label>Position<select defaultValue="Piano Instructor" name="position" required><option>Piano Instructor</option><option>Drum Instructor</option><option>Guitar Instructor</option><option>Vocal Instructor</option><option>Other Instructor Role</option></select></label><label>General availability<input name="availability" placeholder="Weekday afternoons, Saturdays..." /></label></div><label>Teaching and music experience<textarea maxLength={1200} minLength={5} name="experience" required placeholder="Tell ORDS about your teaching background, instruments, and experience." /></label></>}
          {calendar.bookingType === "general" && <label>What would you like to discuss? <span>optional</span><textarea maxLength={1200} name="notes" /></label>}
          <label className="consultation-acknowledgement"><input required type="checkbox" /> I confirm that the contact information above is accurate.</label>
          {selectedStartTime && <p className="consultation-message">Selected: {formatDateTime(selectedStartTime, calendar.timezone)}</p>}
          {error && <p className="consultation-error" role="alert">{error}</p>}
          {success && <div className="consultation-success" role="status"><strong>Your booking is confirmed.</strong><span>Reference: {success.bookingReference}</span><span>{formatDateTime(success.startTime, calendar.timezone)}</span></div>}
          <button className="consultation-submit" disabled={submitting || loadingSlots || !selectedStartTime} type="submit">{submitting ? "Booking..." : `Confirm ${calendar.name}`}</button>
        </form>
      </section>
    </main>
  );
}

