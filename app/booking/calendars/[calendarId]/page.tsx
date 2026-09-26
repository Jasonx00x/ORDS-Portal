import { BookingCalendarAdminPage } from "@/components/booking/BookingCalendarAdminPage";

export default async function BookingCalendarSettingsPage({ params }: { params: Promise<{ calendarId: string }> }) {
  const { calendarId } = await params;
  return <BookingCalendarAdminPage calendarId={calendarId} view="settings" />;
}

