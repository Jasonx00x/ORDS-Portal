"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBookingCalendarAction } from "@/app/booking/calendars/actions";
import { BookingPageLayout } from "@/components/booking/BookingSectionNav";
import type { BookingCalendarType } from "@/lib/booking/calendars";
import type { Role } from "@/lib/roles";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const templates: Record<BookingCalendarType, { description: string; location: string; name: string }> = {
  consultation: {
    description: "Choose a time to discuss the student’s goals, schedule, and best next step with ORDS.",
    location: "ORDS Music School will confirm the consultation location or call details by email.",
    name: "Free Student Consultation",
  },
  general: {
    description: "Choose an available time to meet with the ORDS team.",
    location: "ORDS Music School will confirm the meeting details by email.",
    name: "Meet with ORDS",
  },
  interview: {
    description: "Choose an available interview time to speak with ORDS about the instructor opportunity.",
    location: "ORDS Music School will confirm the interview location or video call details by email.",
    name: "Instructor Interview",
  },
};

export function BookingCalendarCreateForm({ role }: { role: Role }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookingType, setBookingType] = useState<BookingCalendarType>("interview");
  const [name, setName] = useState(templates.interview.name);
  const [slug, setSlug] = useState(slugify(templates.interview.name));
  const [slugTouched, setSlugTouched] = useState(false);
  const [message, setMessage] = useState("");
  const template = useMemo(() => templates[bookingType], [bookingType]);

  function chooseType(nextType: BookingCalendarType) {
    setBookingType(nextType);
    setName(templates[nextType].name);
    if (!slugTouched) setSlug(slugify(templates[nextType].name));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createBookingCalendarAction({
        accentColor: String(form.get("accentColor") ?? "#b58a45"),
        bookingType,
        description: String(form.get("description") ?? ""),
        durationMinutes: Number(form.get("durationMinutes")),
        locationOrMeetingDetails: String(form.get("locationOrMeetingDetails") ?? ""),
        maximumAdvanceDays: Number(form.get("maximumAdvanceDays")),
        minimumNoticeHours: Number(form.get("minimumNoticeHours")),
        name,
        slug,
      });
      setMessage(result.message);
      if (result.ok && result.calendarId) router.push(`/booking/calendars/${result.calendarId}/availability`);
    });
  }

  return (
    <BookingPageLayout role={role}>
      <header className="booking-view-header booking-view-header-action">
        <div><span className="panel-kicker">New Public Calendar</span><h2>Create a booking experience</h2><p>Choose a purpose, define the public details, then add the hours people can book.</p></div>
        <Link className="inline-btn ghost-btn icon-text-btn" href="/booking/calendars"><ArrowLeft aria-hidden="true" size={18} />All Calendars</Link>
      </header>

      <form className="booking-calendar-create-layout" onSubmit={submit}>
        <section className="portal-panel booking-calendar-form-section">
          <div className="panel-kicker">1 · Meeting Type</div>
          <h3>What should people book?</h3>
          <div className="booking-type-options">
            {([
              ["interview", "Hiring interview", "For applicants and instructor candidates"],
              ["consultation", "Student consultation", "For prospective students and families"],
              ["general", "General meeting", "For any other appointment"],
            ] as const).map(([value, label, detail]) => (
              <label className={bookingType === value ? "selected" : ""} key={value}>
                <input checked={bookingType === value} name="bookingType" onChange={() => chooseType(value)} type="radio" value={value} />
                <span><strong>{label}</strong><small>{detail}</small></span>
              </label>
            ))}
          </div>
        </section>

        <section className="portal-panel booking-calendar-form-section">
          <div className="panel-kicker">2 · Public Details</div>
          <h3>Name and booking link</h3>
          <div className="booking-calendar-form-grid">
            <label className="portal-field">Calendar name<input name="name" onChange={(event) => { setName(event.target.value); if (!slugTouched) setSlug(slugify(event.target.value)); }} required value={name} /></label>
            <label className="portal-field">Public URL<span className="booking-slug-input"><span>/book/</span><input aria-label="Public URL slug" name="slug" onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} required value={slug} /></span></label>
            <label className="portal-field booking-form-wide">Description<textarea defaultValue={template.description} key={`${bookingType}-description`} name="description" required rows={3} /></label>
            <label className="portal-field booking-form-wide">Location or meeting details<textarea defaultValue={template.location} key={`${bookingType}-location`} name="locationOrMeetingDetails" required rows={3} /></label>
          </div>
        </section>

        <section className="portal-panel booking-calendar-form-section">
          <div className="panel-kicker">3 · Booking Rules</div>
          <h3>Duration and notice</h3>
          <div className="booking-calendar-form-grid booking-calendar-rules-grid">
            <label className="portal-field">Duration<select defaultValue="30" name="durationMinutes"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label>
            <label className="portal-field">Minimum notice<input defaultValue="24" max="720" min="0" name="minimumNoticeHours" required type="number" /><small>Hours before a time can be booked</small></label>
            <label className="portal-field">Booking window<input defaultValue="30" max="365" min="1" name="maximumAdvanceDays" required type="number" /><small>Days people can see in advance</small></label>
            <label className="portal-field">Accent color<input defaultValue="#b58a45" name="accentColor" type="color" /></label>
          </div>
        </section>

        {message && <p className={message.includes("created") ? "consultation-admin-message" : "consultation-error"} role="status">{message}</p>}
        <div className="booking-form-footer"><Link className="inline-btn ghost-btn" href="/booking/calendars">Cancel</Link><button className="inline-btn icon-text-btn" disabled={isPending} type="submit"><CalendarPlus aria-hidden="true" size={18} />{isPending ? "Creating..." : "Create Calendar"}</button></div>
      </form>
    </BookingPageLayout>
  );
}

