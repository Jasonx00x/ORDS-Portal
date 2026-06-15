export type Role = "admin" | "instructor" | "parent" | "student" | "client";

export type PortalSection =
  | "dashboard"
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
    name: "ORDS operations dashboard.",
    subtitle:
      "Instructor accountability, scheduling control, login records, communication proof, and report completion in one organized workspace.",
  },
  instructor: {
    name: "Instructor operations dashboard.",
    subtitle:
      "Manage assigned students, clock-ins, lesson reports, homework, and reschedule approvals.",
  },
  parent: {
    name: "Good afternoon, Parent.",
    subtitle:
      "View student progress, billing status, settings, and reschedule request status without internal staff tools.",
  },
  student: {
    name: "Good afternoon, Mateo.",
    subtitle:
      "Your homework, announcements, progress, and approved reschedule requests in one focused workspace.",
  },
  client: {
    name: "Welcome back, Jordan.",
    subtitle:
      "View assigned homework, announcements, and reschedule requests for your coaching sessions.",
  },
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", section: "dashboard", roles: ["student", "parent", "client", "instructor", "admin"] },
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
