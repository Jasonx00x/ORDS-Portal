"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { PortalUser } from "@/lib/auth";
import { BookingWorkspace } from "@/components/booking/BookingWorkspace";
import { PeopleWorkspace } from "@/components/people/PeopleWorkspace";
import type { BookingWorkspaceData } from "@/lib/booking/types";
import { navItems, roleActions, roleLabels, roleProfiles, type PortalSection, type Role } from "@/lib/roles";

type PortalShellProps = {
  bookingData?: BookingWorkspaceData;
  section: PortalSection;
  user: PortalUser;
};

export function PortalShell({ bookingData, section, user }: PortalShellProps) {
  const pathname = usePathname();
  const [clockStatus, setClockStatus] = useState("Not clocked in");
  const [toast, setToast] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    update();
    const timer = window.setInterval(update, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const role = user.role;
  const visibleNav = navItems.filter((item) => item.roles.includes(role));
  const profile = roleProfiles[role];
  const actions = roleActions[role];

  function notify(message: string) {
    setToast(message);
  }

  function handleClock(direction: "in" | "out") {
    const value = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setClockStatus(direction === "in" ? `Clocked in at ${value}` : `Clocked out at ${value}`);
    notify(`Clock-${direction} recorded for this session. Location captured for this clock event.`);
  }

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <Link className="portal-brand" href="/dashboard">
          <img src="https://static.wixstatic.com/media/a51682_27dfdd46028443e7a016d349782ffa8f~mv2.png" alt="ORDS logo" />
          <span>ORDS Operations</span>
        </Link>

        <div className="role-select-card account-summary">
          <span>Signed In</span>
          <strong>{user.displayName}</strong>
          <small>{roleLabels[role]} account</small>
          {user.email && <small className="account-email">{user.email}</small>}
          <form action="/auth/signout" method="post">
            <button type="submit">Sign Out</button>
          </form>
        </div>

        <nav className="portal-nav" aria-label="Portal sections">
          {visibleNav.map((item) => (
            <Link className={pathname === item.href ? "portal-nav-item active" : "portal-nav-item"} data-section={item.section} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="portal-drive-status">
          <span className="status-dot" />
          <div>
            <strong>Secure Account Access</strong>
            <small>Your ORDS account controls the records and tools shown here.</small>
          </div>
        </div>
      </aside>

      <main className="portal-main">
        <header className="portal-topbar ops-topbar">
          <div>
            <span className="eyebrow tag-on-light">Academy Operating System</span>
            <h1>{profile.name}</h1>
            <p>{profile.subtitle}</p>
          </div>
          <div className="portal-actions">
            {actions.map((action) => (
              <Link className={action.primary ? "portal-action-btn dark-action" : "portal-action-btn"} href={action.href} key={action.href}>
                {action.label}
              </Link>
            ))}
          </div>
        </header>

        <SectionContent bookingData={bookingData} section={section} role={role} userId={user.id} userName={user.displayName} time={time} clockStatus={clockStatus} onClock={handleClock} notify={notify} />
      </main>

      <div className={toast ? "portal-toast show" : "portal-toast"} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

type ContentProps = {
  bookingData?: BookingWorkspaceData;
  section: PortalSection;
  role: Role;
  userId: string;
  userName: string;
  time: string;
  clockStatus: string;
  onClock: (direction: "in" | "out") => void;
  notify: (message: string) => void;
};

function SectionContent(props: ContentProps) {
  switch (props.section) {
    case "dashboard":
      return <Dashboard {...props} />;
    case "booking":
      return props.bookingData
        ? <BookingWorkspace data={props.bookingData} notify={props.notify} role={props.role} userId={props.userId} />
        : null;
    case "students":
      return props.bookingData
        ? <PeopleWorkspace data={props.bookingData} notify={props.notify} role={props.role} />
        : null;
    case "teacher-schedule":
      return props.bookingData ? <TeacherSchedule data={props.bookingData} /> : null;
    case "clock-in":
      return <ClockIn {...props} />;
    case "lesson-reports":
      return <LessonReports data={props.bookingData} role={props.role} />;
    case "reschedule-requests":
      return <RescheduleRequests data={props.bookingData} role={props.role} />;
    case "login-records":
      return <LoginRecords />;
    case "homework":
      return <Homework role={props.role} />;
    case "progress":
      return <Progress />;
    case "billing":
      return <Billing />;
    case "announcements":
      return <Announcements role={props.role} />;
    case "settings":
      return <Settings role={props.role} userName={props.userName} />;
  }
}

function formatPortalDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return date.toLocaleString([], {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/New_York",
    weekday: "short",
  });
}

function Dashboard({ bookingData, role, time, clockStatus, onClock }: ContentProps) {
  const upcomingLessons = (bookingData?.lessons ?? [])
    .filter((lesson) => new Date(lesson.endsAt) >= new Date() && lesson.status !== "cancelled")
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const confirmedLessons = upcomingLessons.filter((lesson) => lesson.status === "scheduled");
  const pendingLessons = upcomingLessons.filter((lesson) => lesson.status === "pending_room_approval");
  const nextLesson = confirmedLessons[0] ?? upcomingLessons[0];

  if (role === "student") {
    return (
      <>
        <div className="portal-grid ops-hero-grid">
          <Hero kicker="Student Portal" title="Your music learning, organized." body="See approved lessons, practice assignments, and ORDS announcements without searching through messages." metrics={[[String(confirmedLessons.length), "Upcoming lessons"], [String(pendingLessons.length), "Awaiting approval"], [String(bookingData?.students.length ?? 0), "Student profile"]]} />
          <Card kicker="Next Lesson" title={nextLesson ? formatPortalDateTime(nextLesson.startsAt) : "No lesson scheduled"} body={nextLesson ? `${nextLesson.program} with ${nextLesson.instructorName} in ${nextLesson.roomName}.` : "Your next approved lesson will appear here when it is scheduled."}>
            <Link className="inline-btn" href="/booking">View Lessons</Link>
          </Card>
        </div>
        <div className="portal-grid student-dashboard-grid">
          <Card kicker="Homework" title="Practice assignments" body="Open your homework area for current instructor assignments and practice notes."><Link className="inline-btn ghost-btn" href="/homework">View Homework</Link></Card>
          <Card kicker="Schedule Requests" title="Changes require approval" body="Choose an available time and submit a request to your instructor or ORDS."><Link className="inline-btn ghost-btn" href="/reschedule-requests">Request Reschedule</Link></Card>
          <Card kicker="Announcements" title="Student updates" body="Academy notices for students are kept separate from internal staff communication."><Link className="inline-btn ghost-btn" href="/announcements">View Announcements</Link></Card>
        </div>
      </>
    );
  }

  if (role === "parent") {
    return (
      <>
        <div className="portal-grid ops-hero-grid">
          <Hero kicker="Parent Portal" title="Your family’s ORDS account." body="Follow linked students, approved lessons, progress updates, schedule requests, and billing status from one account." metrics={[[String(bookingData?.students.length ?? 0), "Linked students"], [String(confirmedLessons.length), "Upcoming lessons"], [String(pendingLessons.length), "Awaiting approval"]]} />
          <Card kicker="Next Lesson" title={nextLesson ? formatPortalDateTime(nextLesson.startsAt) : "No lesson scheduled"} body={nextLesson ? `${nextLesson.studentName} · ${nextLesson.program} · ${nextLesson.roomName}` : "The next approved lesson for a linked student will appear here."}>
            <Link className="inline-btn" href="/booking">View Family Schedule</Link>
          </Card>
        </div>
        <div className="portal-grid student-dashboard-grid">
          <Card kicker="Progress" title="Student progress" body="Review instructor feedback and completed lesson summaries for linked students."><Link className="inline-btn ghost-btn" href="/progress">View Progress</Link></Card>
          <Card kicker="Schedule Requests" title="Approval required" body="Requests are limited to the assigned instructor’s available times."><Link className="inline-btn ghost-btn" href="/reschedule-requests">Request Reschedule</Link></Card>
          <Card kicker="Billing" title="Account status" body="Review billing information associated with your ORDS account."><Link className="inline-btn ghost-btn" href="/billing">View Billing</Link></Card>
        </div>
      </>
    );
  }

  if (role === "client") {
    return (
      <div className="portal-grid ops-hero-grid">
        <Hero kicker="Client Portal" title="Your coaching work in one place." body="Review approved sessions, assigned work, announcements, and schedule requests." metrics={[[String(confirmedLessons.length), "Upcoming sessions"], [String(pendingLessons.length), "Awaiting approval"], [String(bookingData?.students.length ?? 0), "Linked profile"]]} />
        <Card kicker="Next Session" title={nextLesson ? formatPortalDateTime(nextLesson.startsAt) : "No session scheduled"} body={nextLesson ? `${nextLesson.program} with ${nextLesson.instructorName} in ${nextLesson.roomName}.` : "Your next confirmed coaching session will appear here."}><Link className="inline-btn" href="/booking">View Sessions</Link></Card>
      </div>
    );
  }

  if (role === "instructor") {
    return (
      <>
        <div className="portal-grid ops-hero-grid">
          <Hero kicker="Instructor Dashboard" title="Your teaching day at a glance." body="Manage assigned students, availability, lessons, room requests, clock-ins, and lesson follow-up." metrics={[[String(bookingData?.students.length ?? 0), "Assigned students"], [String(confirmedLessons.length), "Upcoming lessons"], [String(bookingData?.availability.length ?? 0), "Availability windows"]]} />
          <ClockWidget time={time} clockStatus={clockStatus} onClock={onClock} compact />
        </div>
        <Card kicker="Next Lesson" title={nextLesson ? formatPortalDateTime(nextLesson.startsAt) : "No lesson scheduled"} body={nextLesson ? `${nextLesson.studentName} · ${nextLesson.program} · ${nextLesson.roomName}` : "Your next assigned lesson will appear here."}><Link className="inline-btn" href="/booking">Open Teaching Calendar</Link></Card>
      </>
    );
  }

  return (
    <>
      <div className="portal-grid stat-grid ops-stats">
        <StatCard label="Active students" value={String(bookingData?.students.filter((student) => student.status === "active").length ?? 0)} detail="Contract-approved and assigned" />
        <StatCard label="Instructors invited" value={String(bookingData?.instructors.length ?? 0)} detail="Active and pending instructor accounts" />
        <StatCard label="Rooms configured" value={String(bookingData?.rooms.filter((room) => room.isActive).length ?? 0)} detail="Available for new lesson requests" />
        <StatCard label="Pending approvals" value={String(bookingData?.approvals.filter((approval) => approval.status === "pending").length ?? 0)} detail="Room requests awaiting a decision" />
      </div>
      <div className="portal-grid two-grid">
        <Hero kicker="Operations Center" title="Run the academy from one workspace." body="Coordinate accounts, rooms, instructor availability, lesson schedules, and room approvals with clear ownership." chips={["Invite-only access", "Room approval", "Conflict checks", "Role permissions"]} />
        <Card kicker="Today’s Schedule" title={nextLesson ? formatPortalDateTime(nextLesson.startsAt) : "No upcoming lessons"} body={nextLesson ? `${nextLesson.studentName} with ${nextLesson.instructorName} in ${nextLesson.roomName}.` : "Approved and pending lessons will appear here as instructors build the schedule."}><Link className="inline-btn" href="/booking">Open Booking Center</Link></Card>
      </div>
    </>
  );
}

const easternDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/New_York",
  year: "numeric",
});

function easternDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = easternDateFormatter.formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function scheduleWeek() {
  const [year, month, day] = easternDateKey(new Date()).split("-").map(Number);
  const today = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        weekday: "short",
      }),
    };
  });
}

