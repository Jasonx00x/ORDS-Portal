import type { Role } from "./roles";

export const dashboardStats = [
  ["Active students", "0", "Add after contracts"],
  ["Reports submitted", "0", "Starts after lessons"],
  ["Missing reports", "0", "No lessons yet"],
  ["Today’s clock-ins", "0", "Invite instructors first"],
  ["Pending reschedules", "0", "No requests yet"],
  ["Login activity", "0", "No invited accounts yet"],
  ["Attendance issues", "0", "No lessons yet"],
  ["Announcement reads", "0", "No announcements sent"],
];

export const homeworkByRole: Record<Role, Array<{ title: string; detail: string }>> = {
  student: [
    { title: "No homework yet", detail: "Homework appears after the instructor submits the first lesson report." },
    { title: "Practice checklist", detail: "Practice items will be assigned by the instructor." },
  ],
  client: [
    { title: "No coaching homework yet", detail: "Homework appears after the assigned coach submits notes." },
    { title: "Session prep", detail: "Session prep appears after the first coaching session is scheduled." },
  ],
  instructor: [
    { title: "No assigned students yet", detail: "An ORDS administrator assigns students after contracts and account setup." },
    { title: "Homework templates", detail: "Build reusable homework once programs are configured." },
    { title: "Instructor Library", detail: "Reusable homework templates, lesson materials, and upload links" },
    { title: "Assignment Queue", detail: "No homework submissions yet." },
  ],
  admin: [
    { title: "No homework yet", detail: "Assignments begin after instructors submit reports." },
    { title: "No student submissions yet", detail: "Student uploads appear after accounts are invited." },
    { title: "Instructor Library", detail: "Reusable homework templates, lesson materials, and upload links" },
    { title: "Assignment Queue", detail: "No homework submissions yet." },
  ],
  parent: [],
};

export const assignedInstructorByRole: Record<Role, string> = {
  student: "Assigned after setup",
  parent: "Assigned after setup",
  client: "Assigned after setup",
  instructor: "Instructor account",
  admin: "All instructors",
};

export const lessonBlocks = [
  { day: "Mon", lessons: [
    ["Setup", "No lessons yet", "Add instructor availability", "Admin", "Setup Required", "audio"],
  ] },
  { day: "Tue", lessons: [
    ["Setup", "Room approval", "Every lesson needs a room", "Admin", "Setup Required", "audio"],
  ] },
  { day: "Wed", lessons: [
    ["Setup", "1-hour lessons", "Default duration", "Admin", "Setup Required", "audio"],
  ] },
  { day: "Thu", lessons: [
    ["Setup", "Invite instructors", "Email password setup", "Admin", "Setup Required", "audio"],
  ] },
  { day: "Fri", lessons: [
    ["Setup", "Add contracted families", "No parent self-signup", "Admin", "Setup Required", "audio"],
  ] },
  { day: "Sat", lessons: [
    ["Setup", "Build first schedule", "Use available room", "Admin", "Setup Required", "audio"],
  ] },
] as const;
