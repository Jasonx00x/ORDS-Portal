import { createClient } from "@/lib/supabase/server";

export type BookingCalendarType = "consultation" | "general" | "interview";

export type BookingCalendarSummary = {
  accentColor: string;
  bookingType: BookingCalendarType;
  bookingsEnabled: boolean;
  description: string;
  durationMinutes: number;
  id: string;
  name: string;
  ownerProfileId: string;
  slug: string;
  upcomingBookings: number;
};

export type BookingCalendarAvailability = {
  dayOfWeek: number;
  endTime: string;
  id: string;
  isEnabled: boolean;
  startTime: string;
};

export type BookingCalendarBlock = {
  endDate: string;
  id: string;
  reason: string;
  startDate: string;
};

export type CalendarBookingRecord = {
  attendeeName: string;
  bookerEmail: string;
  bookerName: string;
  bookerPhone: string;
  bookingReference: string;
  createdAt: string;
  id: string;
  responses: Record<string, unknown>;
  startTime: string;
  status: string;
};

export type BookingCalendarDetail = BookingCalendarSummary & {
  availability: BookingCalendarAvailability[];
  blocks: BookingCalendarBlock[];
  bookings: CalendarBookingRecord[];
  locationOrMeetingDetails: string;
  maximumAdvanceDays: number;
  minimumNoticeHours: number;
  timezone: string;
};

export type PublicBookingCalendar = {
  accentColor: string;
  bookingType: BookingCalendarType;
  bookingsEnabled: boolean;
  description: string;
  durationMinutes: number;
  id: string;
  locationOrMeetingDetails: string;
  maximumAdvanceDays: number;
  minimumNoticeHours: number;
  name: string;
  slug: string;
  timezone: string;
};

type CalendarRow = {
  accent_color: string;
  booking_type: BookingCalendarType;
  bookings_enabled: boolean;
  description: string;
  duration_minutes: number;
  id: string;
  name: string;
  owner_profile_id: string;
  slug: string;
};

function calendarSummary(row: CalendarRow, upcomingBookings = 0): BookingCalendarSummary {
  return {
    accentColor: row.accent_color,
    bookingType: row.booking_type,
    bookingsEnabled: row.bookings_enabled,
    description: row.description,
    durationMinutes: row.duration_minutes,
    id: row.id,
    name: row.name,
    ownerProfileId: row.owner_profile_id,
    slug: row.slug,
    upcomingBookings,
  };
}

export async function loadBookingCalendars(ownerProfileId?: string) {
  const supabase = await createClient();
  let calendarQuery = supabase
    .from("booking_calendars")
    .select("id,owner_profile_id,name,slug,description,booking_type,duration_minutes,bookings_enabled,accent_color")
    .order("created_at", { ascending: true });

  if (ownerProfileId) calendarQuery = calendarQuery.eq("owner_profile_id", ownerProfileId);

  const { data, error } = await calendarQuery;
  if (error || !data?.length) {
    return { calendars: [] as BookingCalendarSummary[], loadError: error?.message ?? "" };
  }

  const now = new Date().toISOString();
  const { data: bookings, error: bookingsError } = await supabase
    .from("calendar_bookings")
    .select("calendar_id")
    .eq("status", "confirmed")
    .gte("start_time", now);

  const counts = new Map<string, number>();
  for (const booking of bookings ?? []) {
    counts.set(booking.calendar_id, (counts.get(booking.calendar_id) ?? 0) + 1);
  }

  return {
    calendars: (data as CalendarRow[]).map((row) => calendarSummary(row, counts.get(row.id) ?? 0)),
    loadError: bookingsError?.message ?? "",
  };
}

export async function loadBookingCalendar(calendarId: string): Promise<{ calendar: BookingCalendarDetail | null; loadError: string }> {
  const supabase = await createClient();
  const [calendarResult, availabilityResult, blocksResult, bookingsResult] = await Promise.all([
    supabase
      .from("booking_calendars")
      .select("id,owner_profile_id,name,slug,description,booking_type,duration_minutes,timezone,bookings_enabled,minimum_notice_hours,maximum_advance_days,location_or_meeting_details,accent_color")
      .eq("id", calendarId)
      .maybeSingle(),
    supabase
      .from("booking_calendar_availability")
      .select("id,day_of_week,start_time,end_time,is_enabled")
      .eq("calendar_id", calendarId)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("booking_calendar_blocks")
      .select("id,start_date,end_date,reason")
      .eq("calendar_id", calendarId)
      .order("start_date"),
    supabase
      .from("calendar_bookings")
      .select("id,booking_reference,booker_name,booker_email,booker_phone,attendee_name,responses,start_time,status,created_at")
      .eq("calendar_id", calendarId)
      .order("start_time", { ascending: false })
      .limit(100),
  ]);

  const loadError = calendarResult.error?.message
    ?? availabilityResult.error?.message
    ?? blocksResult.error?.message
    ?? bookingsResult.error?.message
    ?? "";
  if (!calendarResult.data || loadError) return { calendar: null, loadError };

  const row = calendarResult.data as CalendarRow & {
    location_or_meeting_details: string;
    maximum_advance_days: number;
    minimum_notice_hours: number;
    timezone: string;
  };
  const now = Date.now();

  return {
    calendar: {
      ...calendarSummary(row, (bookingsResult.data ?? []).filter((booking) => booking.status === "confirmed" && new Date(booking.start_time).getTime() >= now).length),
      availability: (availabilityResult.data ?? []).map((window) => ({
        dayOfWeek: window.day_of_week,
        endTime: window.end_time.slice(0, 5),
        id: window.id,
        isEnabled: window.is_enabled,
        startTime: window.start_time.slice(0, 5),
      })),
      blocks: (blocksResult.data ?? []).map((block) => ({
        endDate: block.end_date,
        id: block.id,
        reason: block.reason,
        startDate: block.start_date,
      })),
      bookings: (bookingsResult.data ?? []).map((booking) => ({
        attendeeName: booking.attendee_name,
        bookerEmail: booking.booker_email,
        bookerName: booking.booker_name,
        bookerPhone: booking.booker_phone,
        bookingReference: booking.booking_reference,
        createdAt: booking.created_at,
        id: booking.id,
        responses: booking.responses as Record<string, unknown>,
        startTime: booking.start_time,
        status: booking.status,
      })),
      locationOrMeetingDetails: row.location_or_meeting_details,
      maximumAdvanceDays: row.maximum_advance_days,
      minimumNoticeHours: row.minimum_notice_hours,
      timezone: row.timezone,
    },
    loadError: "",
  };
}
