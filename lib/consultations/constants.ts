export const CONSULTATION_TIMEZONE = "America/New_York";
export const CONSULTATION_DURATION_MINUTES = 30;

export const instrumentOptions = [
  "Drums",
  "Piano",
  "Guitar",
  "Bass",
  "Voice",
  "Audio Mixing",
  "Audio Mastering",
  "Music Production",
  "Other",
] as const;

export type InstrumentOption = (typeof instrumentOptions)[number];

export function isInstrumentOption(value: string): value is InstrumentOption {
  return instrumentOptions.includes(value as InstrumentOption);
}
