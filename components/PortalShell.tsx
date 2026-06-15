"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { assignedInstructorByRole, dashboardStats, homeworkByRole, lessonBlocks } from "@/lib/demo-data";
import { canAccess, defaultPathForRole, navItems, roleLabels, roleProfiles, type PortalSection, type Role } from "@/lib/roles";

const roles = Object.keys(roleLabels) as Role[];

type PortalShellProps = {
  section: PortalSection;
};

export function PortalShell({ section }: PortalShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<Role>("admin");
  const [roleReady, setRoleReady] = useState(false);
  const [clockStatus, setClockStatus] = useState("Not clocked in");
  const [toast, setToast] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("ords-role") as Role | null;
    if (saved && roles.includes(saved)) setRole(saved);
    setRoleReady(true);
  }, []);

  useEffect(() => {
    if (!roleReady) return;
    window.localStorage.setItem("ords-role", role);
    if (!canAccess(role, section)) router.replace(defaultPathForRole(role));
  }, [role, roleReady, router, section]);

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

  const visibleNav = useMemo(() => navItems.filter((item) => item.roles.includes(role)), [role]);
  const profile = roleProfiles[role];

  function changeRole(nextRole: Role) {
    setRole(nextRole);
  }

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

        <div className="role-select-card">
          <span>Portal Access</span>
          <div className="role-picker" aria-label="Portal access role switcher">
            {roles.map((item) => (
              <button
                aria-pressed={item === role}
                className={item === role ? "role-tab active" : "role-tab"}
                data-role={item}
                key={item}
                type="button"
                onClick={() => changeRole(item)}
              >
                {roleLabels[item]}
              </button>
            ))}
          </div>
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
                <Link className="portal-action-btn dark-action" href="/reschedule-requests">Review Requests</Link>
                <Link className="portal-action-btn" href="/lesson-reports">Submit Report</Link>
              </>
            )}
          </div>
        </header>

        <SectionContent section={section} role={role} time={time} clockStatus={clockStatus} onClock={handleClock} notify={notify} />
      </main>

      <div className={toast ? "portal-toast show" : "portal-toast"} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

type ContentProps = {
  section: PortalSection;
  role: Role;
  time: string;
  clockStatus: string;
  onClock: (direction: "in" | "out") => void;
  notify: (message: string) => void;
};

