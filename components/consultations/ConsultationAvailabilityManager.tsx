"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addConsultationAvailabilityAction,
  addConsultationBlockedPeriodAction,
  deleteConsultationAvailabilityAction,
  deleteConsultationBlockedPeriodAction,
  type ConsultationAdminActionResult,
} from "@/app/admin/consultations/actions";
import type { ConsultationAvailabilityWindow, ConsultationBlockedPeriod } from "@/lib/consultations/admin-data";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(value: string) {
  const [hour = "0", minute = "00"] = value.split(":");
  return new Date(2026, 0, 1, Number(hour), Number(minute)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export function ConsultationAvailabilityManager({
  availability,
  blockedPeriods,
}: {
  availability: ConsultationAvailabilityWindow[];
  blockedPeriods: ConsultationBlockedPeriod[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function run(action: () => Promise<ConsultationAdminActionResult>, form?: HTMLFormElement) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok) {
        form?.reset();
        router.refresh();
      }
    });
  }

  function addAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run(() => addConsultationAvailabilityAction({
      dayOfWeek: Number(values.get("dayOfWeek")),
      endTime: String(values.get("endTime") ?? ""),
      startTime: String(values.get("startTime") ?? ""),
    }), form);
  }

  function addBlockedPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run(() => addConsultationBlockedPeriodAction({
      endDate: String(values.get("endDate") ?? ""),
      reason: String(values.get("reason") ?? ""),
      startDate: String(values.get("startDate") ?? ""),
    }), form);
  }

  return (
    <>
      {message && <p aria-live="polite" className="consultation-admin-message">{message}</p>}
      <div className="portal-grid consultation-control-grid">
      <section className="portal-panel">
        <div className="panel-kicker">Weekly Availability</div>
        <h3>Consultation hours</h3>
        <p className="consultation-control-copy">Add the recurring windows that should appear on the public consultation calendar.</p>
        <form className="consultation-admin-form" onSubmit={addAvailability}>
          <label className="portal-field">Day<select defaultValue="1" name="dayOfWeek">{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label className="portal-field">Starts<input defaultValue="10:00" name="startTime" required type="time" /></label>
          <label className="portal-field">Ends<input defaultValue="14:00" name="endTime" required type="time" /></label>
          <button className="inline-btn" disabled={isPending} type="submit">Add Hours</button>
        </form>
        {availability.length === 0 ? <div className="booking-empty">No consultation hours are active.</div> : (
          <div className="booking-record-list consultation-rule-list">
            {availability.map((window) => (
              <div className="booking-record" key={window.id}>
                <div><strong>{dayNames[window.dayOfWeek]}</strong><span>{formatTime(window.startTime)} - {formatTime(window.endTime)}</span></div>
                <button aria-label={`Remove ${dayNames[window.dayOfWeek]} availability`} className="booking-icon-button" disabled={isPending} onClick={() => run(() => deleteConsultationAvailabilityAction(window.id))} title="Remove availability" type="button">X</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="portal-panel">
        <div className="panel-kicker">Calendar Blocks</div>
        <h3>Holidays and vacation days</h3>
        <p className="consultation-control-copy">A blocked period overrides the weekly hours and removes every included date from public booking.</p>
        <form className="consultation-admin-form" onSubmit={addBlockedPeriod}>
          <label className="portal-field">Start date<input name="startDate" required type="date" /></label>
          <label className="portal-field">End date<input name="endDate" required type="date" /></label>
          <label className="portal-field consultation-form-wide">Reason<input name="reason" placeholder="Holiday, vacation, or academy closure" required /></label>
          <button className="inline-btn" disabled={isPending} type="submit">Block Dates</button>
        </form>
        {blockedPeriods.length === 0 ? <div className="booking-empty">No holidays or vacation dates are blocked.</div> : (
          <div className="booking-record-list consultation-rule-list">
            {blockedPeriods.map((period) => (
              <div className="booking-record" key={period.id}>
                <div><strong>{period.reason}</strong><span>{formatDate(period.startDate)}{period.endDate === period.startDate ? "" : ` - ${formatDate(period.endDate)}`}</span></div>
                <button aria-label={`Remove ${period.reason} block`} className="booking-icon-button" disabled={isPending} onClick={() => run(() => deleteConsultationBlockedPeriodAction(period.id))} title="Remove blocked period" type="button">X</button>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </>
  );
}
