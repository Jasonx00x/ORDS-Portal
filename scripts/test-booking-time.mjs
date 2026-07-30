import { localDateTimeToIso } from "../lib/booking/time.ts";

const cases = [
  ["2026-07-30T16:00", "2026-07-30T20:00:00.000Z"],
  ["2027-01-15T16:00", "2027-01-15T21:00:00.000Z"],
];

for (const [input, expected] of cases) {
  const actual = localDateTimeToIso(input, "time");
  if (actual !== expected) {
    throw new Error(`Expected ${input} to resolve to ${expected}, received ${actual}.`);
  }
}

let rejectedDstGap = false;
try {
  localDateTimeToIso("2027-03-14T02:30", "time");
} catch {
  rejectedDstGap = true;
}

if (!rejectedDstGap) {
  throw new Error("A nonexistent Eastern Time value was accepted during the daylight-saving gap.");
}

console.log("Booking timezone tests passed.");
