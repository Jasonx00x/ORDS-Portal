import { validateAvailabilityDate } from "@/lib/consultations/validation";
import { callSupabaseRpc } from "@/lib/consultations/supabase-rest";

type SlotRow = {
  end_time: string;
  start_time: string;
  timezone: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";

  if (!validateAvailabilityDate(date)) {
    return Response.json({ message: "Select a valid date.", slots: [] }, { status: 400 });
  }

  const { data, error } = await callSupabaseRpc<SlotRow[]>("get_consultation_available_slots", { p_date: date });

  if (error) {
    return Response.json(
      {
        message: "Consultation times are not available yet. Please contact ORDS Music School for assistance.",
        slots: [],
      },
      { status: 503 },
    );
  }

  return Response.json({
    slots: (data ?? []).map((slot) => ({
      endTime: slot.end_time,
      startTime: slot.start_time,
      timezone: slot.timezone,
    })),
  });
}
