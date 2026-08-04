import { accessSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const rolesSource = readFileSync(join(root, "lib/roles.ts"), "utf8");
const bookingSource = readFileSync(join(root, "lib/booking-data.ts"), "utf8");
const rolesModule = ts.transpileModule(rolesSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
const bookingModule = ts.transpileModule(bookingSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
const rolesDataUrl = `data:text/javascript;base64,${Buffer.from(rolesModule.outputText).toString("base64")}`;
const bookingDataUrl = `data:text/javascript;base64,${Buffer.from(bookingModule.outputText).toString("base64")}`;
const { navItems, roleLabels } = await import(rolesDataUrl);
const { bookingRooms, bookingSlots, roomConflictRows } = await import(bookingDataUrl);

const expectedNav = {
  admin: [
    "Dashboard",
    "Booking",
    "Students",
    "Teacher Schedule",
    "Clock-In Logs",
    "Lesson Reports",
    "Reschedule Requests",
    "Login Records",
    "Homework",
    "Progress",
    "Billing",
    "Announcements",
    "Settings",
  ],
  instructor: ["Dashboard", "Booking", "Students", "Clock-In Logs", "Lesson Reports", "Reschedule Requests", "Homework", "Announcements", "Settings"],
  parent: ["Dashboard", "Booking", "Reschedule Requests", "Progress", "Billing", "Settings"],
  student: ["Dashboard", "Booking", "Reschedule Requests", "Homework", "Announcements", "Settings"],
  client: ["Dashboard", "Booking", "Reschedule Requests", "Homework", "Announcements", "Settings"],
};

const requiredRoutes = [
  "app/dashboard/page.tsx",
  "app/booking/page.tsx",
  "app/students/page.tsx",
  "app/schedule/page.tsx",
  "app/clock-in/page.tsx",
  "app/lesson-reports/page.tsx",
  "app/reschedule-requests/page.tsx",
  "app/login-records/page.tsx",
  "app/homework/page.tsx",
  "app/progress/page.tsx",
  "app/billing/page.tsx",
  "app/announcements/page.tsx",
  "app/settings/page.tsx",
  "app/login/page.tsx",
  "app/api/supabase/status/route.ts",
  "app/api/consultations/book/route.ts",
  "app/api/consultations/slots/route.ts",
  "app/book-consultation/page.tsx",
  "app/admin/consultations/page.tsx",
  "app/admin/consultations/availability/page.tsx",
  "app/admin/consultations/settings/page.tsx",
  "lib/supabase-config.ts",
  "lib/consultations/constants.ts",
  "lib/consultations/email-service.ts",
  "lib/consultations/email-templates.ts",
  "lib/consultations/supabase-rest.ts",
  "lib/consultations/validation.ts",
  "supabase/migrations/202607140001_create_consultation_booking_system.sql",
  "supabase/migrations/202607290001_create_ords_core_setup_scheduling.sql",
  "docs/consultation-booking-system.md",
  "scripts/test-consultation-contract.mjs",
  ".env.example",
];

const visibleUiFiles = [
  "components/PortalShell.tsx",
  "components/people/PeopleWorkspace.tsx",
  "app/login/page.tsx",
  "components/consultations/ConsultationBookingPage.tsx",
  "components/consultations/ConsultationAdminPage.tsx",
];
const blockedPreviewTerms = [/Karina/i, /Oscar/i, /\bCFO\b/i, /\bCEO\b/i, /\bMVP\b/i, /QuickBooks/i, /Supabase/i, /Mock Role/i, /Phase 1/i];
const failures = [];

for (const role of Object.keys(roleLabels)) {
  const actual = navItems.filter((item) => item.roles.includes(role)).map((item) => item.label);
  const expected = expectedNav[role];
  if (!expected) {
    failures.push(`Missing expected navigation contract for role: ${role}`);
    continue;
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`Navigation mismatch for ${role}: expected [${expected.join(", ")}], got [${actual.join(", ")}]`);
  }
}

for (const route of requiredRoutes) {
  try {
    accessSync(join(root, route));
  } catch {
    failures.push(`Missing route file: ${route}`);
  }
}

const envExample = readFileSync(join(root, ".env.example"), "utf8");
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "RESEND_API_KEY", "ORDS_EMAIL_FROM", "ORDS_DEFAULT_NOTIFICATION_EMAIL"]) {
  if (!envExample.includes(key)) failures.push(`Missing ${key} in .env.example`);
}

const statusRoute = readFileSync(join(root, "app/api/supabase/status/route.ts"), "utf8");
for (const internalField of ["projectRef:", "publishableKey:", "statusText:"]) {
  if (statusRoute.includes(internalField)) failures.push(`Public connection status exposes internal field: ${internalField}`);
}

const schedulingMigration = readFileSync(
  join(root, "supabase/migrations/202607290001_create_ords_core_setup_scheduling.sql"),
  "utf8",
);
for (const requiredSchemaRule of [
  "profile_id uuid unique references public.app_profiles",
  "lesson_schedules_room_no_overlap",
  "lesson_schedules_instructor_no_overlap",
  "lesson_schedules_student_no_overlap",
  "Instructors create assigned lesson requests",
  "Students view own lesson schedules",
  "Instructors create own room approvals",
]) {
  if (!schedulingMigration.includes(requiredSchemaRule)) failures.push(`Missing scheduling schema rule: ${requiredSchemaRule}`);
}

for (const file of visibleUiFiles) {
  const source = readFileSync(join(root, file), "utf8");
  for (const term of blockedPreviewTerms) {
    if (term.test(source)) failures.push(`Preview-only wording found in ${file}: ${term}`);
  }
}

const requiredRooms = ["Studio", "Drum Room", "Auditorium", "Youth Room", "Extra Room"];
const configuredRooms = bookingRooms.map((room) => room.name);
for (const room of requiredRooms) {
  if (!configuredRooms.includes(room)) failures.push(`Missing required ORDS room: ${room}`);
}

for (const slot of bookingSlots) {
  if (!configuredRooms.includes(slot.location)) failures.push(`Booking slot ${slot.id} uses unconfigured room: ${slot.location}`);
}

const roomConflicts = roomConflictRows();
if (roomConflicts.some((row) => row.includes("Conflict"))) {
  failures.push("Room conflict check found a double-booked room.");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Portal validation passed.");