function instrumentClass(program: string) {
  const normalized = program.toLowerCase();
  if (normalized.includes("drum")) return "drums";
  if (normalized.includes("guitar")) return "guitar";
  if (normalized.includes("piano") || normalized.includes("key")) return "piano";
  if (normalized.includes("vocal") || normalized.includes("voice")) return "vocals";
  return "audio";
}

function lessonTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function lessonStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TeacherSchedule({ data }: { data: BookingWorkspaceData }) {
  const [instructorId, setInstructorId] = useState("all");
  const week = scheduleWeek();
  const visibleLessons = data.lessons.filter((lesson) =>
    lesson.status !== "cancelled" &&
    (instructorId === "all" || lesson.instructorProfileId === instructorId) &&
    week.some((day) => day.key === easternDateKey(lesson.startsAt))
  );

  return (
    <>
      <div className="portal-grid schedule-control-grid">
        <Hero kicker="Teacher Schedule" title="Live weekly lesson operations." body="This calendar reflects approved and pending lesson records from the Booking Center, including the assigned room and instructor." />
        <Card kicker="Instructor Filter" title={instructorId === "all" ? "All instructors" : data.instructors.find((item) => item.id === instructorId)?.displayName ?? "Instructor"}>
          <label className="portal-field">
            Schedule view
            <select value={instructorId} onChange={(event) => setInstructorId(event.target.value)}>
              <option value="all">All instructors</option>
              {data.instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.displayName}</option>)}
            </select>
          </label>
          <div className="instrument-legend"><span className="inst-drums">Drums</span><span className="inst-guitar">Guitar</span><span className="inst-piano">Piano</span><span className="inst-vocals">Vocals</span><span className="inst-audio">Other</span></div>
        </Card>
      </div>
      <Card kicker="Current Week" title="Weekly schedule">
        {visibleLessons.length === 0 ? (
          <div className="booking-empty">No lessons are scheduled for this instructor during the current week.</div>
        ) : (
          <div className="week-schedule live-week-schedule">
            {week.map((day) => {
              const lessons = visibleLessons.filter((lesson) => easternDateKey(lesson.startsAt) === day.key);
              return (
                <div className="day-column" key={day.key}>
                  <strong>{day.label}</strong>
                  {lessons.length === 0 ? <small className="schedule-day-empty">No lessons</small> : lessons.map((lesson) => (
                    <article className={`lesson-block instrument-${instrumentClass(lesson.program)}`} key={lesson.id}>
                      <b>{lessonTime(lesson.startsAt)}</b>
                      <span>{lesson.studentName}</span>
                      <small>{lesson.program} · {lesson.instructorName}</small>
                      <small>{lesson.roomName} · {lessonStatus(lesson.status)}</small>
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}

function ClockIn({ role, time, clockStatus, onClock }: ContentProps) {
  if (role === "admin") {
    return (
      <div className="portal-grid clock-grid">
        <Card kicker="Clock-In Oversight" title="Instructor clock-in logs" body="Clock events are visible to ORDS operations staff only.">
          <div className="booking-empty">No instructor clock-in records are available.</div>
        </Card>
        <Card kicker="Location Privacy" title="Captured only during a clock event" body="Location is requested only when an instructor chooses Clock In or Clock Out. The portal does not passively track location." />
      </div>
    );
  }
  return (
    <div className="portal-grid clock-grid"><ClockWidget time={time} clockStatus={clockStatus} onClock={onClock} /></div>
  );
}

function LessonReports({ data, role }: { data?: BookingWorkspaceData; role: Role }) {
  const completedLessons = (data?.lessons ?? []).filter((lesson) => lesson.status === "completed");
  const upcomingLessons = (data?.lessons ?? []).filter((lesson) => new Date(lesson.endsAt) >= new Date() && lesson.status === "scheduled");

  return (
    <>
      <div className="portal-grid reports-grid">
        <Hero kicker="Lesson Reports" title={role === "admin" ? "Academy reporting overview." : "Complete lesson follow-up."} body={role === "admin" ? "Review completed lessons and instructor follow-up from one operations view." : "Use each completed lesson record to organize progress notes, homework, and the next lesson focus."} metrics={[[String(completedLessons.length), "Completed lessons"], [String(upcomingLessons.length), "Upcoming lessons"], [String(data?.students.length ?? 0), role === "admin" ? "Students" : "Assigned students"]]} />
        <Card kicker="Report Status" title={completedLessons.length ? `${completedLessons.length} completed lesson${completedLessons.length === 1 ? "" : "s"}` : "No completed lessons"} body={completedLessons.length ? "Completed lesson records are ready for instructor follow-up." : "Lesson reporting begins when a scheduled lesson is marked complete."} />
      </div>
      <Card kicker="Completed Lesson Queue" title="Lessons awaiting follow-up">
        {completedLessons.length === 0 ? <div className="booking-empty">No completed lessons are waiting for a report.</div> : (
          <div className="booking-record-list">
            {completedLessons.map((lesson) => (
              <div className="booking-record" key={lesson.id}><div><strong>{lesson.studentName}</strong><span>{formatPortalDateTime(lesson.startsAt)} · {lesson.program}</span></div><b className="booking-status status-completed">Completed</b></div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function RescheduleRequests({ data, role }: { data?: BookingWorkspaceData; role: Role }) {
  const upcomingLessons = (data?.lessons ?? []).filter((lesson) => new Date(lesson.endsAt) >= new Date() && lesson.status === "scheduled");
  if (role === "instructor" || role === "admin") {
    return <Card kicker="Approval Queue" title="Reschedule requests"><div className="booking-empty">No reschedule requests are awaiting review.</div><p className="portal-note">Requests must match instructor availability and remain subject to room approval.</p></Card>;
  }
  return (
    <Card kicker="Schedule Changes" title="Request a reschedule" body="Reschedule requests require instructor or admin approval.">
      {upcomingLessons.length === 0 ? <div className="booking-empty">There are no confirmed upcoming lessons available to reschedule.</div> : (
        <div className="booking-record-list">
          {upcomingLessons.map((lesson) => <div className="booking-record" key={lesson.id}><div><strong>{lesson.studentName}</strong><span>{formatPortalDateTime(lesson.startsAt)} · {lesson.instructorName}</span></div><b className="booking-status status-scheduled">Scheduled</b></div>)}
        </div>
      )}
      <p className="portal-note">Available replacement times are based on the assigned instructor’s availability and approved ORDS rooms.</p>
    </Card>
  );
}

function LoginRecords() {
  return (
    <>
      <div className="portal-grid login-grid">
        <Hero kicker="Admin Analytics" title="Proof that information was seen." body="Login and activity records help ORDS respond when families say they did not see homework, announcements, schedule changes, or reports." />
        <Card kicker="Communication Snapshot" title="No login records yet" body="Login records begin after invited accounts are activated and used." />
      </div>
      <Card kicker="Parent / Student Login Record Analysis" title="Activity records"><div className="booking-empty">No parent or student activity records are available.</div></Card>
    </>
  );
}

function Homework({ role }: { role: Role }) {
  const isStaff = role === "instructor" || role === "admin";
  return (
    <Card kicker={isStaff ? "Student Assignments" : "Homework"} title={isStaff ? "Homework and practice materials" : "Your assignments"} body={isStaff ? "Homework is shared with students through completed lesson follow-up." : "Current assignments and practice notes from your instructor appear here."}>
      <div className="booking-empty">No homework assignments are available.</div>
    </Card>
  );
}

function Progress() {
  return <div className="portal-grid two-grid"><Hero kicker="Student Progress" title="Lesson progress and instructor feedback." body="Parents can review completed lessons, attendance, instructor notes, and report summaries without seeing internal staff records." metrics={[["0", "Completed lessons"], ["0", "Reports"], ["0", "Attendance issues"]]} /><Card kicker="Instructor Summary" title="No progress notes" body="There are no instructor progress notes for the linked student." /></div>;
}

function Billing() {
  return <div className="portal-grid two-grid"><Hero kicker="Billing" title="Account billing status." body="ORDS manages invoices and payments through its accounting system. This portal keeps lesson operations separate from payment processing." metrics={[["ORDS", "Account support"], ["Private", "Family access"], ["Secure", "No card storage"]]} /><Card kicker="Invoices" title="Billing information"><div className="booking-empty">No billing status is available for this account.</div></Card></div>;
}

function Announcements({ role }: { role: Role }) {
  return (
    <>
      <div className="portal-grid two-grid">
        <Hero kicker="Announcements" title="Separate staff and student communication." body="Internal teacher announcements stay with the instructor team. External announcements go to students and clients with read receipts." />
        {(role === "instructor" || role === "admin") && <Card kicker="Internal Teacher Announcements" title="Staff updates"><div className="booking-empty">No internal staff announcements are available.</div></Card>}
        {role === "admin" && <Card kicker="Student Communication" title="External announcements"><div className="booking-empty">No student announcements have been published.</div></Card>}
      </div>
      {(role === "student" || role === "client") && <Card kicker="External Student Announcements" title="No announcements yet" body="Student announcements appear here after ORDS sends the first external update." />}
    </>
  );
}

function Settings({ role, userName }: { role: Role; userName: string }) {
  return (
    <div className="portal-grid settings-grid">
      <Card kicker="Profile" title={userName} body={`${roleLabels[role]} account`} />
      {role === "admin" && <Card kicker="Account Governance" title="Role-based access" body="Security, records, and approval permissions are managed by role." />}
      {(role === "student" || role === "parent" || role === "client") && <Card kicker="Account Preferences" title="Profile and notifications" body="Update contact details, lesson reminders, approvals, and announcement alerts." />}
      {role === "instructor" && <Card kicker="Instructor Preferences" title="Teaching alerts" body="Clock-in reminders, report due alerts, and request approvals are enabled." />}
      <Card kicker="Notification Controls" title="Enabled by default" body="Lesson reminders, reschedule updates, announcement alerts, and account reminders." />
    </div>
  );
}

function ClockWidget({ time, clockStatus, onClock, compact = false }: { time: string; clockStatus: string; onClock: (direction: "in" | "out") => void; compact?: boolean }) {
  return <Card kicker="Instructor Clock-In" title="Instructor account" body={`Current time: ${time || "--:--"}`}><div className="status-pill">{clockStatus}</div><div className="button-row"><button className="inline-btn" type="button" onClick={() => onClock("in")}>Clock In</button><button className="inline-btn ghost-btn" type="button" onClick={() => onClock("out")}>Clock Out</button></div>{!compact && <small>Location is only captured when instructor clocks in/out.</small>}</Card>;
}

function Hero({ kicker, title, body, metrics, chips }: { kicker: string; title: string; body: string; metrics?: string[][]; chips?: string[] }) {
  return <article className="portal-panel hero-panel ops-hero"><div className="panel-kicker">{kicker}</div><h2>{title}</h2><p>{body}</p>{metrics && <div className="metric-row">{metrics.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>}{chips && <div className="portal-chip-row">{chips.map((chip) => <span key={chip}>{chip}</span>)}</div>}</article>;
}

function Card({ kicker, title, body, children }: { kicker: string; title: string; body?: string; children?: ReactNode }) {
  return <article className="portal-panel"><div className="panel-kicker">{kicker}</div><h3>{title}</h3>{body && <p>{body}</p>}{children}</article>;
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="portal-panel stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Table({ rows }: { rows: string[][] }) {
  return <div className="ops-table compact-ops-table">{rows.map((row) => <div key={row.join("-")}>{row.map((cell, index) => index === 0 ? <strong key={cell}>{cell}</strong> : <span key={`${cell}-${index}`}>{cell}</span>)}</div>)}</div>;
}
