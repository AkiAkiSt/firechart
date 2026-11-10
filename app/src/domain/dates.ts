import type { Day, WeekStart } from './types'

const MS_PER_DAY = 86_400_000

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** Builds a Day from calendar parts. Month is 1 to 12. */
export function makeDay(year: number, month: number, dayOfMonth: number): Day {
  return `${year}-${pad(month)}-${pad(dayOfMonth)}`
}

export function isValidDay(value: unknown): value is Day {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return fromDayNumber(toDayNumber(value)) === value
}

/**
 * Days since 1970-01-01, counted on the calendar. Day arithmetic goes through
 * this number, so daylight-saving changes and time zones cannot shift a date.
 */
export function toDayNumber(day: Day): number {
  const year = Number(day.slice(0, 4))
  const month = Number(day.slice(5, 7))
  const dayOfMonth = Number(day.slice(8, 10))
  return Math.round(Date.UTC(year, month - 1, dayOfMonth) / MS_PER_DAY)
}

export function fromDayNumber(n: number): Day {
  const d = new Date(n * MS_PER_DAY)
  return makeDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function addDays(day: Day, amount: number): Day {
  return fromDayNumber(toDayNumber(day) + amount)
}

/** How many days `to` is after `from`. Negative when it is earlier. */
export function daysBetween(from: Day, to: Day): number {
  return toDayNumber(to) - toDayNumber(from)
}

export function yearOf(day: Day): number {
  return Number(day.slice(0, 4))
}

/** 1 to 12. */
export function monthOf(day: Day): number {
  return Number(day.slice(5, 7))
}

export function dayOfMonth(day: Day): number {
  return Number(day.slice(8, 10))
}

/** ISO weekday: 1 is Monday, 7 is Sunday. */
export function isoWeekday(day: Day): number {
  // 1970-01-01 was a Thursday (ISO weekday 4).
  const n = toDayNumber(day)
  return ((((n + 3) % 7) + 7) % 7) + 1
}

/** Position of the day within its week, 0 to 6, for the given week start. */
export function weekdayIndex(day: Day, weekStart: WeekStart): number {
  const iso = isoWeekday(day)
  return weekStart === 'monday' ? iso - 1 : iso % 7
}

export function startOfWeek(day: Day, weekStart: WeekStart): Day {
  return addDays(day, -weekdayIndex(day, weekStart))
}

/**
 * The user's current day. `rolloverHour` moves the end of the day past
 * midnight, so with 3 a tick at 01:30 still belongs to the previous date.
 */
export function todayLocal(now: Date = new Date(), rolloverHour = 0): Day {
  const shifted = new Date(now.getTime() - rolloverHour * 3_600_000)
  return makeDay(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate())
}

export function weekdayShort(day: Day): string {
  return WEEKDAY_SHORT[isoWeekday(day) - 1]
}

export function weekdayLong(day: Day): string {
  return WEEKDAY_LONG[isoWeekday(day) - 1]
}

/** Month is 1 to 12. */
export function monthShort(month: number): string {
  return MONTH_SHORT[month - 1]
}

/** "Mon 9 Nov" */
export function formatDayShort(day: Day): string {
  return `${weekdayShort(day)} ${dayOfMonth(day)} ${monthShort(monthOf(day))}`
}

/** "Monday 9 November" */
export function formatDayLong(day: Day): string {
  return `${weekdayLong(day)} ${dayOfMonth(day)} ${MONTH_LONG[monthOf(day) - 1]}`
}

/** "9 Nov 2026" */
export function formatDayWithYear(day: Day): string {
  return `${dayOfMonth(day)} ${monthShort(monthOf(day))} ${yearOf(day)}`
}

/** Short weekday names in display order for the given week start. */
export function weekdayLabels(weekStart: WeekStart): string[] {
  return weekStart === 'monday' ? WEEKDAY_SHORT : [WEEKDAY_SHORT[6], ...WEEKDAY_SHORT.slice(0, 6)]
}
