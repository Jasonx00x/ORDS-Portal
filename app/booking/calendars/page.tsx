import { redirect } from "next/navigation";
import { BookingCalendarsWorkspace } from "@/components/booking/BookingCalendarsWorkspace";
import { PortalShell } from "@/components/PortalShell";
import { requirePortalUser } from "@/lib/auth";
import { loadBookingCalendars } from "@/lib/booking/calendars";
import { loadBookingWorkspace } from "@/lib/booking/queries";

export default async function BookingCalendarsPage() {
  const user = await requirePortalUser("booking");
  if (user.role !== "admin") redirect("/booking");
  const [bookingData, calendarData] = await Promise.all([
    loadBookingWorkspace(user),
    loadBookingCalendars(),
  ]);
  const publicBaseUrl = (process.env.NEXT_PUBLIC_ORDS_PORTAL_URL || "https://portal.ordsmusic.com").replace(/\/$/, "");

  return (
    <PortalShell bookingData={bookingData} section="booking" user={user}>
      <BookingCalendarsWorkspace {...calendarData} publicBaseUrl={publicBaseUrl} role={user.role} />
    </PortalShell>
  );
}
