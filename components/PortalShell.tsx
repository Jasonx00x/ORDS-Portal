"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { PortalUser } from "@/lib/auth";
import { BookingWorkspace } from "@/components/booking/BookingWorkspace";
import type { BookingWorkspaceData } from "@/lib/booking/types";
import { assignedInstructorByRole, homeworkByRole, lessonBlocks } from "@/lib/demo-data";
import { navItems, roleLabels, roleProfiles, type PortalSection, type Role } from "@/lib/roles";

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

  function notify(message: string) {
    setToast(message);
  }

  function handleClock(direction: "in" | "out") {
    const value = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setClockStatus(direction === "in" ? `Clocked in at ${value}` : `Clocked out at ${value}`);
    notify(`Clock-${direction} saved. Location captured for this clock event.`);
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
            <strong>Access Controls Active</strong>
            <small>Role-based navigation is ready for connected accounts.</small>
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
            {(role === "instructor" || role === "admin") && (
              <>
                <Link className="portal-action-btn" href="/booking">Manage Booking</Link>
                <Link className="portal-action-btn dark-action" href="/reschedule-requests">Review Requests</Link>
                <Link className="portal-action-btn" href="/lesson-reports">Submit Report</Link>
              </>
            )}
            {(role === "student" || role === "parent" || role === "client") && <Link className="portal-action-btn dark-action" href="/booking">Request Lesson</Link>}
          </div>
        </header>

        <SectionContent bookingData={bookingData} section={section} role={role} userId={user.id} time={time} clockStatus={clockStatus} onClock={handleClock} notify={notify} />
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
      return <Students notify={props.notify} />;
    case "teacher-schedule":
      return <TeacherSchedule />;
    case "clock-in":
      return <ClockIn {...props} />;
    case "lesson-reports":
      return <LessonReports notify={props.notify} />;
    case "reschedule-requests":
      return <RescheduleRequests role={props.role} notify={props.notify} />;
    case "login-records":
      return <LoginRecords notify={props.notify} />;
    case "homework":
      return <Homework role={props.role} notify={props.notify} />;
    case "progress":
      return <Progress />;
    case "billing":
      return <Billing />;
    case "announcements":
      return <Announcements role={props.role} notify={props.notify} />;
    case "settings":
      return <Settings role={props.role} />;
  }
}

