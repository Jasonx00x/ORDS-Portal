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

export const defaultLessonMinutes = 60;

export const setupChecklist = [
  ["1", "Create owner account", "Oscar receives an admin invite and sets his password.", "Ready"],
  ["2", "Add ORDS rooms", "Studio, Drum Room, Auditorium, Youth Room, and Extra Room are available to configure.", "Ready"],
  ["3", "Set school hours", "Oscar defines normal operating hours and closed days.", "Next"],
  ["4", "Invite instructors", "Each instructor receives an email invite after Oscar creates the account.", "Next"],
  ["5", "Add contracted families", "Parents are created only after contract approval.", "Next"],
  ["6", "Build student schedules", "Instructors create 1-hour lessons for assigned students, then request room approval.", "Next"],
];

export const accountRules = [
  ["Family signup", "Admin-created only", "Parents cannot self-register before contract approval."],
  ["Invites", "Email password setup", "Oscar and instructors receive secure account invites."],
  ["Parent access", "One parent, multiple students", "A parent account can manage every linked student."],
  ["Billing", "QuickBooks later", "The portal can show status later without becoming the payment system."],
];

export const bookingSlots: BookingSlot[] = [
  { id: "slot-setup-mon-400", day: "Mon", date: "Setup week", time: "4:00 PM", instructor: "Assigned instructor", instrument: "Student program", location: "Studio", status: "available" },
  { id: "slot-setup-tue-500", day: "Tue", date: "Setup week", time: "5:00 PM", instructor: "Assigned instructor", instrument: "Student program", location: "Drum Room", status: "available" },
  { id: "slot-setup-wed-600", day: "Wed", date: "Setup week", time: "6:00 PM", instructor: "Assigned instructor", instrument: "Student program", location: "Youth Room", status: "available" },
];

export const bookingRooms: BookingRoom[] = [
  { id: "studio", name: "Studio", bestFor: "Audio production, recording, mixing, coaching", status: "open", note: "Ready for Oscar to approve lesson and studio use." },
  { id: "drum-room", name: "Drum Room", bestFor: "Drums, rhythm coaching, louder lesson blocks", status: "open", note: "Ready for approved drum schedules." },
  { id: "auditorium", name: "Auditorium", bestFor: "Vocals, piano, ensemble coaching, recitals", status: "open", note: "Ready for approved lessons and events." },
  { id: "youth-room", name: "Youth Room", bestFor: "Youth lessons, small groups, overflow instruction", status: "open", note: "Ready to configure." },
  { id: "extra-room", name: "Extra Room", bestFor: "Overflow lessons, makeups, temporary scheduling needs", status: "open", note: "Ready to configure." },
];

export const bookingRequests: BookingRequest[] = [
  {
    student: "New student",
    requester: "Parent account after contract",
    instructor: "Assigned instructor",
    requestedTime: "Available 1-hour opening",
    status: "Pending",
    reason: "Requests will appear here after instructors or families choose approved openings.",
  },
];

export const reminderQueue = [
  ["No reminders yet", "Create approved lesson bookings first", "1-hour lessons", "Email later", "Waiting"],
];

export const reminderRules = [
  ["Booking confirmation", "After approval", "Portal notification now, email after provider setup"],
  ["Lesson reminder", "24 hours before lesson", "Email reminder later"],
  ["Same-day reminder", "Optional later", "SMS can be added after email is stable"],
  ["Change notice", "When approved or denied", "Portal notification now"],
];

export const bookingProfileByRole: Record<Role, { student: string; instructor: string; instrument: string; nextLesson: string }> = {
  admin: { student: "No students yet", instructor: "No instructors invited yet", instrument: "Programs configure during setup", nextLesson: "No lessons scheduled yet" },
  instructor: { student: "No assigned students yet", instructor: "Your instructor account", instrument: "Your programs", nextLesson: "Add availability first" },
  parent: { student: "Student pending setup", instructor: "Assigned after contract", instrument: "Program pending", nextLesson: "No lesson scheduled yet" },
  student: { student: "Student account", instructor: "Assigned instructor", instrument: "Program pending", nextLesson: "No lesson scheduled yet" },
  client: { student: "Client account", instructor: "Assigned coach", instrument: "Service pending", nextLesson: "No session scheduled yet" },
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
