export type Role = "admin" | "instructor" | "parent" | "student" | "client";

export type PortalSection =
  | "dashboard"
  | "booking"
  | "students"
  | "teacher-schedule"
  | "clock-in"
  | "lesson-reports"
  | "reschedule-requests"
  | "login-records"
  | "homework"
  | "progress"
  | "billing"
  | "announcements"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  section: PortalSection;
  roles: Role[];
};

export type RoleAction = {
  href: string;
  label: string;
  primary?: boolean;
};

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  instructor: "Instructor",
  parent: "Parent",
  student: "Student",
  client: "Client",
};

export const roleProfiles: Record<Role, { name: string; subtitle: string }> = {
  admin: {
    name: "ORDS operations overview.",
    subtitle:
      "Manage people, schedules, rooms, approvals, and academy activity from one secure workspace.",
  },
  instructor: {
    name: "Your teaching workspace.",
    subtitle:
      "Review your students and schedule, manage availability, and keep lesson follow-up organized.",
  },
  parent: {
    name: "Your family account.",
    subtitle:
      "Follow linked students, approved lessons, progress updates, reschedule requests, and billing status.",
  },
  student: {
    name: "Your student portal.",
    subtitle:
      "Keep up with approved lessons, homework, announcements, and schedule requests in one place.",
  },
  client: {
    name: "Your coaching portal.",
    subtitle:
      "Review coaching sessions, assigned work, announcements, and schedule requests.",
  },
};

export const roleActions: Record<Role, RoleAction[]> = {
  admin: [
    { href: "/students", label: "Manage People", primary: true },
    { href: "/booking", label: "Manage Booking" },
    { href: "/reschedule-requests", label: "Review Requests" },
    { href: "/lesson-reports", label: "Lesson Reports" },
  ],
  instructor: [
    { href: "/booking", label: "Open Schedule", primary: true },
    { href: "/clock-in", label: "Clock In" },
    { href: "/lesson-reports", label: "Lesson Reports" },
  ],
  parent: [
    { href: "/booking", label: "View Lessons", primary: true },
    { href: "/reschedule-requests", label: "Request Reschedule" },
    { href: "/progress", label: "View Progress" },
  ],
  student: [
    { href: "/booking", label: "View Lessons", primary: true },
    { href: "/homework", label: "Homework" },
    { href: "/reschedule-requests", label: "Request Reschedule" },
  ],
  client: [
    { href: "/booking", label: "View Sessions", primary: true },
    { href: "/homework", label: "Assigned Work" },
    { href: "/reschedule-requests", label: "Request Reschedule" },
  ],
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", section: "dashboard", roles: ["student", "parent", "client", "instructor", "admin"] },
  { href: "/booking", label: "Booking", section: "booking", roles: ["student", "parent", "client", "instructor", "admin"] },
  { href: "/students", label: "Students", section: "students", roles: ["instructor", "admin"] },
  { href: "/schedule", label: "Teacher Schedule", section: "teacher-schedule", roles: ["admin"] },
  { href: "/clock-in", label: "Clock-In Logs", section: "clock-in", roles: ["instructor", "admin"] },
  { href: "/lesson-reports", label: "Lesson Reports", section: "lesson-reports", roles: ["instructor", "admin"] },
  { href: "/reschedule-requests", label: "Reschedule Requests", section: "reschedule-requests", roles: ["student", "parent", "client", "instructor", "admin"] },
  { href: "/login-records", label: "Login Records", section: "login-records", roles: ["admin"] },
  { href: "/homework", label: "Homework", section: "homework", roles: ["student", "client", "instructor", "admin"] },
  { href: "/progress", label: "Progress", section: "progress", roles: ["parent", "admin"] },
  { href: "/billing", label: "Billing", section: "billing", roles: ["parent", "admin"] },
  { href: "/announcements", label: "Announcements", section: "announcements", roles: ["student", "client", "instructor", "admin"] },
  { href: "/settings", label: "Settings", section: "settings", roles: ["student", "parent", "client", "instructor", "admin"] },
];

export function canAccess(role: Role, section: PortalSection) {
  return navItems.some((item) => item.section === section && item.roles.includes(role));
}

export function defaultPathForRole(role: Role) {
  return navItems.find((item) => item.roles.includes(role))?.href ?? "/dashboard";
}
