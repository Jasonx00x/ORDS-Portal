import type { Role } from "./roles";

export type BookingSlotStatus = "available" | "booked" | "pending" | "blocked";
export type RoomStatus = "open" | "busy" | "blocked";

export type BookingRoom = {
  id: string;
  name: string;
  bestFor: string;
  status: RoomStatus;
  note: string;
};

export type BookingSlot = {
  id: string;
  day: string;
  date: string;
  time: string;
  instructor: string;
  instrument: string;
  location: string;
  status: BookingSlotStatus;
  student?: string;
};

export type BookingRequest = {
  student: string;
  requester: string;
  instructor: string;
  requestedTime: string;
  status: "Pending" | "Approved" | "Denied";
  reason: string;
};

export const bookingSlots: BookingSlot[] = [
  { id: "slot-jason-thu-530", day: "Thu", date: "Jun 25", time: "5:30 PM", instructor: "Jason Alfaro", instrument: "Drums", location: "Drum Room", status: "available" },
  { id: "slot-jason-sat-1230", day: "Sat", date: "Jun 27", time: "12:30 PM", instructor: "Jason Alfaro", instrument: "Drums", location: "Drum Room", status: "available" },
  { id: "slot-jason-mon-400", day: "Mon", date: "Jun 29", time: "4:00 PM", instructor: "Jason Alfaro", instrument: "Drums", location: "Drum Room", status: "pending", student: "Mateo Ramos" },
  { id: "slot-bryan-fri-300", day: "Fri", date: "Jun 26", time: "3:00 PM", instructor: "Bryan", instrument: "Vocals", location: "Auditorium", status: "booked", student: "Naomi Lee" },
  { id: "slot-david-tue-430", day: "Tue", date: "Jun 30", time: "4:30 PM", instructor: "David", instrument: "Piano", location: "Auditorium", status: "available" },
  { id: "slot-oscar-thu-630", day: "Thu", date: "Jun 25", time: "6:30 PM", instructor: "Oscar Ramos", instrument: "Audio", location: "Studio", status: "available" },
  { id: "slot-oscar-tue-700", day: "Tue", date: "Jun 30", time: "7:00 PM", instructor: "Oscar Ramos", instrument: "Audio", location: "Studio", status: "pending", student: "Jordan Cruz" },
  { id: "slot-jason-wed-600", day: "Wed", date: "Jun 24", time: "6:00 PM", instructor: "Jason Alfaro", instrument: "Drums", location: "Drum Room", status: "blocked" },
];

export const bookingRooms: BookingRoom[] = [
  { id: "studio", name: "Studio", bestFor: "Audio production, recording, mixing, coaching", status: "busy", note: "Oscar has one pending client request." },
  { id: "drum-room", name: "Drum Room", bestFor: "Drums, rhythm coaching, louder practice blocks", status: "open", note: "Two Jason openings available this week." },
  { id: "auditorium", name: "Auditorium", bestFor: "Vocals, piano, ensemble coaching, recitals", status: "busy", note: "One vocal lesson booked and one piano opening." },
];

export const bookingRequests: BookingRequest[] = [
  {
    student: "Mateo Ramos",
    requester: "Ramos Family",
    instructor: "Jason Alfaro",
    requestedTime: "Mon, Jun 29 at 4:00 PM",
    status: "Pending",
    reason: "Family appointment conflicts with the original lesson time.",
  },
  {
    student: "Jordan Cruz",
    requester: "Jordan Cruz",
    instructor: "Oscar Ramos",
    requestedTime: "Tue, Jun 30 at 7:00 PM",
    status: "Pending",
    reason: "Needs a later studio coaching session after work.",
  },
  {
    student: "Naomi Lee",
    requester: "Lee Family",
    instructor: "Bryan",
    requestedTime: "Fri, Jun 26 at 3:00 PM",
    status: "Approved",
    reason: "Recurring vocal lesson confirmed.",
  },
];

export const reminderQueue = [
  ["Mateo Ramos", "Drums with Jason", "Thu, Jun 25 at 5:30 PM", "24-hour email", "Queued"],
  ["Mateo Ramos", "Drums with Jason", "Thu, Jun 25 at 5:30 PM", "Same-day SMS", "Queued"],
  ["Naomi Lee", "Vocals with Bryan", "Fri, Jun 26 at 3:00 PM", "Parent email", "Sent"],
  ["Jordan Cruz", "Audio with Oscar", "Tue, Jun 30 at 7:00 PM", "Booking update", "Pending approval"],
];

export const reminderRules = [
  ["Booking confirmation", "Immediately after approval", "Email + portal notification"],
  ["Lesson reminder", "24 hours before lesson", "Email reminder"],
  ["Same-day reminder", "3 hours before lesson", "SMS optional"],
  ["Change notice", "When approved or denied", "Email + portal notification"],
];

export const bookingProfileByRole: Record<Role, { student: string; instructor: string; instrument: string; nextLesson: string }> = {
  admin: { student: "All students", instructor: "All instructors", instrument: "All programs", nextLesson: "12 lessons scheduled this week" },
  instructor: { student: "Assigned roster", instructor: "Jason Alfaro", instrument: "Drums", nextLesson: "Today at 5:30 PM" },
  parent: { student: "Mateo Ramos", instructor: "Jason Alfaro", instrument: "Drums", nextLesson: "Thu, Jun 25 at 5:30 PM" },
  student: { student: "Mateo Ramos", instructor: "Jason Alfaro", instrument: "Drums", nextLesson: "Thu, Jun 25 at 5:30 PM" },
  client: { student: "Jordan Cruz", instructor: "Oscar Ramos", instrument: "Audio", nextLesson: "Tue, Jun 30 at 7:00 PM" },
};

export function visibleBookingSlots(role: Role) {
  const profile = bookingProfileByRole[role];
  if (role === "admin") return bookingSlots;
  if (role === "instructor") return bookingSlots.filter((slot) => slot.instructor === profile.instructor);
  return bookingSlots.filter((slot) => slot.instructor === profile.instructor && slot.status === "available");
}

export function roomScheduleSummary() {
  return bookingRooms.map((room) => {
    const roomSlots = bookingSlots.filter((slot) => slot.location === room.name);
    const open = roomSlots.filter((slot) => slot.status === "available").length;
    const committed = roomSlots.filter((slot) => slot.status === "booked" || slot.status === "pending").length;
    return [room.name, room.bestFor, `${open} open`, `${committed} booked/pending`, room.note];
  });
}

export function roomConflictRows() {
  const committedSlots = bookingSlots.filter((slot) => slot.status === "booked" || slot.status === "pending");
  const conflicts = committedSlots.flatMap((slot, index) => {
    const matching = committedSlots.slice(index + 1).filter((candidate) => (
      candidate.date === slot.date &&
      candidate.time === slot.time &&
      candidate.location === slot.location
    ));
    return matching.map((candidate) => [
      slot.location,
      `${slot.day}, ${slot.date} at ${slot.time}`,
      `${slot.student ?? slot.instructor} / ${candidate.student ?? candidate.instructor}`,
      "Conflict",
    ]);
  });

  return conflicts.length ? conflicts : [["All rooms", "This week", "No double-booked rooms", "Clear"]];
}
