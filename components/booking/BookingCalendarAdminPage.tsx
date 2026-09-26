import { notFound, redirect } from "next/navigation";
import { BookingCalendarManager } from "@/components/booking/BookingCalendarManager";
import { PortalShell } from "@/components/PortalShell";
import { requirePortalUser } from "@/lib/auth";
import { loadBookingCalendar } from "@/lib/booking/calendars";
import { loadBookingWorkspace } from "@/lib/booking/queries";

export async function BookingCalendarAdminPage({
  calendarId,
  view,
}: {
  calendarId: string;
  view: "availability" | "bookings" | "settings";
}) {
  const user = await requirePortalUser("booking");
  if (user.role !== "admin") redirect("/booking");
  const [bookingData, result] = await Promise.all([
    loadBookingWorkspace(user),
    loadBookingCalendar(calendarId),
  ]);
  if (!result.calendar || result.loadError) notFound();
  const publicBaseUrl = (process.env.NEXT_PUBLIC_ORDS_PORTAL_URL || "https://portal.ordsmusic.com").replace(/\/$/, "");

  return (
    <PortalShell bookingData={bookingData} section="booking" user={user}>
      <BookingCalendarManager calendar={result.calendar} publicBaseUrl={publicBaseUrl} role={user.role} view={view} />
    </PortalShell>
  );
}

