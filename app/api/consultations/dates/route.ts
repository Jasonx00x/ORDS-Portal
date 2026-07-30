import { callSupabaseRpc } from "@/lib/consultations/supabase-rest";

type AvailableDateRow = {
  available_date: string;
  available_slots: number;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";

  if (!datePattern.test(start) || !datePattern.test(end)) {
    return Response.json({ dates: [], message: "Select a valid calendar range." }, { status: 400 });
  }

  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  const rangeDays = (endDate.getTime() - startDate.getTime()) / 86_400_000;
  if (!Number.isFinite(rangeDays) || rangeDays < 0 || rangeDays > 45) {
    return Response.json({ dates: [], message: "Select a valid calendar range." }, { status: 400 });
  }

  const { data, error } = await callSupabaseRpc<AvailableDateRow[]>(
    "get_consultation_available_dates",
    { p_end_date: end, p_start_date: start },
  );

  if (error) {
    return Response.json(
      { dates: [], message: "Available consultation dates could not be loaded." },
      { status: 503 },
    );
  }

  return Response.json({
    dates: (data ?? []).map((item) => ({
      date: item.available_date,
      slots: Number(item.available_slots),
    })),
  });
}