function SectionContent(props: ContentProps) {
  switch (props.section) {
    case "dashboard":
      return <Dashboard {...props} />;
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

function Dashboard({ role, time, clockStatus, onClock }: ContentProps) {
  if (role === "student") {
    return (
      <>
        <div className="portal-grid ops-hero-grid">
          <Hero kicker="Student Portal" title="Welcome back, Mateo." body="Your homework, announcements, progress, and reschedule requests are organized in one place." metrics={[["Sat", "Next lesson"], ["Viewed", "Homework status"], ["1", "Open announcement"]]} />
          <Card kicker="Request Control" title="Reschedules are requests only." body="Students can submit a preferred time and reason, but changes require instructor/admin approval.">
            <Link className="inline-btn" href="/reschedule-requests">Request Reschedule</Link>
          </Card>
        </div>
        <div className="portal-grid student-dashboard-grid">
          <Card kicker="Today’s Practice" title="Drum groove at 72 BPM" body="Practice the worship groove slowly, then upload one clean video before Friday night." />
          <Card kicker="Latest Instructor Note" title="Stronger timing this week." body="Jason noted better control on eighth notes. Next focus is cleaner fills into the chorus groove." />
          <Card kicker="Open Announcement" title="June recital prep week" body="Please review your practice plan and confirm your recital preparation schedule.">
            <Link className="inline-btn ghost-btn" href="/announcements">View Announcement</Link>
          </Card>
          <Card kicker="Schedule Request" title="No active request" body="Choose an available opening from your assigned instructor if your lesson time no longer works." />
        </div>
      </>
    );
  }

  if (role === "parent") {
    return (
      <div className="portal-grid ops-hero-grid">
        <Hero kicker="Parent Portal" title="Clear student visibility." body="Track student progress, billing, notifications, and reschedule status without internal staff tools." metrics={[["88%", "Student progress"], ["Sat", "Next lesson"], ["$180", "Open invoice"]]} />
        <Card kicker="Parent Assurance" title="Schedule changes are approved." body="Parents can request a change, but ORDS keeps instructor/admin control over final lesson times.">
          <Link className="inline-btn" href="/progress">View Progress</Link>
        </Card>
      </div>
    );
  }

  if (role === "client") {
    return (
      <div className="portal-grid ops-hero-grid">
        <Hero kicker="Independent Client" title="Studio coaching, organized." body="View assigned homework, read announcements, and request schedule changes from approved instructor availability." metrics={[["Thu", "Next session"], ["5", "Homework items"], ["Pending", "Schedule request"]]} />
        <Card kicker="Next Focus" title="Mix balance and EQ discipline" body="Upload the revised mix before the next studio coaching session." />
      </div>
    );
  }

  if (role === "instructor") {
    return (
      <div className="portal-grid ops-hero-grid">
        <Hero kicker="Instructor Workflow" title="Clock in. Teach. Submit reports." body="Manage assigned students, homework, lesson reports, attendance, and reschedule approvals." metrics={[["6", "Lessons today"], ["2", "Reports missing"], ["1", "Late arrival"]]} />
        <ClockWidget time={time} clockStatus={clockStatus} onClock={onClock} compact />
      </div>
    );
  }

  return (
    <>
      <div className="portal-grid stat-grid ops-stats">
        {dashboardStats.map(([label, value, detail]) => <StatCard key={label} label={label} value={value} detail={detail} />)}
      </div>
      <div className="portal-grid two-grid">
        <Hero kicker="Operations Value" title="Know what happened before a parent calls." body="Leadership can see attendance, report completion, login records, homework visibility, read receipts, and pending approvals from one clean dashboard." chips={["Accountability", "Scheduling", "Communication proof", "Reports"]} />
        <Card kicker="Today’s Priority Queue" title="Needs attention" body="Bryan missing clock-in, Mateo reschedule pending, Ari inactive login, and four lesson reports missing." />
      </div>
    </>
  );
}

function Students({ notify }: { notify: (message: string) => void }) {
  return (
    <Card kicker="Students" title="Roster, accountability, and family visibility">
      <button className="inline-btn" type="button" onClick={() => notify("Student intake workflow opened.")}>Add Student</button>
      <Table rows={[
        ["Mateo Ramos", "Drums", "Jason Alfaro", "97%", "Homework needs one video upload", "On track"],
        ["Ari Thompson", "Piano", "David", "88%", "Practice consistency needs follow-up", "Needs follow-up"],
        ["Naomi Lee", "Vocals", "Bryan", "94%", "Strong progress on breath support", "On track"],
        ["Jordan Cruz", "Audio", "Oscar Ramos", "100%", "Mix draft ready for review", "Client"],
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
      <Card kicker="June 8 - June 14" title="Weekly schedule">
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
      {role === "admin" && <Card kicker="Admin View" title="Clock-in logs"><Table rows={[["Jason Alfaro", "Clocked in", "7:55 AM", "Location captured"], ["Bryan", "Missing clock-in", "Expected 4:00 PM", "Not captured"], ["David", "Clocked in", "3:02 PM", "Location captured"]]} /></Card>}
    </div>
  );
}

function LessonReports({ notify }: { notify: (message: string) => void }) {
  return (
    <>
      <div className="portal-grid reports-grid">
        <Hero kicker="Instructor Reports" title="Quick end-of-lesson reporting." body="Instructors can submit progress notes, homework, attendance, and next lesson focus immediately after teaching." metrics={[["18", "Submitted today"], ["4", "Missing reports"], ["3 min", "Average entry"]]} />
        <Card kicker="Report Status" title="Recent reports" body="Jason submitted Mateo’s report. Bryan has one missing report after a no-show. David submitted Ari’s late arrival note." />
      </div>
      <div className="portal-grid two-grid">
        <Card kicker="End-of-Lesson Report Form" title="Mateo Ramos">
          <label className="portal-field">Student progress notes<textarea defaultValue="Stronger timing at 72 BPM. Needs smoother fills into chorus groove." /></label>
          <label className="portal-field">Homework assigned<textarea defaultValue="Practice eighth-note groove 10 minutes daily and upload one video by Friday." /></label>
          <button className="inline-btn" type="button" onClick={() => notify("Lesson report saved and homework assigned.")}>Submit Lesson Report</button>
        </Card>
        <Card kicker="Missing Reports" title="Needs follow-up"><Table rows={[["Bryan", "Camila Reyes", "Wed 4:30 PM", "Missing"], ["Bryan", "Sofia Vega", "Fri 3:00 PM", "Due soon"], ["Jason Alfaro", "Elijah Moore", "Wed 6:00 PM", "Draft"]]} /></Card>
      </div>
    </>
  );
}

function RescheduleRequests({ role, notify }: { role: Role; notify: (message: string) => void }) {
  if (role === "instructor" || role === "admin") {
    return <Card kicker="Instructor / Admin Approval Queue" title="Pending approvals"><Table rows={[["Mateo Ramos", "Sat 11:00 AM", "Thu 5:30 PM", "Pending"], ["Naomi Lee", "Fri 3:00 PM", "Mon 4:00 PM", "Approved"], ["Jordan Cruz", "Thu 6:30 PM", "Tue 7:00 PM", "Denied"]]} /></Card>;
  }
  return (
    <Card kicker="Reschedule Request" title="Request Reschedule" body="Reschedule requests require instructor/admin approval.">
      <label className="portal-field">Assigned instructor<input value={assignedInstructorByRole[role]} readOnly /></label>
      <label className="portal-field">Available times<select defaultValue="Thursday, June 12 at 5:30 PM"><option>Thursday, June 12 at 5:30 PM</option><option>Saturday, June 14 at 12:30 PM</option><option>Monday, June 16 at 4:00 PM</option></select></label>
      <label className="portal-field">Reason<textarea defaultValue="Family appointment conflicts with the original lesson time." /></label>
      <button className="inline-btn" type="button" onClick={() => notify("Reschedule request submitted as pending.")}>Submit Request</button>
    </Card>
  );
}

function LoginRecords({ notify }: { notify: (message: string) => void }) {
  return (
    <>
      <div className="portal-grid login-grid">
        <Hero kicker="Admin Analytics" title="Proof that information was seen." body="Login and activity records help ORDS respond when families say they did not see homework, announcements, schedule changes, or reports." />
        <Card kicker="Communication Snapshot" title="14/20 read receipts" body="86 total logins this month. 5 families have not logged in recently." />
      </div>
      <Card kicker="Parent / Student Login Record Analysis" title="Activity records">
        <button className="inline-btn" type="button" onClick={() => notify("Activity report export prepared.")}>Export Activity Report</button>
        <Table rows={[["Ramos Family", "Yesterday 7:42 PM", "Today 4:14 PM", "Viewed"], ["Thompson Family", "June 2", "12 days inactive", "Not viewed"], ["Lee Family", "Today 9:12 AM", "Yesterday 6:28 PM", "Viewed"]]} />
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
  return <div className="portal-grid two-grid"><Hero kicker="Student Progress" title="Mateo is on track this month." body="Parents can view progress, attendance, instructor feedback, and report summaries without seeing internal admin records." metrics={[["97%", "Attendance"], ["84%", "Practice consistency"], ["72%", "Timing focus"]]} /><Card kicker="Instructor Summary" title="Progress notes" body="Mateo is improving consistency and confidence. Next focus is cleaner transitions between groove patterns." /></div>;
}

function Billing() {
  return <div className="portal-grid two-grid"><Hero kicker="Billing" title="QuickBooks payment status" body="Parents can see tuition status while QuickBooks remains the official payment and accounting system." metrics={[["$180", "Current invoice"], ["Sent", "Invoice status"], ["Jun 10", "Due date"]]} /><Card kicker="Invoices" title="QuickBooks"><Table rows={[["June Tuition", "$180", "Sent", "QuickBooks"], ["May Tuition", "$180", "Paid", "QuickBooks"], ["Studio Add-on", "$60", "Paid", "QuickBooks"]]} /></Card></div>;
}

function Announcements({ role, notify }: { role: Role; notify: (message: string) => void }) {
  return (
    <>
      <div className="portal-grid two-grid">
        <Hero kicker="Announcements" title="Separate staff and student communication." body="Internal teacher announcements stay with the instructor team. External announcements go to students and clients with read receipts." />
        {(role === "instructor" || role === "admin") && <Card kicker="Internal Teacher Announcements" title="Staff updates" body="Clock-in reminder, report deadline, and Thursday room change are active." />}
        {role === "admin" && <Card kicker="Create Internal Announcement" title="Saturday room assignments"><button className="inline-btn" type="button" onClick={() => notify("Internal announcement queued for teachers.")}>Send to Teachers</button></Card>}
        {role === "admin" && <Card kicker="Create External Announcement" title="June recital prep week"><button className="inline-btn" type="button" onClick={() => notify("External announcement queued for students and clients.")}>Send to Students</button></Card>}
      </div>
      {(role === "student" || role === "client") && <Card kicker="External Student Announcements" title="Latest updates" body="June recital prep week, homework reminder, and studio policy update." />}
      {role === "admin" && <Card kicker="External Student Announcements" title="Read receipts"><Table rows={[["June recital prep week", "All families", "14/20", "6 unread"], ["Homework reminder", "Drum students", "9/10", "Healthy"], ["Studio policy update", "Clients", "3/3", "Complete"]]} /></Card>}
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
  return <Card kicker="Instructor Clock-In" title="Jason Alfaro" body={`Current time: ${time || "--:--"}`}><div className="status-pill">{clockStatus}</div><div className="button-row"><button className="inline-btn" type="button" onClick={() => onClock("in")}>Clock In</button><button className="inline-btn ghost-btn" type="button" onClick={() => onClock("out")}>Clock Out</button></div>{!compact && <small>Location is only captured when instructor clocks in/out.</small>}</Card>;
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
