"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addStudentAction,
  assignStudentAction,
  inviteInstructorAction,
  inviteStudentAction,
  type BookingActionResult,
} from "@/app/booking/actions";
import type { BookingWorkspaceData } from "@/lib/booking/types";
import type { Role } from "@/lib/roles";

type PeopleWorkspaceProps = {
  data: BookingWorkspaceData;
  notify: (message: string) => void;
  role: Role;
};

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function PeopleCard({
  body,
  children,
  kicker,
  title,
}: {
  body: string;
  children: React.ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <article className="portal-panel people-card">
      <div className="panel-kicker">{kicker}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {children}
    </article>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="booking-empty">{children}</div>;
}

export function PeopleWorkspace({ data, notify, role }: PeopleWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [workingForm, setWorkingForm] = useState<"assignment" | "instructor" | "student" | "student-access" | null>(null);
  const isAdmin = role === "admin";
  const acceptedInstructors = data.instructors.filter((instructor) => instructor.inviteStatus === "accepted").length;
  const activeStudents = data.students.filter((student) => student.status === "active").length;
  const studentsWithAccess = data.students.filter((student) => Boolean(student.profileId)).length;

  function run(
    formName: "assignment" | "instructor" | "student" | "student-access",
    action: () => Promise<BookingActionResult>,
    reset?: () => void,
  ) {
    setWorkingForm(formName);
    startTransition(async () => {
      const result = await action();
      notify(result.message);
      if (result.ok) {
        reset?.();
        router.refresh();
      }
      setWorkingForm(null);
    });
  }

  function submitInstructor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run("instructor", () => inviteInstructorAction({
      displayName: String(values.get("displayName") ?? ""),
      email: String(values.get("email") ?? ""),
      phone: String(values.get("phone") ?? ""),
    }), () => form.reset());
  }

  function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run("student", () => addStudentAction({
      displayName: String(values.get("displayName") ?? ""),
      email: String(values.get("email") ?? ""),
      primaryProgram: String(values.get("primaryProgram") ?? ""),
    }), () => form.reset());
  }

  function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run("assignment", () => assignStudentAction({
      instructorProfileId: String(values.get("instructorProfileId") ?? ""),
      program: String(values.get("program") ?? ""),
      studentId: String(values.get("studentId") ?? ""),
    }), () => form.reset());
  }

  function submitStudentAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    run("student-access", () => inviteStudentAction({
      email: String(values.get("email") ?? ""),
      studentId: String(values.get("studentId") ?? ""),
    }), () => form.reset());
  }

  if (!isAdmin) {
    return (
      <>
        <article className="portal-panel hero-panel ops-hero people-hero">
          <div className="panel-kicker">Assigned Students</div>
          <h2>Your teaching roster.</h2>
          <p>Only students assigned to your instructor account appear here. ORDS controls new student accounts and instructor assignments.</p>
          <div className="metric-row">
            <div><strong>{data.students.length}</strong><span>Assigned students</span></div>
            <div><strong>{data.assignments.length}</strong><span>Program assignments</span></div>
            <div><strong>{activeStudents}</strong><span>Ready to schedule</span></div>
          </div>
        </article>
        <PeopleCard kicker="Roster" title="Your students" body="Use Booking to create lessons only for these assigned students.">
          {data.students.length === 0 ? (
            <EmptyState>No students have been assigned to this instructor account yet.</EmptyState>
          ) : (
            <div className="booking-record-list">
              {data.students.map((student) => (
                <div className="booking-record" key={student.id}>
                  <div><strong>{student.displayName}</strong><span>{student.primaryProgram}</span></div>
                  <b className={`booking-status status-${student.status}`}>{statusLabel(student.status)}</b>
                </div>
              ))}
            </div>
          )}
          {data.students.some((student) => !student.profileId) && (
            <div className="people-access-block">
              <strong>Invite portal access</strong>
              <span>Use this for a roster student who needs their own login now or whose earlier invitation was not delivered.</span>
              <form className="people-access-form" data-testid="student-access-form" onSubmit={submitStudentAccess}>
                <label className="portal-field">Student<select defaultValue="" name="studentId" required><option disabled value="">Select student</option>{data.students.filter((student) => !student.profileId).map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}</select></label>
                <label className="portal-field">Student email<input autoComplete="email" name="email" required type="email" /></label>
                <button className="inline-btn people-form-button" disabled={isPending} type="submit">
                  {workingForm === "student-access" ? "Sending Invitation..." : "Send Student Invite"}
                </button>
              </form>
            </div>
          )}
        </PeopleCard>
      </>
    );
  }

  return (
    <>
      <article className="portal-panel hero-panel ops-hero people-hero">
        <div className="panel-kicker">People &amp; Access</div>
        <h2>Create the ORDS teaching roster.</h2>
        <p>Invite instructor accounts, add contract-approved students, and connect each student to the instructor responsible for scheduling lessons.</p>
        <div className="metric-row">
          <div><strong>{data.instructors.length}</strong><span>Instructors invited</span></div>
          <div><strong>{data.students.length}</strong><span>Students added</span></div>
          <div><strong>{data.assignments.length}</strong><span>Teacher assignments</span></div>
          <div><strong>{studentsWithAccess}</strong><span>Student logins</span></div>
        </div>
      </article>

      <div className="portal-grid people-grid">
        <PeopleCard kicker="Instructor Accounts" title="Invite an instructor" body="The instructor receives a private password-setup link. Public signup remains disabled.">
          <form className="setup-form-grid people-form" data-testid="instructor-invite-form" onSubmit={submitInstructor}>
            <label className="portal-field">Full name<input autoComplete="name" name="displayName" required /></label>
            <label className="portal-field">Email<input autoComplete="email" name="email" required type="email" /></label>
            <label className="portal-field">Phone <span className="optional-label">optional</span><input autoComplete="tel" name="phone" type="tel" /></label>
            <button className="inline-btn people-form-button" disabled={isPending} type="submit">
              {workingForm === "instructor" ? "Sending Invitation..." : "Send Instructor Invite"}
            </button>
          </form>
          {data.instructors.length === 0 ? (
            <EmptyState>No instructors have been invited yet.</EmptyState>
          ) : (
            <div className="booking-record-list people-record-list">
              {data.instructors.map((instructor) => (
                <div className="booking-record" key={instructor.id}>
                  <div><strong>{instructor.displayName}</strong><span>{instructor.inviteStatus === "accepted" ? "Portal access active" : "Invitation awaiting acceptance"}</span></div>
                  <b className={`booking-status status-${instructor.inviteStatus}`}>{statusLabel(instructor.inviteStatus)}</b>
                </div>
              ))}
            </div>
          )}
          {data.instructors.length > 0 && <p className="people-summary">{acceptedInstructors} of {data.instructors.length} instructor accounts active</p>}
        </PeopleCard>

        <PeopleCard kicker="Student Roster" title="Add a contracted student" body="A student email is optional. Leave it blank when a parent will manage the student without a separate login.">
          <form className="setup-form-grid people-form" data-testid="student-create-form" onSubmit={submitStudent}>
            <label className="portal-field">Student name<input autoComplete="off" name="displayName" required /></label>
            <label className="portal-field">Primary program<input name="primaryProgram" placeholder="Piano, Drums, Guitar..." required /></label>
            <label className="portal-field people-form-wide">Student email <span className="optional-label">optional portal access</span><input autoComplete="email" name="email" type="email" /></label>
            <button className="inline-btn people-form-button" disabled={isPending} type="submit">
              {workingForm === "student" ? "Adding Student..." : "Add Student"}
            </button>
          </form>
          {data.students.length === 0 ? (
            <EmptyState>No contracted students have been added yet.</EmptyState>
          ) : (
            <div className="booking-record-list people-record-list">
              {data.students.map((student) => (
                <div className="booking-record" key={student.id}>
                  <div>
                    <strong>{student.displayName}</strong>
                    <span>{student.primaryProgram} | {student.profileId ? "Student login invited" : "Managed roster profile"}</span>
                  </div>
                  <b className={`booking-status status-${student.status}`}>{statusLabel(student.status)}</b>
                </div>
              ))}
            </div>
          )}
        </PeopleCard>
      </div>

      <PeopleCard kicker="Teacher Assignment" title="Connect a student to an instructor" body="Assignments control which students an instructor can view and schedule.">
        <form className="people-assignment-form" data-testid="student-assignment-form" onSubmit={submitAssignment}>
          <label className="portal-field">Student<select defaultValue="" name="studentId" required><option disabled value="">Select student</option>{data.students.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}</select></label>
          <label className="portal-field">Instructor<select defaultValue="" name="instructorProfileId" required><option disabled value="">Select instructor</option>{data.instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.displayName}</option>)}</select></label>
          <label className="portal-field">Program<input name="program" placeholder="Student program" required /></label>
          <button className="inline-btn people-form-button" disabled={isPending || data.students.length === 0 || data.instructors.length === 0} type="submit">
            {workingForm === "assignment" ? "Saving Assignment..." : "Assign Instructor"}
          </button>
        </form>
        {data.students.length === 0 || data.instructors.length === 0 ? (
          <EmptyState>Add at least one student and invite one instructor before creating an assignment.</EmptyState>
        ) : data.assignments.length === 0 ? (
          <EmptyState>No student-to-instructor assignments have been created.</EmptyState>
        ) : (
          <div className="booking-record-list people-record-list">
            {data.assignments.map((assignment) => {
              const student = data.students.find((item) => item.id === assignment.studentId);
              const instructor = data.instructors.find((item) => item.id === assignment.instructorProfileId);
              return (
                <div className="booking-record" key={`${assignment.instructorProfileId}-${assignment.studentId}-${assignment.program}`}>
                  <div><strong>{student?.displayName ?? "Student"}</strong><span>{instructor?.displayName ?? "Instructor"} | {assignment.program}</span></div>
                  <b className="booking-status status-active">Assigned</b>
                </div>
              );
            })}
          </div>
        )}
      </PeopleCard>
    </>
  );
}
