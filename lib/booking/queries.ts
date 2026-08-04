import type { PortalUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingApproval,
  BookingAssignment,
  BookingAvailability,
  BookingConsultation,
  BookingInstructor,
  BookingLesson,
  BookingRoom,
  BookingSchoolHour,
  BookingStudent,
  BookingUnavailability,
  BookingWorkspaceData,
} from "@/lib/booking/types";

type QueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

function requireData<T>(result: QueryResult<T>, label: string) {
  if (result.error) {
    throw new Error(`Unable to load ${label}: ${result.error.message}`);
  }
  return result.data ?? [];
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function loadBookingWorkspace(user: PortalUser): Promise<BookingWorkspaceData> {
  const supabase = await createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const [
    roomsResult,
    hoursResult,
    instructorsResult,
    studentsResult,
    assignmentsResult,
    availabilityResult,
    unavailabilityResult,
    lessonsResult,
    approvalsResult,
    consultationsResult,
  ] = await Promise.all([
    supabase.from("rooms").select("id,name,best_for,is_active,requires_owner_approval").order("name"),
    supabase.from("school_hours").select("id,day_of_week,opens_at,closes_at,is_enabled").order("day_of_week"),
    supabase.from("app_profiles").select("id,display_name,invite_status").eq("role", "instructor").order("display_name"),
    supabase.from("students").select("id,profile_id,display_name,primary_program,status,contract_status").order("display_name"),
    supabase.from("instructor_student_assignments").select("instructor_profile_id,student_id,program,is_primary"),
    supabase.from("instructor_availability").select("id,instructor_profile_id,day_of_week,starts_at,ends_at,is_enabled").order("day_of_week").order("starts_at"),
    supabase.from("instructor_unavailability").select("id,instructor_profile_id,starts_at,ends_at,reason").gte("ends_at", new Date().toISOString()).order("starts_at"),
    supabase.from("lesson_schedules").select("id,student_id,instructor_profile_id,room_id,program,starts_at,ends_at,status,notes,recurrence_group_id").gte("ends_at", cutoff.toISOString()).order("starts_at").limit(250),
    supabase.from("room_approval_requests").select("id,lesson_schedule_id,status,decision_note,created_at").order("created_at", { ascending: false }).limit(250),
    user.role === "admin"
      ? supabase
        .from("consultation_bookings")
        .select("id,booking_reference,customer_name,customer_email,customer_phone,student_name,instrument_or_service,musical_goals,start_time,end_time,status")
        .gte("end_time", cutoff.toISOString())
        .order("start_time")
        .limit(250)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const roomRows = requireData(roomsResult as QueryResult<Record<string, unknown>>, "rooms");
  const hourRows = requireData(hoursResult as QueryResult<Record<string, unknown>>, "school hours");
  const instructorRows = requireData(instructorsResult as QueryResult<Record<string, unknown>>, "instructors");
  const studentRows = requireData(studentsResult as QueryResult<Record<string, unknown>>, "students");
  const assignmentRows = requireData(assignmentsResult as QueryResult<Record<string, unknown>>, "assignments");
  const availabilityRows = requireData(availabilityResult as QueryResult<Record<string, unknown>>, "availability");
  const unavailabilityRows = requireData(unavailabilityResult as QueryResult<Record<string, unknown>>, "unavailability");
  const lessonRows = requireData(lessonsResult as QueryResult<Record<string, unknown>>, "lessons");
  const approvalRows = requireData(approvalsResult as QueryResult<Record<string, unknown>>, "approvals");
  const consultationRows = requireData(
    consultationsResult as QueryResult<Record<string, unknown>>,
    "website consultations",
  );

  const rooms: BookingRoom[] = roomRows.map((row) => ({
    bestFor: text(row.best_for),
    id: text(row.id),
    isActive: Boolean(row.is_active),
    name: text(row.name),
    requiresOwnerApproval: Boolean(row.requires_owner_approval),
  }));
  const schoolHours: BookingSchoolHour[] = hourRows.map((row) => ({
    closesAt: text(row.closes_at),
    dayOfWeek: Number(row.day_of_week),
    id: text(row.id),
    isEnabled: Boolean(row.is_enabled),
    opensAt: text(row.opens_at),
  }));
  const instructors: BookingInstructor[] = instructorRows.map((row) => ({
    displayName: text(row.display_name),
    id: text(row.id),
    inviteStatus: text(row.invite_status),
  }));
  const students: BookingStudent[] = studentRows.map((row) => ({
    contractStatus: text(row.contract_status),
    displayName: text(row.display_name),
    id: text(row.id),
    profileId: text(row.profile_id) || null,
    primaryProgram: text(row.primary_program),
    status: text(row.status),
  }));
  const assignments: BookingAssignment[] = assignmentRows.map((row) => ({
    instructorProfileId: text(row.instructor_profile_id),
    isPrimary: Boolean(row.is_primary),
    program: text(row.program),
    studentId: text(row.student_id),
  }));
  const availability: BookingAvailability[] = availabilityRows.map((row) => ({
    dayOfWeek: Number(row.day_of_week),
    endsAt: text(row.ends_at),
    id: text(row.id),
    instructorProfileId: text(row.instructor_profile_id),
    isEnabled: Boolean(row.is_enabled),
    startsAt: text(row.starts_at),
  }));
  const unavailability: BookingUnavailability[] = unavailabilityRows.map((row) => ({
    endsAt: text(row.ends_at),
    id: text(row.id),
    instructorProfileId: text(row.instructor_profile_id),
    reason: text(row.reason),
    startsAt: text(row.starts_at),
  }));

  const instructorNames = new Map(instructors.map((instructor) => [instructor.id, instructor.displayName]));
  if (user.role === "instructor" && !instructorNames.has(user.id)) {
    instructorNames.set(user.id, user.displayName);
  }
  const studentNames = new Map(students.map((student) => [student.id, student.displayName]));
  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));

  const lessons: BookingLesson[] = lessonRows.map((row) => ({
    endsAt: text(row.ends_at),
    id: text(row.id),
    instructorName: instructorNames.get(text(row.instructor_profile_id)) ?? "Assigned instructor",
    instructorProfileId: text(row.instructor_profile_id),
    notes: text(row.notes),
    program: text(row.program),
    recurrenceGroupId: text(row.recurrence_group_id) || null,
    roomId: text(row.room_id),
    roomName: roomNames.get(text(row.room_id)) ?? "Assigned room",
    startsAt: text(row.starts_at),
    status: text(row.status),
    studentId: text(row.student_id),
    studentName: studentNames.get(text(row.student_id)) ?? "Student",
  }));
  const approvals: BookingApproval[] = approvalRows.map((row) => ({
    createdAt: text(row.created_at),
    decisionNote: text(row.decision_note),
    id: text(row.id),
    lessonScheduleId: text(row.lesson_schedule_id),
    status: text(row.status),
  }));
  const consultations: BookingConsultation[] = consultationRows.map((row) => ({
    bookingReference: text(row.booking_reference),
    customerEmail: text(row.customer_email),
    customerName: text(row.customer_name),
    customerPhone: text(row.customer_phone),
    endsAt: text(row.end_time),
    id: text(row.id),
    instrumentOrService: text(row.instrument_or_service),
    musicalGoals: text(row.musical_goals),
    startsAt: text(row.start_time),
    status: text(row.status),
    studentName: text(row.student_name),
  }));

  return {
    approvals,
    assignments,
    availability,
    consultations,
    instructors,
    lessons,
    rooms,
    schoolHours,
    students,
    unavailability,
  };
}
