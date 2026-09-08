import { createClient } from "@/lib/supabase/server";

export type ConsultationRecord = {
  bookingReference: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  id: string;
  instrumentOrService: string;
  source: string;
  startTime: string;
  status: string;
  studentName: string;
  timezone: string;
};

export type ConsultationAvailabilityWindow = {
  dayOfWeek: number;
  endTime: string;
  id: string;
  isEnabled: boolean;
  startTime: string;
};

export type ConsultationBlockedPeriod = {
  endDate: string;
  id: string;
  reason: string;
  startDate: string;
};

export type ConsultationSettings = {
  bookingsEnabled: boolean;
  durationMinutes: number;
  locationOrMeetingDetails: string;
  maximumAdvanceDays: number;
  minimumNoticeHours: number;
  timezone: string;
};

export async function loadConsultationData() {
  const supabase = await createClient();
  const [bookingsResult, emailFailuresResult] = await Promise.all([
    supabase
      .from("consultation_bookings")
      .select("id,booking_reference,customer_name,customer_email,customer_phone,student_name,instrument_or_service,start_time,timezone,status,source,created_at")
      .order("start_time", { ascending: false })
      .limit(250),
    supabase
      .from("consultation_email_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);

  const records: ConsultationRecord[] = (bookingsResult.data ?? []).map((row) => ({
    bookingReference: row.booking_reference,
    createdAt: row.created_at,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    id: row.id,
    instrumentOrService: row.instrument_or_service,
    source: row.source || "Website Booking",
    startTime: row.start_time,
    status: row.status,
    studentName: row.student_name,
    timezone: row.timezone,
  }));

  return {
    emailIssueCount: emailFailuresResult.count ?? 0,
    loadError: bookingsResult.error?.message ?? emailFailuresResult.error?.message ?? "",
    records,
  };
}

export async function loadConsultationAvailabilityData() {
  const supabase = await createClient();
  const [availabilityResult, blocksResult] = await Promise.all([
    supabase
      .from("consultation_availability")
      .select("id,day_of_week,start_time,end_time,is_enabled")
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("consultation_blocked_dates")
      .select("id,start_date,end_date,reason")
      .order("start_date"),
  ]);

  return {
    availability: (availabilityResult.data ?? []).map((row) => ({
      dayOfWeek: row.day_of_week,
      endTime: row.end_time.slice(0, 5),
      id: row.id,
      isEnabled: row.is_enabled,
      startTime: row.start_time.slice(0, 5),
    })) as ConsultationAvailabilityWindow[],
    blockedPeriods: (blocksResult.data ?? []).map((row) => ({
      endDate: row.end_date,
      id: row.id,
      reason: row.reason ?? "Unavailable",
      startDate: row.start_date,
    })) as ConsultationBlockedPeriod[],
    loadError: availabilityResult.error?.message ?? blocksResult.error?.message ?? "",
  };
}

export async function loadConsultationSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consultation_settings")
    .select("duration_minutes,timezone,bookings_enabled,minimum_notice_hours,maximum_advance_days,location_or_meeting_details")
    .eq("singleton_key", true)
    .maybeSingle();

  const settings: ConsultationSettings = {
    bookingsEnabled: data?.bookings_enabled ?? true,
    durationMinutes: data?.duration_minutes ?? 30,
    locationOrMeetingDetails: data?.location_or_meeting_details ?? "ORDS Music School will confirm the consultation location or call details by email.",
    maximumAdvanceDays: data?.maximum_advance_days ?? 30,
    minimumNoticeHours: data?.minimum_notice_hours ?? 24,
    timezone: data?.timezone ?? "America/New_York",
  };

  return { loadError: error?.message ?? "", settings };
}
