import { redirect } from "next/navigation";
import { BookingCalendarCreateForm } from "@/components/booking/BookingCalendarCreateForm";
import { PortalShell } from "@/components/PortalShell";
import { requirePortalUser } from "@/lib/auth";
import { loadBookingWorkspace } from "@/lib/booking/queries";

export default async function NewBookingCalendarPage() {
  const user = await requirePortalUser("booking");
  if (user.role !== "admin") redirect("/booking");
  const bookingData = await loadBookingWorkspace(user);

  return (
    <PortalShell bookingData={bookingData} section="booking" user={user}>
      <BookingCalendarCreateForm role={user.role} />
    </PortalShell>
  );
}

