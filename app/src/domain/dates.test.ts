import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  formatDayLong,
  formatDayShort,
  fromDayNumber,
  isoWeekday,
  isValidDay,
  startOfWeek,
  toDayNumber,
  todayLocal,
  weekdayIndex,
  weekdayLabels,
} from './dates'

describe('day arithmetic', () => {
  it('round-trips through day numbers', () => {
    for (const day of ['1970-01-01', '2024-02-29', '2026-11-10', '2026-12-31', '2027-01-01']) {
      expect(fromDayNumber(toDayNumber(day))).toBe(day)
    }
  })

  it('crosses month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('handles leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
    expect(addDays('2100-02-28', 1)).toBe('2100-03-01')
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366)
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365)
  })

  it('is not shifted by daylight-saving changes', () => {
    // Clocks change in late March and late October in Europe.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31)
  })

  it('counts negative differences', () => {
    expect(daysBetween('2026-11-10', '2026-11-03')).toBe(-7)
  })
})

describe('weekdays', () => {
  it('knows known dates', () => {
    expect(isoWeekday('1970-01-01')).toBe(4) // Thursday
    expect(isoWeekday('2026-11-10')).toBe(2) // Tuesday
    expect(isoWeekday('2026-11-15')).toBe(7) // Sunday
    expect(isoWeekday('2026-01-01')).toBe(4) // Thursday
  })

  it('positions days for either week start', () => {
    expect(weekdayIndex('2026-11-09', 'monday')).toBe(0)
    expect(weekdayIndex('2026-11-15', 'monday')).toBe(6)
    expect(weekdayIndex('2026-11-15', 'sunday')).toBe(0)
    expect(weekdayIndex('2026-11-09', 'sunday')).toBe(1)
  })

  it('finds the start of the week', () => {
    expect(startOfWeek('2026-11-10', 'monday')).toBe('2026-11-09')
    expect(startOfWeek('2026-11-10', 'sunday')).toBe('2026-11-08')
    expect(startOfWeek('2026-11-09', 'monday')).toBe('2026-11-09')
    expect(startOfWeek('2026-01-01', 'monday')).toBe('2025-12-29')
  })

  it('orders weekday labels', () => {
    expect(weekdayLabels('monday')[0]).toBe('Mon')
    expect(weekdayLabels('sunday')[0]).toBe('Sun')
    expect(weekdayLabels('sunday')[6]).toBe('Sat')
  })
})

describe('today', () => {
  it('uses the local calendar date', () => {
    expect(todayLocal(new Date(2026, 10, 10, 23, 59))).toBe('2026-11-10')
    expect(todayLocal(new Date(2026, 10, 11, 0, 1))).toBe('2026-11-11')
  })

  it('can end the day after midnight', () => {
    expect(todayLocal(new Date(2026, 10, 11, 1, 30), 3)).toBe('2026-11-10')
    expect(todayLocal(new Date(2026, 10, 11, 3, 0), 3)).toBe('2026-11-11')
  })
})

describe('validation and formatting', () => {
  it('accepts real dates only', () => {
    expect(isValidDay('2026-11-10')).toBe(true)
    expect(isValidDay('2026-02-30')).toBe(false)
    expect(isValidDay('2026-13-01')).toBe(false)
    expect(isValidDay('10/11/2026')).toBe(false)
    expect(isValidDay(20261110)).toBe(false)
  })

  it('formats days', () => {
    expect(formatDayShort('2026-11-09')).toBe('Mon 9 Nov')
    expect(formatDayLong('2026-11-10')).toBe('Tuesday 10 November')
  })
})
