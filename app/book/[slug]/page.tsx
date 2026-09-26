import { notFound } from "next/navigation";
import { PublicBookingPage } from "@/components/booking/PublicBookingPage";
import { loadPublicBookingCalendar } from "@/lib/public-booking/data";

export default async function PublicCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const calendar = await loadPublicBookingCalendar(slug);
  if (!calendar) notFound();
  return <PublicBookingPage calendar={calendar} embedded={query.embed === "1"} />;
}

