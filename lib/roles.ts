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

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  instructor: "Instructor",
  parent: "Parent",
  student: "Student",
  client: "Client",
};

export const roleProfiles: Record<Role, { name: string; subtitle: string }> = {
  admin: {
    name: "ORDS operations setup.",
    subtitle:
      "Create the first real accounts, rooms, schedules, approvals, and operating rules before families and instructors start using the portal.",
  },
  instructor: {
    name: "Instructor operations dashboard.",
    subtitle:
      "Manage assigned students, clock-ins, lesson reports, homework, and reschedule approvals.",
  },
  parent: {
    name: "Parent account setup.",
    subtitle:
      "After contract approval, a parent account can manage one or more linked students without seeing internal staff tools.",
  },
  student: {
    name: "Student account setup.",
    subtitle:
      "Students see homework, announcements, progress, and approved schedule requests after an admin creates the account.",
  },
  client: {
    name: "Client account setup.",
    subtitle:
      "Clients see assigned coaching homework, announcements, and request options after ORDS creates the account.",
  },
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
