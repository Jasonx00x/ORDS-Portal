import { PortalShell } from "./PortalShell";
import { requirePortalUser } from "@/lib/auth";
import { loadBookingWorkspace } from "@/lib/booking/queries";
import type { PortalSection } from "@/lib/roles";

export async function PortalPage({ section }: { section: PortalSection }) {
  const user = await requirePortalUser(section);
  const bookingData = section === "booking" || section === "dashboard" || section === "students" || section === "teacher-schedule"
    ? await loadBookingWorkspace(user)
    : undefined;

  return <PortalShell bookingData={bookingData} section={section} user={user} />;
}
