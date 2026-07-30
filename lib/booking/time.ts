function timeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function isoToEasternCalendarValue(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Select a valid calendar time.");
  }

  const parts = timeZoneParts(date, "America/New_York");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export function localDateTimeToIso(value: unknown, label: string) {
  if (typeof value !== "string") throw new Error(`Select a valid ${label}.`);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Select a valid ${label}.`);

  const [, year, month, day, hour, minute] = match;
  const wallClockUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const zoneOffset = (timestamp: number) => {
    const parts = timeZoneParts(new Date(timestamp), "America/New_York");
    const representedUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return representedUtc - timestamp;
  };

  const firstOffset = zoneOffset(wallClockUtc);
  let timestamp = wallClockUtc - firstOffset;
  const secondOffset = zoneOffset(timestamp);
  if (secondOffset !== firstOffset) timestamp = wallClockUtc - secondOffset;

  const resolved = timeZoneParts(new Date(timestamp), "America/New_York");
  if (
    resolved.year !== year ||
    resolved.month !== month ||
    resolved.day !== day ||
    resolved.hour !== hour ||
    resolved.minute !== minute
  ) {
    throw new Error(`${label} does not exist in Eastern Time because of a daylight-saving change.`);
  }
  return new Date(timestamp).toISOString();
}
