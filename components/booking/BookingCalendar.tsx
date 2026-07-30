"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type {
  BusinessHoursInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addUnavailabilityAction,
  cancelLessonAction,
  createLessonAction,
  deleteUnavailabilityAction,
  type BookingActionResult,
} from "@/app/booking/actions";
import type {
  BookingAssignment,
  BookingConsultation,
  BookingLesson,
  BookingUnavailability,
  BookingWorkspaceData,
} from "@/lib/booking/types";
import { isoToEasternCalendarValue } from "@/lib/booking/time";
import type { Role } from "@/lib/roles";

type CalendarDialog =
  | { kind: "create"; mode: "lesson" | "block"; startsAt: string; endsAt: string }
  | { kind: "lesson"; lessonId: string }
  | { kind: "blocked"; unavailableId: string }
  | { kind: "consultation"; consultationId: string }
  | null;

type BookingCalendarProps = {
  data: BookingWorkspaceData;
  notify: (message: string) => void;
  role: Role;
  userId: string;
};

function localInputValue(value: Date) {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function localClockValue(value: Date) {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
}

function fitsDailyWindow(
  startsAt: Date,
  endsAt: Date,
  windows: Array<{ dayOfWeek: number; endsAt: string; isEnabled: boolean; startsAt: string }>,
) {
  if (startsAt.toDateString() !== endsAt.toDateString()) return false;
  const dayOfWeek = startsAt.getDay();
  const startTime = localClockValue(startsAt);
  const endTime = localClockValue(endsAt);
  return windows.some((window) =>
    window.isEnabled &&
    window.dayOfWeek === dayOfWeek &&
    startTime >= window.startsAt &&
    endTime <= window.endsAt
  );
}

function formatEastern(value: string) {
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

function instrumentClass(program: string) {
  const normalized = program.toLowerCase();
  if (normalized.includes("drum")) return "drums";
  if (normalized.includes("guitar")) return "guitar";
  if (normalized.includes("piano") || normalized.includes("key")) return "piano";
  if (normalized.includes("vocal") || normalized.includes("voice")) return "vocals";
  return "other";
}

function calendarRange(data: BookingWorkspaceData) {
  const enabled = data.schoolHours.filter((item) => item.isEnabled);
  if (enabled.length === 0) {
    return { max: "22:00:00", min: "08:00:00", scroll: "14:00:00" };
  }
  const starts = enabled.map((item) => item.opensAt);
  const ends = enabled.map((item) => item.closesAt);
  const min = starts.sort()[0] ?? "08:00:00";
  const max = ends.sort().at(-1) ?? "22:00:00";
  return { max, min, scroll: min > "13:00:00" ? min : "13:00:00" };
}

function EventContent({ event, timeText }: EventContentArg) {
  const subtitle = String(event.extendedProps.subtitle ?? "");
  return (
    <div className="ords-calendar-event-content">
      {timeText && <b>{timeText}</b>}
      <span>{event.title}</span>
      {subtitle && <small>{subtitle}</small>}
    </div>
  );
}

export function BookingCalendar({ data, notify, role, userId }: BookingCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<CalendarDialog>(null);
  const [instructorFilter, setInstructorFilter] = useState(role === "instructor" ? userId : "all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState("");
  const [blockInstructorId, setBlockInstructorId] = useState(role === "instructor" ? userId : "");
  const isAdmin = role === "admin";

  const instructorById = useMemo(
    () => new Map(data.instructors.map((item) => [item.id, item])),
    [data.instructors],
  );
  const studentById = useMemo(
    () => new Map(data.students.map((item) => [item.id, item])),
    [data.students],
  );
  const activeRooms = useMemo(() => data.rooms.filter((item) => item.isActive), [data.rooms]);
  const visibleAssignments = useMemo(
    () => data.assignments.filter((assignment) =>
      role === "instructor"
        ? assignment.instructorProfileId === userId
        : instructorFilter === "all" || assignment.instructorProfileId === instructorFilter
    ),
    [data.assignments, instructorFilter, role, userId],
  );
  const selectedAssignment = visibleAssignments.find(
    (assignment) => assignmentKey(assignment) === selectedAssignmentKey,
  ) ?? visibleAssignments[0];
  const range = useMemo(() => calendarRange(data), [data]);

  useEffect(() => {
    if (!selectedAssignment || visibleAssignments.some((item) => assignmentKey(item) === selectedAssignmentKey)) {
      return;
    }
    setSelectedAssignmentKey(assignmentKey(selectedAssignment));
  }, [selectedAssignment, selectedAssignmentKey, visibleAssignments]);

  useEffect(() => {
    if (role === "instructor") return;
    if (instructorFilter !== "all") {
      setBlockInstructorId(instructorFilter);
    } else if (!blockInstructorId && data.instructors[0]) {
      setBlockInstructorId(data.instructors[0].id);
    }
  }, [blockInstructorId, data.instructors, instructorFilter, role]);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    calendarRef.current?.getApi().changeView("timeGridDay");
  }, []);

  const businessHours = useMemo<BusinessHoursInput>(() =>
    data.schoolHours
      .filter((item) => item.isEnabled)
      .map((item) => ({
        daysOfWeek: [item.dayOfWeek],
        endTime: item.closesAt,
        startTime: item.opensAt,
      })), [data.schoolHours]);

  const events = useMemo<EventInput[]>(() => {
    const lessonEvents: EventInput[] = data.lessons
      .filter((lesson) => {
        if (lesson.status === "cancelled") return false;
        const matchesInstructor = role === "instructor"
          ? lesson.instructorProfileId === userId
          : instructorFilter === "all" || lesson.instructorProfileId === instructorFilter;
        const matchesRoom = roomFilter === "all" || lesson.roomId === roomFilter;
        const hasTwoSpecificFilters = instructorFilter !== "all" && roomFilter !== "all";
        return hasTwoSpecificFilters ? matchesInstructor || matchesRoom : matchesInstructor && matchesRoom;
      })
      .map((lesson) => ({
        classNames: [
          "ords-calendar-event",
          `calendar-${lesson.status === "pending_room_approval" ? "pending" : "lesson"}`,
          `calendar-instrument-${instrumentClass(lesson.program)}`,
        ],
        end: isoToEasternCalendarValue(lesson.endsAt),
        extendedProps: {
          kind: "lesson",
          instructorProfileId: lesson.instructorProfileId,
          lessonId: lesson.id,
          roomId: lesson.roomId,
          subtitle: `${lesson.program} | ${lesson.roomName}`,
        },
        id: `lesson-${lesson.id}`,
        start: isoToEasternCalendarValue(lesson.startsAt),
        title: lesson.studentName,
      }));

    const blockedEvents: EventInput[] = data.unavailability
      .filter((period) =>
        role === "instructor"
          ? period.instructorProfileId === userId
          : instructorFilter === "all" || period.instructorProfileId === instructorFilter
      )
      .map((period) => ({
        classNames: ["ords-calendar-event", "calendar-blocked"],
        end: isoToEasternCalendarValue(period.endsAt),
        extendedProps: {
          kind: "blocked",
          subtitle: instructorById.get(period.instructorProfileId)?.displayName ?? "Instructor",
          unavailableId: period.id,
        },
        id: `blocked-${period.id}`,
        start: isoToEasternCalendarValue(period.startsAt),
        title: period.reason || "Unavailable",
      }));

    const availabilityEvents: EventInput[] = instructorFilter === "all"
      ? []
      : data.availability
        .filter((item) => item.isEnabled && item.instructorProfileId === instructorFilter)
        .map((item) => ({
          backgroundColor: "rgba(31, 155, 85, .1)",
          classNames: ["calendar-availability"],
          daysOfWeek: [item.dayOfWeek],
          display: "background",
          endTime: item.endsAt,
          groupId: `availability-${item.instructorProfileId}`,
          startTime: item.startsAt,
          title: "Available",
        }));

    const consultationEvents: EventInput[] =
      isAdmin && instructorFilter === "all" && roomFilter === "all"
        ? data.consultations
          .filter((consultation) => consultation.status !== "cancelled")
          .map((consultation) => ({
            classNames: ["ords-calendar-event", "calendar-consultation"],
            end: isoToEasternCalendarValue(consultation.endsAt),
            extendedProps: {
              consultationId: consultation.id,
              kind: "consultation",
              subtitle: `${consultation.instrumentOrService} | Website booking`,
            },
            id: `consultation-${consultation.id}`,
            start: isoToEasternCalendarValue(consultation.startsAt),
            title: `Consultation: ${consultation.customerName}`,
          }))
        : [];

    return [...availabilityEvents, ...blockedEvents, ...lessonEvents, ...consultationEvents];
  }, [
    data.availability,
    data.consultations,
    data.lessons,
    data.unavailability,
    instructorById,
    instructorFilter,
    isAdmin,
    role,
    roomFilter,
    userId,
  ]);

  function run(action: () => Promise<BookingActionResult>, closeOnSuccess = true) {
    startTransition(async () => {
      const result = await action();
      notify(result.message);
      if (result.ok) {
        if (closeOnSuccess) setDialog(null);
        router.refresh();
      }
    });
  }

  function openCreate(startsAt: Date, endsAt: Date) {
    if (localInputValue(startsAt) < isoToEasternCalendarValue(new Date()).slice(0, 16)) {
      notify("Choose a future time.");
      return;
    }
    if (!fitsDailyWindow(startsAt, endsAt, data.schoolHours.map((item) => ({
      dayOfWeek: item.dayOfWeek,
      endsAt: item.closesAt,
      isEnabled: item.isEnabled,
      startsAt: item.opensAt,
    })))) {
      notify("Choose a time inside the academy's active hours.");
      return;
    }

    const selectedInstructorId = role === "instructor"
      ? userId
      : instructorFilter === "all" ? null : instructorFilter;
    if (selectedInstructorId && !fitsDailyWindow(
      startsAt,
      endsAt,
      data.availability
        .filter((item) => item.instructorProfileId === selectedInstructorId)
        .map((item) => ({
          dayOfWeek: item.dayOfWeek,
          endsAt: item.endsAt,
          isEnabled: item.isEnabled,
          startsAt: item.startsAt,
        })),
    )) {
      const instructorName = instructorById.get(selectedInstructorId)?.displayName ?? "This instructor";
      notify(`${instructorName} is not available at that time.`);
      return;
    }

    const firstAssignment = visibleAssignments[0];
    if (firstAssignment) setSelectedAssignmentKey(assignmentKey(firstAssignment));
    setDialog({
      endsAt: localInputValue(endsAt),
      kind: "create",
      mode: "lesson",
      startsAt: localInputValue(startsAt),
    });
  }

  function handleSelect(info: DateSelectArg) {
    if (info.allDay) {
      calendarRef.current?.getApi().changeView("timeGridDay", info.start);
      return;
    }
    openCreate(info.start, info.end);
    calendarRef.current?.getApi().unselect();
  }

  function handleDateClick(info: DateClickArg) {
    if (info.allDay) {
      calendarRef.current?.getApi().changeView("timeGridDay", info.date);
      return;
    }
    openCreate(info.date, addMinutes(info.date, 60));
  }

  function handleEventClick(info: EventClickArg) {
    const kind = String(info.event.extendedProps.kind ?? "");
    if (kind === "lesson") {
      setDialog({ kind: "lesson", lessonId: String(info.event.extendedProps.lessonId) });
    }
    if (kind === "blocked") {
      setDialog({ kind: "blocked", unavailableId: String(info.event.extendedProps.unavailableId) });
    }
    if (kind === "consultation") {
      setDialog({
        consultationId: String(info.event.extendedProps.consultationId),
        kind: "consultation",
      });
    }
  }

  function submitLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAssignment) {
      notify("Assign a student to an instructor before scheduling.");
      return;
    }
    const values = new FormData(event.currentTarget);
    run(() => createLessonAction({
      durationMinutes: Number(values.get("durationMinutes")),
      instructorProfileId: selectedAssignment.instructorProfileId,
      notes: String(values.get("notes") ?? ""),
      program: selectedAssignment.program,
      repeatWeeks: Number(values.get("repeatWeeks")),
      roomId: String(values.get("roomId") ?? ""),
      startsAt: String(values.get("startsAt") ?? ""),
      studentId: selectedAssignment.studentId,
    }));
  }

  function submitBlockedTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    run(() => addUnavailabilityAction({
      endsAt: String(values.get("endsAt") ?? ""),
      instructorProfileId: role === "instructor" ? userId : String(values.get("instructorProfileId") ?? ""),
      reason: String(values.get("reason") ?? ""),
      startsAt: String(values.get("startsAt") ?? ""),
    }));
  }

  const detailLesson: BookingLesson | undefined = dialog?.kind === "lesson"
    ? data.lessons.find((item) => item.id === dialog.lessonId)
    : undefined;
  const detailBlocked: BookingUnavailability | undefined = dialog?.kind === "blocked"
    ? data.unavailability.find((item) => item.id === dialog.unavailableId)
    : undefined;
  const detailConsultation: BookingConsultation | undefined = dialog?.kind === "consultation"
    ? data.consultations.find((item) => item.id === dialog.consultationId)
    : undefined;

  return (
    <section className="portal-panel booking-calendar-panel" aria-labelledby="booking-calendar-title">
      <div className="booking-calendar-head">
        <div>
          <div className="panel-kicker">Operations Calendar</div>
          <h3 id="booking-calendar-title">
            {isAdmin ? "Website bookings and instructor schedules" : "Lessons, rooms, and blocked time"}
          </h3>
          <p>Eastern Time</p>
        </div>
        <div className="booking-calendar-filters">
          {isAdmin && (
            <label className="portal-field">
              Instructor
              <select value={instructorFilter} onChange={(event) => setInstructorFilter(event.target.value)}>
                <option value="all">All instructors</option>
                {data.instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>{instructor.displayName}</option>
                ))}
              </select>
            </label>
          )}
          <label className="portal-field">
            Room
            <select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
              <option value="all">All rooms</option>
              {data.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="booking-calendar-legend" aria-label="Calendar legend">
        <span className="legend-available">Available</span>
        <span className="legend-scheduled">Scheduled</span>
        <span className="legend-pending">Pending room approval</span>
        <span className="legend-blocked">Blocked</span>
        {isAdmin && <span className="legend-consultation">Website consultation</span>}
      </div>

      <div className="booking-calendar-frame">
        <FullCalendar
          allDaySlot={false}
          businessHours={businessHours}
          buttonText={{ day: "Day", month: "Month", today: "Today", week: "Week" }}
          dateClick={handleDateClick}
          dayHeaderFormat={{ weekday: "short", month: "numeric", day: "numeric" }}
          dayMaxEvents={3}
          editable={false}
          eventClick={handleEventClick}
          eventContent={EventContent}
          eventDisplay="block"
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          events={events}
          expandRows
          headerToolbar={{
            center: "title",
            end: "dayGridMonth,timeGridWeek,timeGridDay",
            start: "prev,next today",
          }}
          height={680}
          initialView="timeGridWeek"
          longPressDelay={350}
          nowIndicator
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          ref={calendarRef}
          scrollTime={range.scroll}
          select={handleSelect}
          selectLongPressDelay={350}
          selectMirror
          selectOverlap={(event) => {
            if (event.display === "background") return true;
            const kind = String(event.extendedProps.kind ?? "");
            if (kind === "consultation") return true;
            if (kind === "blocked") return instructorFilter === "all" && role !== "instructor";
            if (kind !== "lesson") return false;
            const instructorConflict =
              (role === "instructor" || instructorFilter !== "all") &&
              String(event.extendedProps.instructorProfileId ?? "") ===
                (role === "instructor" ? userId : instructorFilter);
            const roomConflict =
              roomFilter !== "all" &&
              String(event.extendedProps.roomId ?? "") === roomFilter;
            return !instructorConflict && !roomConflict;
          }}
          selectable
          slotDuration="00:15:00"
          slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          slotMaxTime={range.max}
          slotMinTime={range.min}
          snapDuration="00:15:00"
          weekends
        />
      </div>

      {dialog && (
        <div className="booking-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setDialog(null);
        }}>
          <section className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title">
            <button className="booking-dialog-close" type="button" onClick={() => setDialog(null)} aria-label="Close">X</button>

            {dialog.kind === "create" && (
              <>
                <div className="panel-kicker">Add to Calendar</div>
                <h3 id="booking-dialog-title">{dialog.mode === "lesson" ? "Schedule lesson" : "Block unavailable time"}</h3>
                <div className="booking-mode-control" aria-label="Calendar action">
                  <button className={dialog.mode === "lesson" ? "active" : ""} type="button" onClick={() => setDialog({ ...dialog, mode: "lesson" })}>Lesson</button>
                  <button className={dialog.mode === "block" ? "active" : ""} type="button" onClick={() => setDialog({ ...dialog, mode: "block" })}>Block Time</button>
                </div>

                {dialog.mode === "lesson" ? (
                  <form className="booking-form" onSubmit={submitLesson}>
                    <label className="portal-field">Student and instructor
                      <select
                        value={selectedAssignment ? assignmentKey(selectedAssignment) : ""}
                        onChange={(event) => setSelectedAssignmentKey(event.target.value)}
                        required
                      >
                        {visibleAssignments.length === 0 && <option value="">No assigned students</option>}
                        {visibleAssignments.map((assignment) => (
                          <option key={assignmentKey(assignment)} value={assignmentKey(assignment)}>
                            {studentById.get(assignment.studentId)?.displayName ?? "Student"} | {assignment.program} | {instructorById.get(assignment.instructorProfileId)?.displayName ?? "Instructor"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="setup-form-grid">
                      <label className="portal-field">Starts (Eastern Time)<input name="startsAt" type="datetime-local" defaultValue={dialog.startsAt} required /></label>
                      <label className="portal-field">Room<select name="roomId" required defaultValue={activeRooms[0]?.id ?? ""}><option value="" disabled>Select room</option>{activeRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
                      <label className="portal-field">Duration<select name="durationMinutes" defaultValue="60"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">90 minutes</option><option value="120">2 hours</option></select></label>
                      <label className="portal-field">Repeat<select name="repeatWeeks" defaultValue="1"><option value="1">One lesson</option><option value="4">Weekly for 4 weeks</option><option value="8">Weekly for 8 weeks</option><option value="12">Weekly for 12 weeks</option><option value="16">Weekly for 16 weeks</option><option value="24">Weekly for 24 weeks</option></select></label>
                    </div>
                    <label className="portal-field">Internal note<textarea name="notes" placeholder="Optional scheduling note" /></label>
                    <button className="inline-btn" disabled={isPending || !selectedAssignment || activeRooms.length === 0} type="submit">Submit for Room Approval</button>
                  </form>
                ) : (
                  <form className="booking-form" onSubmit={submitBlockedTime}>
                    {isAdmin && <label className="portal-field">Instructor<select name="instructorProfileId" value={blockInstructorId} onChange={(event) => setBlockInstructorId(event.target.value)} required><option value="" disabled>Select instructor</option>{data.instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.displayName}</option>)}</select></label>}
                    <div className="setup-form-grid">
                      <label className="portal-field">From (Eastern Time)<input name="startsAt" type="datetime-local" defaultValue={dialog.startsAt} required /></label>
                      <label className="portal-field">Until (Eastern Time)<input name="endsAt" type="datetime-local" defaultValue={dialog.endsAt} required /></label>
                    </div>
                    <label className="portal-field">Reason<input name="reason" placeholder="Time off, meeting, or personal block" /></label>
                    <button className="inline-btn" disabled={isPending || (isAdmin && !blockInstructorId)} type="submit">Block Time</button>
                  </form>
                )}
              </>
            )}

            {dialog.kind === "lesson" && detailLesson && (
              <>
                <div className="panel-kicker">Lesson Details</div>
                <h3 id="booking-dialog-title">{detailLesson.studentName}</h3>
                <dl className="booking-dialog-details">
                  <div><dt>Time</dt><dd>{formatEastern(detailLesson.startsAt)} - {new Date(detailLesson.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}</dd></div>
                  <div><dt>Instructor</dt><dd>{detailLesson.instructorName}</dd></div>
                  <div><dt>Program</dt><dd>{detailLesson.program}</dd></div>
                  <div><dt>Room</dt><dd>{detailLesson.roomName}</dd></div>
                  <div><dt>Status</dt><dd>{statusLabel(detailLesson.status)}</dd></div>
                  {detailLesson.notes && <div><dt>Note</dt><dd>{detailLesson.notes}</dd></div>}
                </dl>
                <div className="button-row">
                  <button className="inline-btn danger-btn" disabled={isPending} type="button" onClick={() => run(() => cancelLessonAction(detailLesson.id))}>Cancel Lesson</button>
                  <button className="inline-btn ghost-btn" type="button" onClick={() => setDialog(null)}>Close</button>
                </div>
              </>
            )}

            {dialog.kind === "blocked" && detailBlocked && (
              <>
                <div className="panel-kicker">Blocked Time</div>
                <h3 id="booking-dialog-title">{detailBlocked.reason || "Unavailable"}</h3>
                <dl className="booking-dialog-details">
                  <div><dt>Instructor</dt><dd>{instructorById.get(detailBlocked.instructorProfileId)?.displayName ?? "Instructor"}</dd></div>
                  <div><dt>From</dt><dd>{formatEastern(detailBlocked.startsAt)}</dd></div>
                  <div><dt>Until</dt><dd>{formatEastern(detailBlocked.endsAt)}</dd></div>
                </dl>
                <div className="button-row">
                  <button className="inline-btn danger-btn" disabled={isPending} type="button" onClick={() => run(() => deleteUnavailabilityAction(detailBlocked.id))}>Remove Block</button>
                  <button className="inline-btn ghost-btn" type="button" onClick={() => setDialog(null)}>Close</button>
                </div>
              </>
            )}

            {dialog.kind === "consultation" && detailConsultation && (
              <>
                <div className="panel-kicker">Website Consultation</div>
                <h3 id="booking-dialog-title">{detailConsultation.customerName}</h3>
                <dl className="booking-dialog-details">
                  <div><dt>Time</dt><dd>{formatEastern(detailConsultation.startsAt)} - {new Date(detailConsultation.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}</dd></div>
                  <div><dt>Student</dt><dd>{detailConsultation.studentName}</dd></div>
                  <div><dt>Interest</dt><dd>{detailConsultation.instrumentOrService}</dd></div>
                  <div><dt>Email</dt><dd><a href={`mailto:${detailConsultation.customerEmail}`}>{detailConsultation.customerEmail}</a></dd></div>
                  <div><dt>Phone</dt><dd><a href={`tel:${detailConsultation.customerPhone}`}>{detailConsultation.customerPhone}</a></dd></div>
                  <div><dt>Reference</dt><dd>{detailConsultation.bookingReference}</dd></div>
                  <div><dt>Status</dt><dd>{statusLabel(detailConsultation.status)}</dd></div>
                  {detailConsultation.musicalGoals && <div><dt>Goals</dt><dd>{detailConsultation.musicalGoals}</dd></div>}
                </dl>
                <button className="inline-btn ghost-btn" type="button" onClick={() => setDialog(null)}>Close</button>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
