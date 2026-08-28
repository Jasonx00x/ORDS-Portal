import { PortalShell } from "./PortalShell";
import { requirePortalUser } from "@/lib/auth";
import { loadBookingWorkspace } from "@/lib/booking/queries";
import type { PortalSection } from "@/lib/roles";

export async function PortalPage({ section }: { section: PortalSection }) {
  const user = await requirePortalUser(section);
  const bookingSections: PortalSection[] = [
    "booking",
    "clock-in",
    "dashboard",
    "homework",
    "lesson-reports",
    "progress",
    "reschedule-requests",
    "students",
    "teacher-schedule",
  ];
  const bookingData = bookingSections.includes(section)
    ? await loadBookingWorkspace(user)
    : undefined;

  return <PortalShell bookingData={bookingData} section={section} user={user} />;
}
