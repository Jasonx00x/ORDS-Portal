"use client";

import FullCalendar from "@fullcalendar/react";
import type { DatesSetArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, {
  type DateClickArg,
} from "@fullcalendar/interaction";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { instrumentOptions } from "@/lib/consultations/constants";
import {
  defaultConsultationEmbedConfig,
  type ConsultationEmbedConfig,
} from "@/lib/consultations/embed";

type Slot = {
  endTime: string;
  startTime: string;
  timezone: string;
};

type AvailableDate = {
  date: string;
  slots: number;
};

function dateToInputValue(date: Date) {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function easternDateValue(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatEasternTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

function formatEasternDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "America/New_York",
  }).format(new Date(`${isoDate}T12:00:00-04:00`));
}

function formatEasternDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ConsultationBookingPage({
  embedConfig = defaultConsultationEmbedConfig,
  embedded = false,
}: {
  embedConfig?: ConsultationEmbedConfig;
  embedded?: boolean;
}) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const loadedRangeRef = useRef("");
  const initialDate = useMemo(() => easternDateValue(1), []);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ bookingReference: string; startTime: string } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const availableDateSet = useMemo(
    () => new Set(availableDates.map((item) => item.date)),
    [availableDates],
  );

  useEffect(() => {
    if (!embedded || window.parent === window) return;

    const sendHeight = () => {
      window.parent.postMessage({
        height: document.documentElement.scrollHeight,
        type: "ords-booking-resize",
      }, "*");
    };
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.documentElement);
    sendHeight();
    window.addEventListener("load", sendHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", sendHeight);
    };
  }, [embedded]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setError("");
    setSelectedStartTime("");

    fetch(`/api/consultations/slots?date=${selectedDate}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "No consultation times are available.");
        return payload.slots as Slot[];
      })
      .then((nextSlots) => {
        if (cancelled) return;
        setSlots(nextSlots);
        setSelectedStartTime(nextSlots[0]?.startTime ?? "");
      })
      .catch((slotError) => {
        if (cancelled) return;
        setSlots([]);
        setError(slotError instanceof Error ? slotError.message : "No consultation times are available.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  function loadAvailableDates(info: DatesSetArg) {
    const viewDate = info.view.calendar.getDate();
    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lookAheadEnd = new Date(monthStart);
    lookAheadEnd.setDate(lookAheadEnd.getDate() + 44);
    const start = dateToInputValue(monthStart);
    const end = dateToInputValue(lookAheadEnd);
    const rangeKey = `${start}:${end}`;
    if (loadedRangeRef.current === rangeKey) return;
    loadedRangeRef.current = rangeKey;

    setLoadingDates(true);
    fetch(`/api/consultations/dates?start=${start}&end=${end}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "Available dates could not be loaded.");
        return payload.dates as AvailableDate[];
      })
      .then((dates) => {
        setAvailableDates(dates);
        if (dates.length > 0 && !dates.some((item) => item.date === selectedDate)) {
          setSelectedDate(dates[0].date);
        }
        const calendarDate = calendarRef.current?.getApi().getDate();
        const firstDate = dates[0] ? new Date(`${dates[0].date}T12:00:00`) : null;
        if (
          calendarDate &&
          firstDate &&
          (calendarDate.getFullYear() !== firstDate.getFullYear() ||
            calendarDate.getMonth() !== firstDate.getMonth())
        ) {
          calendarRef.current?.getApi().gotoDate(dates[0].date);
        }
      })
      .catch((dateError) => {
        setAvailableDates([]);
        setError(dateError instanceof Error ? dateError.message : "Available dates could not be loaded.");
      })
      .finally(() => setLoadingDates(false));
  }

  function chooseDate(info: DateClickArg) {
    const date = dateToInputValue(info.date);
    if (date < easternDateValue(1) || !availableDateSet.has(date)) {
      setError("No consultation times are available on that date.");
      return;
    }
    setSelectedDate(date);
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const payload = {
      customerEmail: String(form.get("customerEmail") ?? ""),
      customerName: String(form.get("customerName") ?? ""),
      customerPhone: String(form.get("customerPhone") ?? ""),
      honeypot: String(form.get("companyWebsite") ?? ""),
      idempotencyKey,
      instrumentOrService: String(form.get("instrumentOrService") ?? ""),
      musicalGoals: String(form.get("musicalGoals") ?? ""),
      startTime: selectedStartTime,
      studentAge: String(form.get("studentAge") ?? ""),
      studentName: String(form.get("studentName") || form.get("customerName") || ""),
    };

    setSubmitting(true);
    setError("");
    setSuccess(null);

    try {
      const response = await fetch("/api/consultations/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to complete this booking.");

      setSuccess({ bookingReference: result.bookingReference, startTime: result.startTime });
      setIdempotencyKey(createIdempotencyKey());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete this booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className={`consultation-public-page${embedded ? ` consultation-embedded consultation-theme-${embedConfig.theme} consultation-layout-${embedConfig.layout}` : ""}`}
      style={{ "--consultation-accent": embedConfig.accent } as CSSProperties}
    >
      {!embedded && (
        <section className="consultation-public-hero">
          <div className="consultation-brand-row">
            <img src="https://static.wixstatic.com/media/a51682_27dfdd46028443e7a016d349782ffa8f~mv2.png" alt="ORDS logo" />
            <span>ORDS Music School</span>
          </div>
          <div className="consultation-hero-copy">
            <span className="eyebrow">Free Consultation</span>
            <h1>Book Your Free Consultation</h1>
            <p>Choose a time to speak with ORDS about the student’s goals and the right instruction path.</p>
          </div>
        </section>
      )}

      {embedded && embedConfig.showIntro && (
        <header className="consultation-embed-intro">
          <div className="consultation-embed-brand">
            <img src="https://static.wixstatic.com/media/a51682_27dfdd46028443e7a016d349782ffa8f~mv2.png" alt="ORDS Music School" />
            <div>
              <strong>Book a Free Consultation</strong>
              <span>ORDS Music School</span>
            </div>
          </div>
          <div className="consultation-embed-facts">
            <span>30 minutes</span>
            <span>Eastern Time</span>
            <span>No payment required</span>
          </div>
        </header>
      )}

      <section className="consultation-booking-shell" aria-label="Consultation booking form">
        {!embedded && (
          <div className="consultation-panel consultation-info-panel">
            <h2>Start with a conversation</h2>
            <p>A 30-minute consultation helps ORDS understand the student’s goals, experience, schedule needs, and best next step.</p>
            <div className="consultation-proof-grid">
              <span>30 minutes</span>
              <span>Eastern Time</span>
              <span>No payment required</span>
              <span>Enrollment completed by ORDS</span>
            </div>
          </div>
        )}

        <form className="consultation-panel consultation-form" onSubmit={submitBooking}>
          <input autoComplete="off" className="hp-field" name="companyWebsite" tabIndex={-1} />

          <div className="consultation-step-head">
            <span>1</span>
            <div><strong>Choose a date and time</strong><small>All times are shown in Eastern Time.</small></div>
          </div>
          <div className="consultation-calendar-layout">
            <div className="consultation-date-calendar" aria-busy={loadingDates}>
              <FullCalendar
                buttonText={{ today: "Today" }}
                dateClick={chooseDate}
                datesSet={loadAvailableDates}
                dayCellClassNames={(info) => {
                  const date = dateToInputValue(info.date);
                  return [
                    availableDateSet.has(date) ? "consultation-day-available" : "consultation-day-unavailable",
                    date === selectedDate ? "consultation-day-selected" : "",
                  ].filter(Boolean);
                }}
                dayHeaderFormat={{ weekday: "short" }}
                fixedWeekCount={false}
                headerToolbar={{ center: "title", end: "next", start: "prev" }}
                height="auto"
                initialView="dayGridMonth"
                plugins={[dayGridPlugin, interactionPlugin]}
                ref={calendarRef}
                showNonCurrentDates={false}
                validRange={{ start: `${easternDateValue().slice(0, 7)}-01` }}
              />
            </div>
            <div className="consultation-time-panel">
              <h3>{formatEasternDate(selectedDate)}</h3>
              {loadingSlots ? (
                <p className="consultation-message">Loading available times...</p>
              ) : slots.length === 0 ? (
                <p className="consultation-message">No times are available on this date.</p>
              ) : (
                <div className="consultation-time-grid">
                  {slots.map((slot) => (
                    <button
                      className={selectedStartTime === slot.startTime ? "selected" : ""}
                      key={slot.startTime}
                      onClick={() => setSelectedStartTime(slot.startTime)}
                      type="button"
                    >
                      {formatEasternTime(slot.startTime)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="consultation-step-head">
            <span>2</span>
            <div><strong>Tell us about the student</strong><small>ORDS will use these details to prepare for the consultation.</small></div>
          </div>
          <div className="consultation-field-grid">
            <label>Parent or customer name<input autoComplete="name" name="customerName" required /></label>
            <label>Student name<input autoComplete="off" name="studentName" required /></label>
          </div>
          <div className="consultation-field-grid">
            <label>Email<input autoComplete="email" name="customerEmail" required type="email" /></label>
            <label>Phone<input autoComplete="tel" name="customerPhone" required type="tel" /></label>
          </div>
          <div className="consultation-field-grid">
            <label>Student age <span>optional</span><input inputMode="numeric" name="studentAge" type="number" min="0" max="120" /></label>
            <label>
              Instrument or service
              <select name="instrumentOrService" required defaultValue="">
                <option value="" disabled>Select one</option>
                {instrumentOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <label>Musical goals<textarea name="musicalGoals" required minLength={5} maxLength={1200} placeholder="What would the student like to learn or improve?" /></label>
          <label className="consultation-acknowledgement">
            <input required type="checkbox" /> I understand this is a free consultation and enrollment is completed separately by ORDS.
          </label>

          {selectedStartTime && <p className="consultation-message">Selected: {formatEasternDateTime(selectedStartTime)} Eastern Time</p>}
          {error && <p className="consultation-error" role="alert">{error}</p>}
          {success && (
            <div className="consultation-success" role="status">
              <strong>Consultation booked.</strong>
              <span>Reference: {success.bookingReference}</span>
              <span>{formatEasternDateTime(success.startTime)} Eastern Time</span>
            </div>
          )}

          <button className="consultation-submit" disabled={submitting || loadingSlots || !selectedStartTime} type="submit">
            {submitting ? "Booking..." : "Confirm Free Consultation"}
          </button>
        </form>
      </section>
    </main>
  );
}
