import { ApprovedEvent } from "./calendar-types";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function parseEventDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getEventDate(event: ApprovedEvent): string | undefined {
  return event.dateStart || event.dateRaw;
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Date TBD";
  const d = parseEventDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCost(event: ApprovedEvent): string | null {
  if (event.costType === "free") return "Free";
  if (event.costRaw) return event.costRaw;
  if (event.costMin != null && event.costMax != null) {
    if (event.costMin === event.costMax) return `$${event.costMin}`;
    return `$${event.costMin} - $${event.costMax}`;
  }
  if (event.costMin != null) return `From $${event.costMin}`;
  return null;
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

/** Format a Date as "YYYY-MM-DD" using local time */
export function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a "YYYY-MM-DD" string into a Date (local time, midnight) */
export function parseDateParam(str: string): Date | null {
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const date = new Date(y, m, d);
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
  return date;
}

/** Get Sun–Sat dates for the week containing `date` */
export function getWeekDays(date: Date): Date[] {
  const dayOfWeek = date.getDay(); // 0=Sun
  const sunday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOfWeek);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i));
  }
  return days;
}

/** Get events that fall on a specific date */
export function getEventsForDate(events: ApprovedEvent[], date: Date): ApprovedEvent[] {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return events.filter((event) => {
    const dateStr = getEventDate(event);
    const parsed = parseEventDate(dateStr);
    if (!parsed) return false;
    return parsed.getFullYear() === y && parsed.getMonth() === m && parsed.getDate() === d;
  });
}

/** Group events by pillar, with an "Other" bucket for events without a pillar */
export function groupEventsByPillar(events: ApprovedEvent[]): Record<string, ApprovedEvent[]> {
  const groups: Record<string, ApprovedEvent[]> = {};
  for (const event of events) {
    const key = event.pillar || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }
  return groups;
}

/** Build a date key for eventsByDate map: "YYYY-M-D" */
export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${month}-${day}`;
}

/** Build eventsByDate map from a list of events */
export function buildEventsByDate(events: ApprovedEvent[]): Record<string, ApprovedEvent[]> {
  const map: Record<string, ApprovedEvent[]> = {};
  for (const event of events) {
    const dateStr = getEventDate(event);
    if (!dateStr) continue;
    const d = parseEventDate(dateStr);
    if (!d) continue;
    const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!map[key]) map[key] = [];
    map[key].push(event);
  }
  return map;
}

/** Sort events by date ascending */
export function sortEventsByDate(events: ApprovedEvent[]): ApprovedEvent[] {
  return [...events].sort((a, b) => {
    const da = parseEventDate(getEventDate(a));
    const db = parseEventDate(getEventDate(b));
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
}
