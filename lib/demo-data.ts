import type { Role } from "./roles";

export const dashboardStats = [
  ["Active students", "48", "31 active weekly"],
  ["Reports submitted", "18", "Today"],
  ["Missing reports", "4", "Needs follow-up"],
  ["Today’s clock-ins", "2/3", "One missing"],
  ["Pending reschedules", "3", "Approval required"],
  ["Login activity", "86", "This month"],
  ["Attendance issues", "5", "Late/no-show flags"],
  ["Announcement reads", "14/20", "Families confirmed"],
];

export const homeworkByRole: Record<Role, Array<{ title: string; detail: string }>> = {
  student: [
    { title: "Mateo Ramos", detail: "Drums · Rudiments, worship groove at 72 BPM, upload one practice video" },
    { title: "Practice checklist", detail: "10 minutes rudiments, 10 minutes groove, one upload before Friday" },
  ],
  client: [
    { title: "Jordan Cruz", detail: "Audio · Revise EQ balance and upload the next mix draft" },
    { title: "Session prep", detail: "Bring one reference track and notes on mix changes" },
  ],
  instructor: [
    { title: "Mateo Ramos", detail: "Drums · Rudiments, worship groove at 72 BPM, upload one practice video" },
    { title: "Jordan Cruz", detail: "Audio · Revise EQ balance and upload the next mix draft" },
    { title: "Ari Thompson", detail: "Piano · Practice I-IV-V progressions and record chord transitions" },
    { title: "Naomi Lee", detail: "Vocals · Breath support warmup and pitch matching exercise" },
    { title: "Instructor Library", detail: "Reusable homework templates, lesson materials, and upload links" },
    { title: "Assignment Queue", detail: "3 homework submissions waiting for instructor review" },
  ],
  admin: [
    { title: "Mateo Ramos", detail: "Drums · Rudiments, worship groove at 72 BPM, upload one practice video" },
    { title: "Jordan Cruz", detail: "Audio · Revise EQ balance and upload the next mix draft" },
    { title: "Ari Thompson", detail: "Piano · Practice I-IV-V progressions and record chord transitions" },
    { title: "Naomi Lee", detail: "Vocals · Breath support warmup and pitch matching exercise" },
    { title: "Instructor Library", detail: "Reusable homework templates, lesson materials, and upload links" },
    { title: "Assignment Queue", detail: "3 homework submissions waiting for instructor review" },
  ],
  parent: [],
};

export const assignedInstructorByRole: Record<Role, string> = {
  student: "Jason Alfaro",
  parent: "Jason Alfaro",
  client: "Oscar Ramos",
  instructor: "Jason Alfaro",
  admin: "Jason Alfaro",
};

export const lessonBlocks = [
  { day: "Mon", lessons: [
    ["3:30 PM", "Mateo Ramos", "Drums", "Jason Alfaro", "Scheduled", "drums"],
    ["5:00 PM", "Naomi Lee", "Vocals", "Bryan", "Completed", "vocals"],
  ] },
  { day: "Tue", lessons: [
    ["4:00 PM", "Ari Thompson", "Piano", "David", "Late Arrival", "piano"],
    ["6:30 PM", "Jordan Cruz", "Audio", "Oscar Ramos", "Scheduled", "audio"],
  ] },
  { day: "Wed", lessons: [
    ["4:30 PM", "Camila Reyes", "Guitar", "Bryan", "No Show", "guitar"],
    ["6:00 PM", "Elijah Moore", "Drums", "Jason Alfaro", "Completed", "drums"],
  ] },
  { day: "Thu", lessons: [
    ["5:30 PM", "Mateo Ramos", "Drums", "Jason Alfaro", "Reschedule Requested", "drums"],
    ["7:00 PM", "Grace Kim", "Piano", "David", "Scheduled", "piano"],
  ] },
  { day: "Fri", lessons: [
    ["3:00 PM", "Sofia Vega", "Vocals", "Bryan", "Scheduled", "vocals"],
    ["4:30 PM", "Isaac King", "Guitar", "Oscar Ramos", "Completed", "guitar"],
  ] },
  { day: "Sat", lessons: [
    ["11:00 AM", "Mateo Ramos", "Drums", "Jason Alfaro", "Scheduled", "drums"],
    ["1:00 PM", "Ari Thompson", "Piano", "David", "Scheduled", "piano"],
  ] },
] as const;
