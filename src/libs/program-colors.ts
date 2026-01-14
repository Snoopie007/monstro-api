import type { EventColor } from "@/types/calendar";

export const PROGRAM_COLOR_MAP: Record<number, EventColor> = {
  1: "sky",
  2: "amber",
  3: "violet",
  4: "rose",
  5: "emerald",
  6: "orange",
  7: "cyan",
  8: "pink",
  9: "indigo",
  10: "teal",
  11: "lime",
  12: "red",
};

export const PROGRAM_COLOR_ID_MAP: Record<EventColor, number> = {
  sky: 1,
  amber: 2,
  violet: 3,
  rose: 4,
  emerald: 5,
  orange: 6,
  cyan: 7,
  pink: 8,
  indigo: 9,
  teal: 10,
  lime: 11,
  red: 12,
};

export const PROGRAM_COLORS: Array<{
  id: number;
  name: string;
  color: EventColor;
}> = [
  { id: 1, name: "Sky Blue", color: "sky" },
  { id: 2, name: "Amber", color: "amber" },
  { id: 3, name: "Violet", color: "violet" },
  { id: 4, name: "Rose", color: "rose" },
  { id: 5, name: "Emerald", color: "emerald" },
  { id: 6, name: "Orange", color: "orange" },
  { id: 7, name: "Cyan", color: "cyan" },
  { id: 8, name: "Pink", color: "pink" },
  { id: 9, name: "Indigo", color: "indigo" },
  { id: 10, name: "Teal", color: "teal" },
  { id: 11, name: "Lime", color: "lime" },
  { id: 12, name: "Red", color: "red" },
];

export function getEventColorFromId(id: number | null | undefined): EventColor {
  return PROGRAM_COLOR_MAP[id ?? 1] || "sky";
}

export function getIdFromEventColor(color: EventColor): number {
  return PROGRAM_COLOR_ID_MAP[color] || 1;
}