function Dashboard({ bookingData, role, time, clockStatus, onClock }: ContentProps) {
  if (role === "student") {
    return (
      <>
        <div className="portal-grid ops-hero-grid">
          <Hero kicker="Student Portal" title="Ready after admin setup." body="Students can use the portal after ORDS creates the account, assigns an instructor, and approves the first lesson schedule." metrics={[["Invite", "Account access"], ["1 hr", "Lesson length"], ["Assigned", "Teacher required"]]} />
          <Card kicker="Booking" title="Requests use approved teacher openings." body="Students can only choose times from their assigned instructor’s available schedule and approved room options.">
            <Link className="inline-btn" href="/booking">Request Lesson</Link>
          </Card>
        </div>
        <div className="portal-grid student-dashboard-grid">
          <Card kicker="Homework" title="No assignments yet" body="Homework appears here after the instructor submits a lesson report or assignment." />
          <Card kicker="Instructor Note" title="No report yet" body="Progress notes begin after the first completed lesson." />
          <Card kicker="Announcements" title="No student announcements yet" body="Student announcements appear here once ORDS sends external updates.">
            <Link className="inline-btn ghost-btn" href="/announcements">View Announcement</Link>
          </Card>
          <Card kicker="Booking Request" title="No active request" body="Available openings appear after the assigned instructor adds availability." />
        </div>
      </>
    );
  }

  if (role === "parent") {
    return (
      <div className="portal-grid ops-hero-grid">
        <Hero kicker="Parent Portal" title="Access begins after contract approval." body="Parents cannot self-register. An ORDS administrator creates the parent account, links one or more students, then sends the password setup invite." metrics={[["Admin", "Creates account"], ["1+", "Linked students"], ["Later", "Billing connection"]]} />
        <Card kicker="Parent Assurance" title="Schedule changes are approved." body="Parents request from available times only. ORDS keeps instructor and room approval control over final lesson times.">
          <Link className="inline-btn" href="/booking">View Booking</Link>
        </Card>
      </div>
    );
  }

  if (role === "client") {
    return (
      <div className="portal-grid ops-hero-grid">
        <Hero kicker="Client Portal" title="Coaching starts after account setup." body="Clients are invited by ORDS, assigned to a coach, and can request sessions from approved coach openings." metrics={[["Invite", "Required"], ["Assigned", "Coach"], ["Approved", "Room use"]]} />
        <Card kicker="Next Focus" title="No coaching notes yet" body="Coaching notes and homework appear after the first completed session." />
      </div>
    );
  }

  if (role === "instructor") {
    return (
      <div className="portal-grid ops-hero-grid">
        <Hero kicker="Instructor Workflow" title="Set availability before teaching." body="After an ORDS administrator sends an invite, instructors add availability, receive assigned students, request rooms, clock in, and submit reports after lessons." metrics={[["Invite", "Password setup"], ["1 hr", "Default lesson"], ["Approval", "Room use"]]} />
        <ClockWidget time={time} clockStatus={clockStatus} onClock={onClock} compact />
      </div>
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
        <Hero kicker="First Run Setup" title="Build ORDS before families log in." body="Start with owner access, rooms, instructors, contracted families, student assignments, school hours, and room approval rules." chips={["Invite-only", "Room approval", "1-hour lessons", "Billing later"]} />
        <Card kicker="Next Step" title="Configure booking foundation" body="Set ORDS rooms, school hours, instructor availability, and approval rules before opening parent/student access.">
          <Link className="inline-btn" href="/booking">Open Booking Center</Link>
        </Card>
      </div>
    </>
  );
}

function Students({ notify }: { notify: (message: string) => void }) {
  return (
    <Card kicker="Students" title="Contract-approved roster setup">
      <button className="inline-btn" type="button" onClick={() => notify("Student intake starts after the contract is approved.")}>Add Student</button>
      <Table rows={[
        ["Step 1", "Create parent account", "After contract approval", "Invite email"],
        ["Step 2", "Create student profile", "Link parent and assign instructor", "Required"],
        ["Step 3", "Build 1-hour lesson", "Choose instructor opening and room", "Owner/admin approves"],
        ["Step 4", "Open portal access", "Student homework and parent progress", "Billing connection later"],
      ]} />
    </Card>
  );
}

function TeacherSchedule() {
  return (
    <>
      <div className="portal-grid schedule-control-grid">
        <Hero kicker="Teacher Schedule" title="Weekly lesson view with status clarity." body="Leadership can quickly understand who is teaching, which students are expected, and what needs attention." />
        <Card kicker="Instructor Filter" title="All instructors">
          <div className="instrument-legend"><span className="inst-drums">Drums</span><span className="inst-guitar">Guitar</span><span className="inst-piano">Piano</span><span className="inst-vocals">Vocals</span><span className="inst-audio">Audio</span></div>
        </Card>
      </div>
      <Card kicker="Setup Week" title="Weekly schedule">
        <div className="week-schedule">
          {lessonBlocks.map((day) => (
            <div className="day-column" key={day.day}>
              <strong>{day.day}</strong>
              {day.lessons.map(([time, student, instrument, instructor, status, type]) => (
                <article className={`lesson-block instrument-${type}`} key={`${day.day}-${time}`}>
                  <b>{time}</b><span>{student}</span><small>{instrument} · {instructor} · {status}</small>
                </article>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function ClockIn({ role, time, clockStatus, onClock }: ContentProps) {
  return (
    <div className="portal-grid clock-grid">
      <ClockWidget time={time} clockStatus={clockStatus} onClock={onClock} />
      {role === "admin" && <Card kicker="Admin View" title="Clock-in logs"><Table rows={[["No instructors invited", "No clock-ins yet", "Invite instructors first", "Waiting"], ["Location rule", "Captured only on clock-in/out", "Never passive tracking", "Ready"]]} /></Card>}
    </div>
  );
}

function LessonReports({ notify }: { notify: (message: string) => void }) {
  return (
    <>
      <div className="portal-grid reports-grid">
        <Hero kicker="Instructor Reports" title="Reports start after the first lesson." body="Instructors submit progress notes, homework, attendance, and next lesson focus immediately after teaching." metrics={[["0", "Submitted today"], ["0", "Missing reports"], ["Ready", "Form setup"]]} />
        <Card kicker="Report Status" title="No lesson reports yet" body="Reports will appear here once an ORDS administrator invites instructors, assigns students, and the first lesson is completed." />
      </div>
      <div className="portal-grid two-grid">
        <Card kicker="End-of-Lesson Report Form" title="Assigned student">
          <label className="portal-field">Student progress notes<textarea defaultValue="Add progress notes after the lesson." /></label>
          <label className="portal-field">Homework assigned<textarea defaultValue="Add homework for the student to see in the portal." /></label>
          <button className="inline-btn" type="button" onClick={() => notify("Lesson report saved and homework assigned.")}>Submit Lesson Report</button>
        </Card>
        <Card kicker="Missing Reports" title="No missing reports yet"><Table rows={[["No lessons yet", "Invite instructors", "Assign students", "Then track reports"]]} /></Card>
      </div>
    </>
  );
}

function RescheduleRequests({ role, notify }: { role: Role; notify: (message: string) => void }) {
  if (role === "instructor" || role === "admin") {
    return <Card kicker="Instructor / Admin Approval Queue" title="No reschedule requests yet"><Table rows={[["New request", "Original lesson", "Available new time", "Pending approval"], ["Rule", "Assigned instructor only", "Room availability required", "Owner/admin controls rooms"]]} /></Card>;
  }
  return (
    <Card kicker="Reschedule Request" title="Request Reschedule" body="Reschedule requests require instructor/admin approval.">
      <label className="portal-field">Assigned instructor<input value={assignedInstructorByRole[role]} readOnly /></label>
      <label className="portal-field">Available times<select defaultValue="No assigned lesson yet"><option>No assigned lesson yet</option><option>Openings appear after instructor availability is configured</option></select></label>
      <label className="portal-field">Reason<textarea defaultValue="Choose an available time after the first lesson schedule is created." /></label>
      <button className="inline-btn" type="button" onClick={() => notify("Reschedule request submitted as pending.")}>Submit Request</button>
    </Card>
  );
}

function LoginRecords({ notify }: { notify: (message: string) => void }) {
  return (
    <>
      <div className="portal-grid login-grid">
        <Hero kicker="Admin Analytics" title="Proof that information was seen." body="Login and activity records help ORDS respond when families say they did not see homework, announcements, schedule changes, or reports." />
        <Card kicker="Communication Snapshot" title="No login records yet" body="Login records begin after invited accounts are activated and used." />
      </div>
      <Card kicker="Parent / Student Login Record Analysis" title="Activity records">
        <button className="inline-btn" type="button" onClick={() => notify("Activity report export prepared.")}>Export Activity Report</button>
        <Table rows={[["No parent accounts yet", "Invite after contract", "No student login yet", "Waiting"], ["No read receipts yet", "Send announcement later", "No homework views yet", "Waiting"]]} />
      </Card>
    </>
  );
}

function Homework({ role, notify }: { role: Role; notify: (message: string) => void }) {
  return (
    <Card kicker="Homework" title="Assignments and practice materials">
      {(role === "instructor" || role === "admin") && <button className="inline-btn" type="button" onClick={() => notify("Assignment composer opened.")}>Assign Homework</button>}
      <div className="resource-grid ops-resource-grid">
        {homeworkByRole[role].map((item) => <div key={item.title}><strong>{item.title}</strong><span>{item.detail}</span></div>)}
      </div>
    </Card>
  );
}

function Progress() {
  return <div className="portal-grid two-grid"><Hero kicker="Student Progress" title="Progress starts after lessons are completed." body="Parents can view progress, attendance, instructor feedback, and report summaries without seeing internal admin records." metrics={[["0", "Completed lessons"], ["0", "Reports"], ["Ready", "Tracking"]]} /><Card kicker="Instructor Summary" title="No progress notes yet" body="Progress notes appear after instructors submit lesson reports." /></div>;
}

function Billing() {
  return <div className="portal-grid two-grid"><Hero kicker="Billing" title="External accounting stays separate." body="The portal can show billing status later, but parents will not submit payments through the ORDS Portal in this phase." metrics={[["Later", "Accounting sync"], ["Hidden", "No portal payments"], ["Ready", "Status display"]]} /><Card kicker="Invoices" title="Accounting connection later"><Table rows={[["Billing source", "External accounting", "Connect later", "Not in this phase"], ["Portal display", "Status only", "No payment handling", "Planned"]]} /></Card></div>;
}

function Announcements({ role, notify }: { role: Role; notify: (message: string) => void }) {
  return (
    <>
      <div className="portal-grid two-grid">
        <Hero kicker="Announcements" title="Separate staff and student communication." body="Internal teacher announcements stay with the instructor team. External announcements go to students and clients with read receipts." />
        {(role === "instructor" || role === "admin") && <Card kicker="Internal Teacher Announcements" title="Staff updates" body="Clock-in reminder, report deadline, and Thursday room change are active." />}
        {role === "admin" && <Card kicker="Create Internal Announcement" title="Saturday room assignments"><button className="inline-btn" type="button" onClick={() => notify("Internal announcement queued for teachers.")}>Send to Teachers</button></Card>}
        {role === "admin" && <Card kicker="Create External Announcement" title="Student announcement draft"><button className="inline-btn" type="button" onClick={() => notify("External announcement queued for students and clients.")}>Send to Students</button></Card>}
      </div>
      {(role === "student" || role === "client") && <Card kicker="External Student Announcements" title="No announcements yet" body="Student announcements appear here after ORDS sends the first external update." />}
      {role === "admin" && <Card kicker="External Student Announcements" title="Read receipts"><Table rows={[["No announcements sent", "No families invited yet", "0/0", "Waiting"], ["Student updates", "External audience", "Tracked later", "Ready"]]} /></Card>}
      {(role === "instructor" || role === "admin") && <Card kicker="Internal Announcement Log" title="Teacher read receipts"><Table rows={[["Clock-in reminder", "Teachers", "5/6", "1 unread"], ["Report deadline", "Teachers", "6/6", "Complete"], ["Room change", "Thursday staff", "3/3", "Complete"]]} /></Card>}
    </>
  );
}

function Settings({ role }: { role: Role }) {
  return (
    <div className="portal-grid settings-grid">
      <Card kicker="Profile" title="ORDS Account User" body={`Current role: ${roleLabels[role]}`} />
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
