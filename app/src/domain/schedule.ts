import { isoWeekday } from './dates'
import type { Day, Schedule } from './types'

const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Whether the chart is meant to be done on this day. */
export function isPlanned(schedule: Schedule, day: Day): boolean {
  if (schedule.kind === 'daily') return true
  return schedule.days.includes(isoWeekday(day))
}

/** Sorted, de-duplicated weekday list; an empty or full list means every day. */
export function normalizeSchedule(schedule: Schedule): Schedule {
  if (schedule.kind === 'daily') return schedule
  const days = [...new Set(schedule.days.filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b)
  if (days.length === 0 || days.length === 7) return { kind: 'daily' }
  return { kind: 'weekdays', days }
}

export function describeSchedule(schedule: Schedule): string {
  const s = normalizeSchedule(schedule)
  if (s.kind === 'daily') return 'Every day'
  const key = s.days.join('')
  if (key === '12345') return 'Weekdays'
  if (key === '67') return 'Weekends'
  return s.days.map((d) => SHORT[d - 1]).join(', ')
}
