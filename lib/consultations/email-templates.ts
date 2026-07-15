export type ConsultationEmailBooking = {
  bookingReference: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  instrumentOrService: string;
  locationOrMeetingDetails: string;
  musicalGoals: string;
  startTime: string;
  studentAge: number | null;
  studentName: string;
  timezone: string;
};

export function formatEasternDateTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(date);
}

export function customerConfirmationEmail(booking: ConsultationEmailBooking) {
  const dateTime = formatEasternDateTime(booking.startTime);
  return {
    subject: `ORDS consultation confirmed: ${booking.bookingReference}`,
    text: [
      `Hi ${booking.customerName},`,
      "",
      "Your free 30-minute consultation with ORDS Music School is confirmed.",
      "",
      `Student: ${booking.studentName}`,
      `Instrument or service: ${booking.instrumentOrService}`,
      `Date and time: ${dateTime} Eastern Time`,
      `Booking reference: ${booking.bookingReference}`,
      `Details: ${booking.locationOrMeetingDetails}`,
      "",
      "If you need to make a change, reply to this email and ORDS will help.",
      "",
      "ORDS Music School",
      process.env.NEXT_PUBLIC_ORDS_MARKETING_URL ?? "https://ordsmusic.com",
    ].join("\n"),
  };
}

export function adminNotificationEmail(booking: ConsultationEmailBooking, portalUrl: string) {
  const dateTime = formatEasternDateTime(booking.startTime);
  return {
    subject: `New ORDS consultation: ${booking.studentName} (${booking.bookingReference})`,
    text: [
      "A new free consultation was booked.",
      "",
      `Parent/customer: ${booking.customerName}`,
      `Student: ${booking.studentName}`,
      `Email: ${booking.customerEmail}`,
      `Phone: ${booking.customerPhone}`,
      `Student age: ${booking.studentAge ?? "Not provided"}`,
      `Instrument/service: ${booking.instrumentOrService}`,
      `Date and time: ${dateTime} Eastern Time`,
      `Booking reference: ${booking.bookingReference}`,
      "",
      "Musical goals:",
      booking.musicalGoals,
      "",
      `Portal: ${portalUrl}/admin/consultations`,
    ].join("\n"),
  };
}
