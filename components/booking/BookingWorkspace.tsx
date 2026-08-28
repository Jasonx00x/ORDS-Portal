"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAvailabilityAction,
  addRoomAction,
  addStudentAction,
  assignStudentAction,
  decideApprovalAction,
  deleteAvailabilityAction,
  deleteUnavailabilityAction,
  inviteInstructorAction,
  saveSchoolHoursAction,
  setRoomStatusAction,
  type BookingActionResult,
} from "@/app/booking/actions";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { BookingEmbedBuilder } from "@/components/booking/BookingEmbedBuilder";
import type { BookingAssignment, BookingLesson, BookingWorkspaceData } from "@/lib/booking/types";
import type { Role } from "@/lib/roles";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type BookingWorkspaceProps = {
  data: BookingWorkspaceData;
  notify: (message: string) => void;
  role: Role;
  userId: string;
};

function formatTime(value: string) {
  const [hour = "0", minute = "00"] = value.split(":");
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(value: string) {
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

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function assignmentKey(assignment: BookingAssignment) {
  return `${assignment.instructorProfileId}|${assignment.studentId}|${encodeURIComponent(assignment.program)}`;
}

function BookingCard({
  body,
  children,
  kicker,
  title,
}: {
  body?: string;
  children?: React.ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <article className="portal-panel booking-live-card">
      <div className="panel-kicker">{kicker}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {children}
    </article>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="booking-empty">{children}</div>;
}

export function BookingWorkspace({ data, notify, role, userId }: BookingWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const isAdmin = role === "admin";
  const isInstructor = role === "instructor";
  const isStaff = isAdmin || isInstructor;

  const instructorById = useMemo(() => new Map(data.instructors.map((item) => [item.id, item])), [data.instructors]);
  const studentById = useMemo(() => new Map(data.students.map((item) => [item.id, item])), [data.students]);
  const roomById = useMemo(() => new Map(data.rooms.map((item) => [item.id, item])), [data.rooms]);
  const lessonById = useMemo(() => new Map(data.lessons.map((item) => [item.id, item])), [data.lessons]);
  const visibleAvailability = isInstructor
    ? data.availability.filter((item) => item.instructorProfileId === userId)
    : data.availability;
  const visibleUnavailability = isInstructor
    ? data.unavailability.filter((item) => item.instructorProfileId === userId)
    : data.unavailability;
  const activeRooms = data.rooms.filter((room) => room.isActive);
  const pendingApprovals = data.approvals.filter((approval) => approval.status === "pending");
  const upcomingLessons = data.lessons.filter((lesson) => new Date(lesson.endsAt) >= new Date() && lesson.status !== "cancelled");
  const upcomingConsultations = data.consultations.filter(
    (consultation) => new Date(consultation.endsAt) >= new Date() && consultation.status !== "cancelled",
  );

  const setupItems = [
    { complete: activeRooms.length > 0, label: "Active rooms" },
    { complete: data.schoolHours.some((item) => item.isEnabled), label: "School hours" },
    { complete: data.instructors.length > 0, label: "Instructor account" },
    { complete: data.students.length > 0, label: "Contracted student" },
    { complete: data.assignments.length > 0, label: "Instructor assignment" },
    { complete: data.availability.length > 0, label: "Teaching availability" },
  ];
  const completedSetup = setupItems.filter((item) => item.complete).length;

  function run(action: () => Promise<BookingActionResult>, reset?: () => void) {
    startTransition(async () => {
      const result = await action();
      notify(result.message);
      if (result.ok) {
        reset?.();
        router.refresh();
      }
    });
  }

  function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run(() => addRoomAction({
      bestFor: String(values.get("bestFor") ?? ""),
      name: String(values.get("name") ?? ""),
    }), () => form.reset());
  }

  function submitHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    run(() => saveSchoolHoursAction({
      closesAt: String(values.get("closesAt") ?? ""),
      dayOfWeek: Number(values.get("dayOfWeek")),
      isEnabled: true,
      opensAt: String(values.get("opensAt") ?? ""),
    }));
  }

  function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run(() => addStudentAction({
      displayName: String(values.get("displayName") ?? ""),
      primaryProgram: String(values.get("primaryProgram") ?? ""),
    }), () => form.reset());
  }

  function submitInstructor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run(() => inviteInstructorAction({
      displayName: String(values.get("displayName") ?? ""),
      email: String(values.get("email") ?? ""),
      phone: String(values.get("phone") ?? ""),
    }), () => form.reset());
  }

  function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    run(() => assignStudentAction({
      instructorProfileId: String(values.get("instructorProfileId") ?? ""),
      program: String(values.get("program") ?? ""),
      studentId: String(values.get("studentId") ?? ""),
    }));
  }

  function submitAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    run(() => addAvailabilityAction({
      dayOfWeek: Number(values.get("dayOfWeek")),
      endsAt: String(values.get("endsAt") ?? ""),
      instructorProfileId: isInstructor ? userId : String(values.get("instructorProfileId") ?? ""),
      startsAt: String(values.get("startsAt") ?? ""),
    }));
  }

  if (!isStaff) {
    return (
      <>
        <article className="portal-panel hero-panel ops-hero booking-live-hero">
          <div className="panel-kicker">Lesson Schedule</div>
          <h2>Your approved ORDS lessons.</h2>
          <p>New lesson times are created by the assigned instructor and become confirmed after room approval. Schedule changes use the Reschedule Requests page.</p>
          <div className="metric-row">
            <div><strong>{upcomingLessons.filter((lesson) => lesson.status === "scheduled").length}</strong><span>Confirmed lessons</span></div>
            <div><strong>{upcomingLessons.filter((lesson) => lesson.status === "pending_room_approval").length}</strong><span>Pending approval</span></div>
            <div><strong>ORDS</strong><span>Controls final schedule</span></div>
          </div>
        </article>
        <BookingCard kicker="Upcoming" title="Lesson schedule">
          {upcomingLessons.length === 0 ? (
            <EmptyState>No lessons are scheduled yet. Your assigned instructor will add the first lesson after account setup.</EmptyState>
          ) : (
            <div className="booking-record-list">
              {upcomingLessons.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} />)}
            </div>
          )}
        </BookingCard>
      </>
    );
  }

  return (
    <>
      <div className="portal-grid booking-hero-grid">
        <article className="portal-panel hero-panel ops-hero booking-live-hero">
          <div className="panel-kicker">{isAdmin ? "Booking Operations" : "Instructor Scheduling"}</div>
          <h2>{isAdmin ? "Build the live ORDS lesson calendar." : "Manage your real teaching schedule."}</h2>
          <p>{isAdmin
            ? "Configure the academy once, then create conflict-checked lessons and approve every room assignment before it reaches the confirmed calendar."
            : "Publish your teaching windows, block unavailable dates, and schedule assigned students. Every room request stays pending until owner approval."}</p>
          <div className="metric-row">
            <div><strong>{upcomingLessons.length}</strong><span>Upcoming lessons</span></div>
            <div><strong>{pendingApprovals.length}</strong><span>Pending approvals</span></div>
            <div>
              <strong>{isAdmin ? upcomingConsultations.length : activeRooms.length}</strong>
              <span>{isAdmin ? "Website consultations" : "Active rooms"}</span>
            </div>
          </div>
        </article>
        <BookingCard kicker="System Status" title={isAdmin ? `${completedSetup} of ${setupItems.length} setup steps complete` : "Scheduling safeguards active"}>
          <div className="booking-setup-list">
            {isAdmin ? setupItems.map((item) => (
              <div className={item.complete ? "complete" : ""} key={item.label}>
                <span aria-hidden="true">{item.complete ? "OK" : ""}</span>
                <strong>{item.label}</strong>
                <small>{item.complete ? "Ready" : "Needs setup"}</small>
              </div>
            )) : (
              <>
                <div className="complete"><span aria-hidden="true">OK</span><strong>Room collision checks</strong><small>Active</small></div>
                <div className="complete"><span aria-hidden="true">OK</span><strong>Owner approval</strong><small>Required</small></div>
                <div className="complete"><span aria-hidden="true">OK</span><strong>Assigned students only</strong><small>Enforced</small></div>
              </>
            )}
          </div>
        </BookingCard>
      </div>

      <BookingCalendar data={data} notify={notify} role={role} userId={userId} />

      {isAdmin && (
        <>
          <div className="portal-grid booking-instructor-section">
            <BookingCard kicker="Instructor Accounts" title="Invite and manage instructors" body="Each instructor receives a private account invitation and creates their own password.">
              <form className="setup-form-grid booking-form booking-instructor-form" onSubmit={submitInstructor}>
                <label className="portal-field">Full name<input autoComplete="name" name="displayName" required /></label>
                <label className="portal-field">Email<input autoComplete="email" name="email" required type="email" /></label>
                <label className="portal-field">Phone <span className="optional-label">optional</span><input autoComplete="tel" name="phone" type="tel" /></label>
                <button className="inline-btn booking-form-button" disabled={isPending} type="submit">
                  {isPending ? "Working..." : "Send Invitation"}
                </button>
              </form>
              {data.instructors.length === 0 ? <EmptyState>No instructors have been invited yet.</EmptyState> : (
                <div className="booking-record-list">
                  {data.instructors.map((instructor) => (
                    <div className="booking-record" key={instructor.id}>
                      <div><strong>{instructor.displayName}</strong><span>Instructor account</span></div>
                      <b className={`booking-status status-${instructor.inviteStatus}`}>{statusLabel(instructor.inviteStatus)}</b>
                    </div>
                  ))}
                </div>
              )}
            </BookingCard>
          </div>
          <div className="portal-grid booking-embed-section">
            <BookingEmbedBuilder notify={notify} upcomingCount={upcomingConsultations.length} />
          </div>
        </>
      )}

      {isAdmin && (
        <div className="portal-grid booking-admin-grid">
          <BookingCard kicker="Rooms" title="Academy rooms" body="Pause a room to remove it from new lesson requests. Existing records stay intact.">
            <div className="room-card-grid live-room-grid">
              {data.rooms.map((room) => (
                <article className={`room-card ${room.isActive ? "room-open" : "room-blocked"}`} key={room.id}>
                  <strong>{room.name}</strong>
                  <span>{room.bestFor}</span>
                  <small>{room.requiresOwnerApproval ? "Owner approval required" : "No approval required"}</small>
                  <button
                    className="booking-text-button"
                    disabled={isPending}
                    onClick={() => run(() => setRoomStatusAction({ id: room.id, isActive: !room.isActive }))}
                    type="button"
                  >
                    {room.isActive ? "Pause room" : "Activate room"}
                  </button>
                </article>
              ))}
            </div>
            <form className="booking-inline-form" onSubmit={submitRoom}>
              <label className="portal-field">Room name<input name="name" placeholder="New room" required /></label>
              <label className="portal-field">Best for<input name="bestFor" placeholder="Lessons or room use" required /></label>
              <button className="inline-btn" disabled={isPending} type="submit">Add Room</button>
            </form>
          </BookingCard>

          <BookingCard kicker="Operating Hours" title="School hours" body="Lesson requests must fit completely inside an enabled day.">
            <form className="setup-form-grid booking-form" onSubmit={submitHours}>
              <label className="portal-field">Day<select name="dayOfWeek" defaultValue="1">{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
              <label className="portal-field">Opens<input name="opensAt" type="time" defaultValue="15:00" required /></label>
              <label className="portal-field">Closes<input name="closesAt" type="time" defaultValue="21:00" required /></label>
              <button className="inline-btn booking-form-button" disabled={isPending} type="submit">Save Day</button>
            </form>
            {data.schoolHours.length === 0 ? (
              <EmptyState>Add at least one school day before instructor availability can be saved.</EmptyState>
            ) : (
              <div className="booking-hours-grid">
                {data.schoolHours.map((hour) => (
                  <div key={hour.id}>
                    <strong>{shortDayNames[hour.dayOfWeek]}</strong>
                    <span>{hour.isEnabled ? `${formatTime(hour.opensAt)} - ${formatTime(hour.closesAt)}` : "Closed"}</span>
                  </div>
                ))}
              </div>
            )}
          </BookingCard>
        </div>
      )}

      {isAdmin && (
        <div className="portal-grid booking-admin-grid">
          <BookingCard kicker="Student Roster" title="Add contracted students" body="Use this only after ORDS has approved the family contract. Portal login access can be invited separately.">
            <form className="setup-form-grid booking-form" onSubmit={submitStudent}>
              <label className="portal-field">Student name<input name="displayName" required /></label>
              <label className="portal-field">Primary program<input name="primaryProgram" placeholder="Piano, Drums, Vocals..." required /></label>
              <button className="inline-btn booking-form-button" disabled={isPending} type="submit">Add Student</button>
            </form>
            {data.students.length === 0 ? <EmptyState>No contracted students have been added.</EmptyState> : (
              <div className="booking-record-list">
                {data.students.map((student) => (
                  <div className="booking-record" key={student.id}>
                    <div><strong>{student.displayName}</strong><span>{student.primaryProgram}</span></div>
                    <b className={`booking-status status-${student.status}`}>{statusLabel(student.status)}</b>
                  </div>
                ))}
              </div>
            )}
          </BookingCard>

          <BookingCard kicker="Instructor Assignment" title="Connect students to teachers" body={data.instructors.length === 0 ? "Invite an instructor account first. The instructor will appear here automatically." : "A student must be assigned before that instructor can create a lesson."}>
            <form className="setup-form-grid booking-form" onSubmit={submitAssignment}>
              <label className="portal-field">Student<select name="studentId" required defaultValue=""><option value="" disabled>Select student</option>{data.students.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}</select></label>
              <label className="portal-field">Instructor<select name="instructorProfileId" required defaultValue=""><option value="" disabled>Select instructor</option>{data.instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.displayName}</option>)}</select></label>
              <label className="portal-field">Program<input name="program" placeholder="Match the student program" required /></label>
              <button className="inline-btn booking-form-button" disabled={isPending || data.students.length === 0 || data.instructors.length === 0} type="submit">Assign Instructor</button>
            </form>
            {data.assignments.length === 0 ? <EmptyState>No instructor assignments yet.</EmptyState> : (
              <div className="booking-record-list">
                {data.assignments.map((assignment) => (
                  <div className="booking-record" key={assignmentKey(assignment)}>
                    <div><strong>{studentById.get(assignment.studentId)?.displayName ?? "Student"}</strong><span>{assignment.program}</span></div>
                    <span>{instructorById.get(assignment.instructorProfileId)?.displayName ?? "Instructor"}</span>
                  </div>
                ))}
              </div>
            )}
          </BookingCard>
        </div>
      )}

      <div className="portal-grid booking-admin-grid">
        <BookingCard kicker="Weekly Availability" title={isAdmin ? "Instructor teaching windows" : "Your teaching windows"} body="Availability must fit within the academy's school hours. Add more than one window when a teacher has a break.">
          <form className="setup-form-grid booking-form" onSubmit={submitAvailability}>
            {isAdmin && <label className="portal-field">Instructor<select name="instructorProfileId" required defaultValue=""><option value="" disabled>Select instructor</option>{data.instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.displayName}</option>)}</select></label>}
            <label className="portal-field">Day<select name="dayOfWeek" defaultValue="1">{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
            <label className="portal-field">Starts<input name="startsAt" type="time" defaultValue="16:00" required /></label>
            <label className="portal-field">Ends<input name="endsAt" type="time" defaultValue="20:00" required /></label>
            <button className="inline-btn booking-form-button" disabled={isPending || data.schoolHours.length === 0 || (isAdmin && data.instructors.length === 0)} type="submit">Add Availability</button>
          </form>
          {visibleAvailability.length === 0 ? <EmptyState>No teaching availability has been added.</EmptyState> : (
            <div className="booking-record-list">
              {visibleAvailability.map((window) => (
                <div className="booking-record" key={window.id}>
                  <div>
                    <strong>{dayNames[window.dayOfWeek]}</strong>
                    <span>{formatTime(window.startsAt)} - {formatTime(window.endsAt)}</span>
                  </div>
                  {isAdmin && <span>{instructorById.get(window.instructorProfileId)?.displayName ?? "Instructor"}</span>}
                  <button className="booking-icon-button" disabled={isPending} onClick={() => run(() => deleteAvailabilityAction(window.id))} title="Remove availability" type="button" aria-label="Remove availability">X</button>
                </div>
              ))}
            </div>
          )}
        </BookingCard>

        <BookingCard kicker="Time Off" title={isAdmin ? "Instructor unavailable periods" : "Your blocked time"} body="Blackout periods override normal weekly availability and prevent new lessons.">
          {visibleUnavailability.length === 0 ? <EmptyState>No upcoming unavailable periods.</EmptyState> : (
            <div className="booking-record-list">
              {visibleUnavailability.map((period) => (
                <div className="booking-record" key={period.id}>
                  <div><strong>{formatDateTime(period.startsAt)}</strong><span>Until {formatDateTime(period.endsAt)}{period.reason ? ` | ${period.reason}` : ""}</span></div>
                  <button className="booking-icon-button" disabled={isPending} onClick={() => run(() => deleteUnavailabilityAction(period.id))} title="Remove unavailable period" type="button" aria-label="Remove unavailable period">X</button>
                </div>
              ))}
            </div>
          )}
        </BookingCard>
      </div>

      <div className="portal-grid">
        <BookingCard kicker="Approval Queue" title={isAdmin ? "Room requests awaiting a decision" : "Your room request status"}>
          {pendingApprovals.length === 0 ? <EmptyState>No room requests are waiting for approval.</EmptyState> : (
            <div className="booking-approval-list">
              {pendingApprovals.map((approval) => {
                const lesson = lessonById.get(approval.lessonScheduleId);
                if (!lesson) return null;
                return (
                  <article key={approval.id}>
                    <div>
                      <strong>{lesson.studentName}</strong>
                      <span>{formatDateTime(lesson.startsAt)}</span>
                      <small>{lesson.program} | {lesson.roomName} | {lesson.instructorName}</small>
                    </div>
                    {isAdmin ? (
                      <>
                        <label className="portal-field">Decision note<input value={decisionNotes[approval.id] ?? ""} onChange={(event) => setDecisionNotes((current) => ({ ...current, [approval.id]: event.target.value }))} placeholder="Optional" /></label>
                        <div className="button-row">
                          <button className="inline-btn" disabled={isPending} onClick={() => run(() => decideApprovalAction({ decision: "approved", decisionNote: decisionNotes[approval.id] ?? "", requestId: approval.id }))} type="button">Approve</button>
                          <button className="inline-btn ghost-btn" disabled={isPending} onClick={() => run(() => decideApprovalAction({ decision: "denied", decisionNote: decisionNotes[approval.id] ?? "", requestId: approval.id }))} type="button">Deny</button>
                        </div>
                      </>
                    ) : <b className="booking-status status-pending">Pending owner approval</b>}
                  </article>
                );
              })}
            </div>
          )}
        </BookingCard>
      </div>

      <BookingCard kicker="Live Schedule" title="Upcoming lesson records" body="Pending lessons hold their requested room to prevent double-booking. Denied requests release it automatically.">
        {upcomingLessons.length === 0 ? <EmptyState>The schedule is ready for its first real lesson.</EmptyState> : (
          <div className="booking-record-list booking-schedule-list">
            {upcomingLessons.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} />)}
          </div>
        )}
      </BookingCard>
    </>
  );
}

function LessonRow({ lesson }: { lesson: BookingLesson }) {
  return (
    <div className="booking-record lesson-record">
      <div>
        <strong>{lesson.studentName}</strong>
        <span>{formatDateTime(lesson.startsAt)} | {lesson.roomName}</span>
        <small>{lesson.program} with {lesson.instructorName}</small>
      </div>
      <b className={`booking-status status-${lesson.status}`}>{statusLabel(lesson.status)}</b>
    </div>
  );
}
