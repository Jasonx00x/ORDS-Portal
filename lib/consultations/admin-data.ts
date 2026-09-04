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
