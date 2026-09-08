"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveConsultationSettingsAction } from "@/app/admin/consultations/actions";
import type { ConsultationSettings } from "@/lib/consultations/admin-data";

export function ConsultationSettingsForm({ settings }: { settings: ConsultationSettings }) {
  const router = useRouter();
  const [bookingsEnabled, setBookingsEnabled] = useState(settings.bookingsEnabled);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveConsultationSettingsAction({
        bookingsEnabled,
        durationMinutes: Number(values.get("durationMinutes")),
        locationOrMeetingDetails: String(values.get("locationOrMeetingDetails") ?? ""),
        maximumAdvanceDays: Number(values.get("maximumAdvanceDays")),
        minimumNoticeHours: Number(values.get("minimumNoticeHours")),
      });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      {message && <p aria-live="polite" className="consultation-admin-message">{message}</p>}
      <div className="portal-grid consultation-control-grid">
      <section className="portal-panel">
        <div className="panel-kicker">Booking Rules</div>
        <h3>Public calendar settings</h3>
        <form className="consultation-settings-form" onSubmit={submit}>
          <label className="booking-embed-toggle consultation-booking-toggle">
            <input checked={bookingsEnabled} onChange={(event) => setBookingsEnabled(event.target.checked)} type="checkbox" />
            <span><strong>Accept consultation bookings</strong><small>Turn this off to pause the public calendar without deleting availability.</small></span>
          </label>
          <div className="consultation-settings-grid">
            <label className="portal-field">Duration<select defaultValue={String(settings.durationMinutes)} name="durationMinutes"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></label>
            <label className="portal-field">Minimum notice<input defaultValue={settings.minimumNoticeHours} max="720" min="0" name="minimumNoticeHours" required type="number" /><small>Hours before someone can book</small></label>
            <label className="portal-field">Booking window<input defaultValue={settings.maximumAdvanceDays} max="365" min="1" name="maximumAdvanceDays" required type="number" /><small>Days visible in advance</small></label>
          </div>
          <label className="portal-field">Consultation details<textarea defaultValue={settings.locationOrMeetingDetails} name="locationOrMeetingDetails" required rows={4} /></label>
          <button className="inline-btn" disabled={isPending} type="submit">{isPending ? "Saving..." : "Save Consultation Settings"}</button>
        </form>
      </section>
      <section className="portal-panel consultation-reminder-status">
        <div className="panel-kicker">Automatic Reminders</div>
        <h3>Two-hour reminders</h3>
        <div className="consultation-status-line"><span aria-hidden="true">OK</span><div><strong>Customer reminder</strong><small>Sent approximately two hours before each confirmed consultation.</small></div></div>
        <div className="consultation-status-line"><span aria-hidden="true">OK</span><div><strong>ORDS operations reminders</strong><small>Sent separately to both configured administrator recipients.</small></div></div>
        <p>Reminder delivery is tracked per recipient so failed attempts can retry without duplicating successful emails.</p>
      </section>
      </div>
    </>
  );
}
