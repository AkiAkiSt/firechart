import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { describeSchedule, isPlanned, normalizeSchedule } from './schedule'
import {
  buildTimeline,
  cellAt,
  consistency,
  effectiveStart,
  formatRate,
  levelForRun,
  recentRate,
  tally,
} from './stats'
import type { Day, Schedule } from './types'

const DAILY: Schedule = { kind: 'daily' }
const MWF: Schedule = { kind: 'weekdays', days: [1, 3, 5] }
const TODAY: Day = '2026-11-10' // a Tuesday

/** Days ending `endOffset` days before TODAY, `count` of them, consecutive. */
function runOf(count: number, endOffset = 0): Day[] {
  const out: Day[] = []
  for (let i = 0; i < count; i++) out.push(addDays(TODAY, -endOffset - i))
  return out
}

describe('schedule', () => {
  it('plans every day or chosen weekdays', () => {
    expect(isPlanned(DAILY, '2026-11-15')).toBe(true)
    expect(isPlanned(MWF, '2026-11-09')).toBe(true) // Monday
    expect(isPlanned(MWF, '2026-11-10')).toBe(false) // Tuesday
  })

  it('normalizes and describes', () => {
    expect(normalizeSchedule({ kind: 'weekdays', days: [] })).toEqual(DAILY)
    expect(normalizeSchedule({ kind: 'weekdays', days: [7, 1, 2, 3, 4, 5, 6] })).toEqual(DAILY)
    expect(normalizeSchedule({ kind: 'weekdays', days: [5, 1, 1, 3] })).toEqual(MWF)
    expect(describeSchedule(DAILY)).toBe('Every day')
    expect(describeSchedule(MWF)).toBe('Mon, Wed, Fri')
    expect(describeSchedule({ kind: 'weekdays', days: [1, 2, 3, 4, 5] })).toBe('Weekdays')
    expect(describeSchedule({ kind: 'weekdays', days: [6, 7] })).toBe('Weekends')
  })
})

describe('heat levels', () => {
  it('follow the streak thresholds', () => {
    expect([0, 1, 2, 3, 6, 7, 13, 14, 200].map(levelForRun)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4])
  })
})

describe('streaks', () => {
  it('is zero for a new chart', () => {
    const t = buildTimeline(DAILY, TODAY, new Set(), TODAY)
    expect(t.currentStreak).toBe(0)
    expect(t.bestStreak).toBe(0)
    expect(t.totalDone).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const t = buildTimeline(DAILY, addDays(TODAY, -30), new Set(runOf(12)), TODAY)
    expect(t.currentStreak).toBe(12)
    expect(t.bestStreak).toBe(12)
    expect(t.totalDone).toBe(12)
  })

  it('keeps the streak while today is not ticked yet', () => {
    const t = buildTimeline(DAILY, addDays(TODAY, -30), new Set(runOf(5, 1)), TODAY)
    expect(t.currentStreak).toBe(5)
  })

  it('keeps the streak while yesterday is still open', () => {
    const t = buildTimeline(DAILY, addDays(TODAY, -30), new Set(runOf(9, 2)), TODAY)
    expect(t.currentStreak).toBe(9)
  })

  it('carries through an open yesterday when today is ticked', () => {
    const done = new Set([...runOf(9, 2), TODAY])
    const t = buildTimeline(DAILY, addDays(TODAY, -30), done, TODAY)
    expect(t.currentStreak).toBe(10)
  })

  it('breaks once a missed day is two days old', () => {
    const t = buildTimeline(DAILY, addDays(TODAY, -30), new Set(runOf(9, 3)), TODAY)
    expect(t.currentStreak).toBe(0)
    expect(t.bestStreak).toBe(9)
  })

  it('is repaired by logging the missed day late', () => {
    const gap = addDays(TODAY, -3)
    const broken = new Set([...runOf(3), ...runOf(5, 4)])
    expect(buildTimeline(DAILY, addDays(TODAY, -30), broken, TODAY).currentStreak).toBe(3)
    const repaired = new Set([...broken, gap])
    expect(buildTimeline(DAILY, addDays(TODAY, -30), repaired, TODAY).currentStreak).toBe(9)
  })

  it('does not break on days that are not planned', () => {
    // Mon, Wed, Fri chart: Mon 9 Nov, Fri 6 Nov, Wed 4 Nov, Mon 2 Nov.
    const done = new Set(['2026-11-09', '2026-11-06', '2026-11-04', '2026-11-02'])
    const t = buildTimeline(MWF, '2026-10-01', done, TODAY)
    expect(t.currentStreak).toBe(4)
  })

  it('counts a tick on an unplanned day as a bonus', () => {
    const done = new Set(['2026-11-09', '2026-11-07', '2026-11-06']) // Sat 7 Nov is unplanned
    const t = buildTimeline(MWF, '2026-11-05', done, TODAY)
    expect(t.currentStreak).toBe(3)
  })

  it('breaks when a planned day is missed', () => {
    const done = new Set(['2026-11-09', '2026-11-04']) // Fri 6 Nov missed
    const t = buildTimeline(MWF, '2026-10-01', done, TODAY)
    expect(t.currentStreak).toBe(1)
  })

  it('finds the best streak anywhere in the history', () => {
    const done = new Set([...runOf(3), ...runOf(20, 10)])
    const t = buildTimeline(DAILY, addDays(TODAY, -60), done, TODAY)
    expect(t.currentStreak).toBe(3)
    expect(t.bestStreak).toBe(20)
  })

  it('ignores ticks dated after today', () => {
    const done = new Set([TODAY, addDays(TODAY, 3)])
    const t = buildTimeline(DAILY, TODAY, done, TODAY)
    expect(t.totalDone).toBe(1)
    expect(t.currentStreak).toBe(1)
  })
})

