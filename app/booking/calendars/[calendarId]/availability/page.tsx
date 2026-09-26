import { BookingCalendarAdminPage } from "@/components/booking/BookingCalendarAdminPage";

export default async function BookingCalendarAvailabilityPage({ params }: { params: Promise<{ calendarId: string }> }) {
  const { calendarId } = await params;
  return <BookingCalendarAdminPage calendarId={calendarId} view="availability" />;
}

