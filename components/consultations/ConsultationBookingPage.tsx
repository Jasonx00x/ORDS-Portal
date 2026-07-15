"use client";

import { useEffect, useMemo, useState } from "react";
import { instrumentOptions } from "@/lib/consultations/constants";

type Slot = {
  endTime: string;
  startTime: string;
  timezone: string;
};

function dateToInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatEasternTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(iso));
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

export function ConsultationBookingPage() {
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return dateToInputValue(date);
  }, []);

  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ bookingReference: string; startTime: string } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setError("");
    setSelectedStartTime("");

    fetch(`/api/consultations/slots?date=${selectedDate}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "No consultation times are available for this date.");
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
        setError(slotError instanceof Error ? slotError.message : "No consultation times are available for this date.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

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
    <main className="consultation-public-page">
      <section className="consultation-public-hero">
        <div className="consultation-brand-row">
          <img src="https://static.wixstatic.com/media/a51682_27dfdd46028443e7a016d349782ffa8f~mv2.png" alt="ORDS logo" />
          <span>ORDS Music School</span>
        </div>
        <div className="consultation-hero-copy">
          <span className="eyebrow">Free Consultation</span>
          <h1>Book Your Free 30-Minute Consultation</h1>
          <p>
            Tell us about the student’s goals, choose an available Eastern Time slot, and ORDS will recommend the right instruction path.
          </p>
        </div>
      </section>

      <section className="consultation-booking-shell" aria-label="Consultation booking form">
        <div className="consultation-panel consultation-info-panel">
          <h2>What to expect</h2>
          <p>A short conversation helps ORDS understand the student’s musical goals, experience level, schedule needs, and best next step.</p>
          <div className="consultation-proof-grid">
            <span>30 minutes</span>
            <span>Eastern Time</span>
            <span>No payment required</span>
            <span>Faith-aligned music academy</span>
          </div>
        </div>

        <form className="consultation-panel consultation-form" onSubmit={submitBooking}>
          <input autoComplete="off" className="hp-field" name="companyWebsite" tabIndex={-1} />

          <div className="consultation-field-grid">
            <label>
              Available date
              <input name="date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
            <label>
              Available time
              <select disabled={loadingSlots || slots.length === 0} value={selectedStartTime} onChange={(event) => setSelectedStartTime(event.target.value)}>
                {loadingSlots && <option>Loading times...</option>}
                {!loadingSlots && slots.length === 0 && <option>No times available</option>}
                {!loadingSlots && slots.map((slot) => <option key={slot.startTime} value={slot.startTime}>{formatEasternTime(slot.startTime)} Eastern</option>)}
              </select>
            </label>
          </div>

          {!loadingSlots && slots.length === 0 && <p className="consultation-message">No consultation times are available for this date.</p>}

          <div className="consultation-field-grid">
            <label>
              Parent or customer name
              <input autoComplete="name" name="customerName" required />
            </label>
            <label>
              Student name
              <input autoComplete="off" name="studentName" required />
            </label>
          </div>

          <div className="consultation-field-grid">
            <label>
              Email
              <input autoComplete="email" name="customerEmail" required type="email" />
            </label>
            <label>
              Phone
              <input autoComplete="tel" name="customerPhone" required type="tel" />
            </label>
          </div>

          <div className="consultation-field-grid">
            <label>
              Student age <span>optional</span>
              <input inputMode="numeric" name="studentAge" type="number" min="0" max="120" />
            </label>
            <label>
              Instrument or service
              <select name="instrumentOrService" required defaultValue="">
                <option value="" disabled>Select one</option>
                {instrumentOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <label>
            Musical goals
            <textarea name="musicalGoals" required minLength={5} maxLength={1200} placeholder="Tell us what the student wants to learn, improve, or prepare for." />
          </label>

          <label className="consultation-acknowledgement">
            <input required type="checkbox" /> I understand this is a free 30-minute consultation and ORDS will confirm details by email.
          </label>

          {selectedStartTime && <p className="consultation-message">Selected time: {formatEasternDateTime(selectedStartTime)} Eastern Time</p>}
          {error && <p className="consultation-error" role="alert">{error}</p>}
          {success && (
            <div className="consultation-success" role="status">
              <strong>Consultation booked.</strong>
              <span>Reference: {success.bookingReference}</span>
              <span>{formatEasternDateTime(success.startTime)} Eastern Time</span>
            </div>
          )}

          <button className="consultation-submit" disabled={submitting || loadingSlots || !selectedStartTime} type="submit">
            {submitting ? "Booking..." : "Book Your Free Consultation"}
          </button>
        </form>
      </section>
    </main>
  );
}
