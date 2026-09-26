import { notFound, redirect } from "next/navigation";
import { PortalPage } from "@/components/PortalPage";
import { requirePortalUser } from "@/lib/auth";
import type { BookingView } from "@/components/booking/BookingSectionNav";

const bookingViews: BookingView[] = ["availability", "calendar", "lessons", "people", "rooms"];

export default async function BookingViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!bookingViews.includes(view as BookingView)) notFound();

  const user = await requirePortalUser("booking");
  if (view === "people" && user.role !== "admin") redirect("/booking");
  if (!["admin", "instructor"].includes(user.role)) redirect("/booking");

  return <PortalPage bookingView={view as BookingView} section="booking" />;
}
