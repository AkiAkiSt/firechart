import { describe, expect, it } from 'vitest'
import { monthLabels, padColumns, splitInHalf, trailingWeeks, weeksThatFit, yearColumns } from './layout'

const TODAY = '2026-11-10' // a Tuesday

describe('trailing weeks', () => {
  it('ends with the week that contains today', () => {
    const columns = trailingWeeks(TODAY, 20, 'monday')
    expect(columns).toHaveLength(20)
    expect(columns[19][0]).toBe('2026-11-09')
    expect(columns[19][1]).toBe(TODAY)
    expect(columns[19][6]).toBe('2026-11-15')
    expect(columns[0][0]).toBe('2026-06-29')
  })

  it('respects a Sunday week start', () => {
    const columns = trailingWeeks(TODAY, 2, 'sunday')
    expect(columns[1][0]).toBe('2026-11-08')
    expect(columns[1][2]).toBe(TODAY)
    expect(columns[0][0]).toBe('2026-11-01')
  })

  it('has consecutive days throughout', () => {
    const days = trailingWeeks(TODAY, 53, 'monday').flat()
    expect(days).toHaveLength(371)
    expect(new Set(days).size).toBe(371)
  })
})

describe('year columns', () => {
  it('covers exactly the year', () => {
    const columns = yearColumns(2026, 'monday')
    const days = columns.flat().filter((d) => d !== null)
    expect(days).toHaveLength(365)
    expect(days[0]).toBe('2026-01-01')
    expect(days[364]).toBe('2026-12-31')
    expect(columns).toHaveLength(53)
    // 1 Jan 2026 is a Thursday: three empty slots above it.
    expect(columns[0].slice(0, 4)).toEqual([null, null, null, '2026-01-01'])
  })

  it('handles leap years and Sunday starts', () => {
    expect(
      yearColumns(2024, 'sunday')
        .flat()
        .filter((d) => d !== null),
    ).toHaveLength(366)
    // 2028 starts on a Saturday and is a leap year: 54 Sunday-first weeks.
    expect(yearColumns(2028, 'sunday')).toHaveLength(54)
  })

  it('splits and pads into equal blocks', () => {
    const [a, b] = splitInHalf(yearColumns(2026, 'monday'))
    expect(a).toHaveLength(27)
    expect(b).toHaveLength(26)
    expect(padColumns(b, 27)).toHaveLength(27)
    expect(padColumns(b, 27)[26]).toEqual([null, null, null, null, null, null, null])
  })
})

describe('month labels', () => {
  it('labels the week containing the first of each month', () => {
    const labels = monthLabels(yearColumns(2026, 'monday'))
    expect(labels[0]).toBe('Jan')
    expect(labels.filter((l) => l !== '')).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ])
  })

  it('labels the first column only when there is room', () => {
    // 20 weeks back from 10 Nov starts on 29 Jun; 1 Jul is in that same week.
    expect(monthLabels(trailingWeeks(TODAY, 20, 'monday'))[0]).toBe('Jul')
    // 18 weeks back starts on 13 Jul; August begins two columns later.
    const labels = monthLabels(trailingWeeks(TODAY, 18, 'monday'))
    expect(labels[0]).toBe('')
    expect(labels[2]).toBe('Aug')
    // 17 weeks back starts on 20 Jul; August begins in the very next column.
    expect(monthLabels(trailingWeeks(TODAY, 17, 'monday'))[0]).toBe('')
  })

  it('never labels the last column', () => {
    const columns = trailingWeeks('2026-12-01', 10, 'monday')
    const labels = monthLabels(columns)
    expect(labels[labels.length - 1]).toBe('')
  })
})

describe('weeks that fit', () => {
  it('fills the width within limits', () => {
    expect(weeksThatFit(324, 13, 3, 12, 53)).toBe(20)
    expect(weeksThatFit(2000, 11, 3, 12, 53)).toBe(53)
    expect(weeksThatFit(100, 13, 3, 12, 53)).toBe(12)
    expect(weeksThatFit(0, 13, 3, 12, 53)).toBe(12)
  })
})
