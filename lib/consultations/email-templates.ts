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

function supportedTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "America/New_York";
  }
}

export function splitFullName(fullName: string) {
  const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/);
  return { firstName, lastName: lastNameParts.join(" ") };
}

export function formatBookingDate(iso: string, timezone = "America/New_York") {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: supportedTimezone(timezone),
    year: "numeric",
  }).format(date);
}

export function formatBookingTime(iso: string, timezone = "America/New_York") {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: supportedTimezone(timezone),
  }).format(date);
}
