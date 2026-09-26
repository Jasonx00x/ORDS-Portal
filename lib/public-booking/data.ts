import { callSupabaseRpc } from "@/lib/consultations/supabase-rest";
import type { PublicBookingCalendar } from "@/lib/booking/calendars";

type PublicCalendarRow = {
  accent_color: string;
  booking_type: PublicBookingCalendar["bookingType"];
  bookings_enabled: boolean;
  description: string;
  duration_minutes: number;
  id: string;
  location_or_meeting_details: string;
  maximum_advance_days: number;
  minimum_notice_hours: number;
  name: string;
  slug: string;
  timezone: string;
};

export async function loadPublicBookingCalendar(slug: string) {
  const { data, error } = await callSupabaseRpc<PublicCalendarRow[]>(
    "get_public_booking_calendar",
    { p_slug: slug },
    { useServiceRole: true },
  );
  const row = data?.[0];
  if (error || !row) return null;

  return {
    accentColor: row.accent_color,
    bookingType: row.booking_type,
    bookingsEnabled: row.bookings_enabled,
    description: row.description,
    durationMinutes: row.duration_minutes,
    id: row.id,
    locationOrMeetingDetails: row.location_or_meeting_details,
    maximumAdvanceDays: row.maximum_advance_days,
    minimumNoticeHours: row.minimum_notice_hours,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
  } satisfies PublicBookingCalendar;
}

