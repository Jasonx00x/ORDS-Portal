export type BookingRoom = {
  bestFor: string;
  id: string;
  isActive: boolean;
  name: string;
  requiresOwnerApproval: boolean;
};

export type BookingSchoolHour = {
  closesAt: string;
  dayOfWeek: number;
  id: string;
  isEnabled: boolean;
  opensAt: string;
};

export type BookingInstructor = {
  displayName: string;
  id: string;
  inviteStatus: string;
};

export type BookingConsultation = {
  bookingReference: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  endsAt: string;
  id: string;
  instrumentOrService: string;
  musicalGoals: string;
  startsAt: string;
  status: string;
  studentName: string;
};

export type BookingStudent = {
  contractStatus: string;
  displayName: string;
  id: string;
  primaryProgram: string;
  status: string;
};

export type BookingAssignment = {
  instructorProfileId: string;
  isPrimary: boolean;
  program: string;
  studentId: string;
};

export type BookingAvailability = {
  dayOfWeek: number;
  endsAt: string;
  id: string;
  instructorProfileId: string;
  isEnabled: boolean;
  startsAt: string;
};

export type BookingUnavailability = {
  endsAt: string;
  id: string;
  instructorProfileId: string;
  reason: string;
  startsAt: string;
};

export type BookingLesson = {
  endsAt: string;
  id: string;
  instructorName: string;
  instructorProfileId: string;
  notes: string;
  program: string;
  recurrenceGroupId: string | null;
  roomId: string;
  roomName: string;
  startsAt: string;
  status: string;
  studentId: string;
  studentName: string;
};

export type BookingApproval = {
  createdAt: string;
  decisionNote: string;
  id: string;
  lessonScheduleId: string;
  status: string;
};

export type BookingWorkspaceData = {
  approvals: BookingApproval[];
  assignments: BookingAssignment[];
  availability: BookingAvailability[];
  consultations: BookingConsultation[];
  instructors: BookingInstructor[];
  lessons: BookingLesson[];
  rooms: BookingRoom[];
  schoolHours: BookingSchoolHour[];
  students: BookingStudent[];
  unavailability: BookingUnavailability[];
};