describe('effective start', () => {
  it('moves earlier when a day before the start is ticked', () => {
    expect(effectiveStart(TODAY, [])).toBe(TODAY)
    expect(effectiveStart(TODAY, ['2026-10-01', '2026-11-12'])).toBe('2026-10-01')
    const t = buildTimeline(DAILY, TODAY, new Set(['2026-11-07']), TODAY)
    expect(cellAt(t, '2026-11-07', 'streak').kind).toBe('done')
    expect(cellAt(t, '2026-11-06', 'streak').kind).toBe('before')
    expect(cellAt(t, '2026-11-08', 'streak').kind).toBe('missed')
  })
})

describe('cells', () => {
  const done = new Set(runOf(15, 2))
  const t = buildTimeline(DAILY, addDays(TODAY, -40), done, TODAY)

  it('classifies each kind of day', () => {
    expect(cellAt(t, addDays(TODAY, 1), 'streak').kind).toBe('future')
    expect(cellAt(t, addDays(TODAY, -41), 'streak').kind).toBe('before')
    expect(cellAt(t, TODAY, 'streak').kind).toBe('pending')
    expect(cellAt(t, addDays(TODAY, -1), 'streak').kind).toBe('pending')
    expect(cellAt(t, addDays(TODAY, -2), 'streak').kind).toBe('done')
    expect(cellAt(t, addDays(TODAY, -30), 'streak').kind).toBe('missed')
  })

  it('marks unplanned, unticked days as off', () => {
    const mwf = buildTimeline(MWF, '2026-10-01', new Set(), TODAY)
    expect(cellAt(mwf, TODAY, 'streak').kind).toBe('off') // Tuesday
    expect(cellAt(mwf, '2026-11-03', 'streak').kind).toBe('off')
    expect(cellAt(mwf, '2026-11-02', 'streak').kind).toBe('missed')
  })

  it('heats up along a streak and stays flat in flat mode', () => {
    const first = addDays(TODAY, -16)
    expect(cellAt(t, first, 'streak').level).toBe(1)
    expect(cellAt(t, addDays(first, 2), 'streak').level).toBe(2)
    expect(cellAt(t, addDays(first, 6), 'streak').level).toBe(3)
    expect(cellAt(t, addDays(first, 13), 'streak').level).toBe(4)
    expect(cellAt(t, first, 'flat').level).toBe(3)
    expect(cellAt(t, addDays(first, 13), 'flat').level).toBe(3)
  })
})

describe('rates', () => {
  it('is null when nothing counts yet', () => {
    const t = buildTimeline(DAILY, TODAY, new Set(), TODAY)
    expect(recentRate(t, 30)).toBeNull()
    expect(formatRate(null)).toBe('–')
  })

  it('leaves out today while it is unticked', () => {
    const t = buildTimeline(DAILY, addDays(TODAY, -9), new Set(runOf(9, 1)), TODAY)
    expect(recentRate(t, 30)).toBe(1)
  })

  it('counts missed planned days against the rate', () => {
    const done = new Set(runOf(5)) // 5 of the last 10 days
    const t = buildTimeline(DAILY, addDays(TODAY, -9), done, TODAY)
    expect(recentRate(t, 30)).toBe(0.5)
    expect(formatRate(0.5)).toBe('50%')
  })

  it('only counts planned days for scheduled charts', () => {
    // Window 2 to 10 Nov has planned days Mon 2, Wed 4, Fri 6, Mon 9.
    const done = new Set(['2026-11-02', '2026-11-04', '2026-11-09'])
    const t = buildTimeline(MWF, '2026-11-02', done, TODAY)
    expect(tally(t, '2026-11-02', TODAY)).toEqual({ done: 3, counted: 4 })
  })

  it('combines charts into one consistency figure', () => {
    const a = buildTimeline(DAILY, addDays(TODAY, -9), new Set(runOf(10)), TODAY) // 10 of 10
    const b = buildTimeline(DAILY, addDays(TODAY, -9), new Set(runOf(5)), TODAY) // 5 of 10
    expect(consistency([a, b], addDays(TODAY, -9), TODAY)).toBe(0.75)
    expect(consistency([], addDays(TODAY, -9), TODAY)).toBeNull()
  })
})
