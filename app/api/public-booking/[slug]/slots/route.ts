import { callSupabaseRpc } from "@/lib/consultations/supabase-rest";
import { validateAvailabilityDate } from "@/lib/consultations/validation";

type SlotRow = { end_time: string; start_time: string; timezone: string };

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!validateAvailabilityDate(date)) return Response.json({ message: "Select a valid date." }, { status: 400 });

  const { data, error } = await callSupabaseRpc<SlotRow[]>("get_booking_calendar_available_slots", {
    p_date: date,
    p_slug: slug,
  }, { useServiceRole: true });
  if (error) return Response.json({ message: "Available times could not be loaded." }, { status: 503 });
  return Response.json({ slots: (data ?? []).map((slot) => ({ endTime: slot.end_time, startTime: slot.start_time, timezone: slot.timezone })) });
}

