import { callSupabaseRpc } from "@/lib/consultations/supabase-rest";
import { validateAvailabilityDate } from "@/lib/consultations/validation";

type AvailableDateRow = { available_date: string; available_slots: number };

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const start = url.searchParams.get("start") ?? "";
  const end = url.searchParams.get("end") ?? "";
  if (!validateAvailabilityDate(start) || !validateAvailabilityDate(end)) {
    return Response.json({ message: "Select a valid calendar range." }, { status: 400 });
  }
  const rangeDays = Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000);
  if (rangeDays < 0 || rangeDays > 45) {
    return Response.json({ message: "Calendar ranges are limited to 45 days." }, { status: 400 });
  }

  const { data, error } = await callSupabaseRpc<AvailableDateRow[]>("get_booking_calendar_available_dates", {
    p_end_date: end,
    p_slug: slug,
    p_start_date: start,
  }, { useServiceRole: true });
  if (error) return Response.json({ message: "Available dates could not be loaded." }, { status: 503 });
  return Response.json({ dates: (data ?? []).map((row) => ({ date: row.available_date, slots: Number(row.available_slots) })) });
}

