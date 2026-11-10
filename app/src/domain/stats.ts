import { fromDayNumber, toDayNumber } from './dates'
import { isPlanned } from './schedule'
import type { Day, HeatMode, Schedule } from './types'

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export type CellKind =
  /** Ticked. */
  | 'done'
  /** A planned day in the past that was not ticked. */
  | 'missed'
  /** Today or yesterday, planned, not ticked yet: still open. */
  | 'pending'
  /** Not planned and not ticked. */
  | 'off'
  /** After today. */
  | 'future'
  /** Before the chart's first day. */
  | 'before'

export interface CellState {
  kind: CellKind
  level: HeatLevel
}

/**
 * Everything derived from a chart's ticks, computed once per render.
 * Index 0 is the chart's effective first day; the last index is today.
 */
export interface Timeline {
  startNum: number
  todayNum: number
  done: boolean[]
  planned: boolean[]
  /** Streak length reached on each day; 0 where the day is not done. */
  run: number[]
  currentStreak: number
  bestStreak: number
  totalDone: number
}

/** Streak heat thresholds: 1-2 days, 3-6, 7-13, 14 or more. */
export function levelForRun(run: number): HeatLevel {
  if (run <= 0) return 0
  if (run < 3) return 1
  if (run < 7) return 2
  if (run < 14) return 3
  return 4
}

/** The chart counts from its start date, or from its earliest tick if that is earlier. */
export function effectiveStart(startDate: Day, doneDays: Iterable<Day>): Day {
  let earliest = startDate
  for (const day of doneDays) if (day < earliest) earliest = day
  return earliest
}

/**
 * Walks from the chart's first day to today.
 *
 * Streak rules:
 * - A ticked day extends the streak, planned or not.
 * - A planned day left unticked ends it.
 * - An unplanned day left unticked neither extends nor ends it.
 * - Today and yesterday are still open: while unticked they do not end the
 *   streak. This keeps a streak alive for goals that are logged the next
 *   morning, such as screen time. Once a day is two days old it counts as
 *   missed.
 */
export function buildTimeline(
  schedule: Schedule,
  startDate: Day,
  doneDays: ReadonlySet<Day>,
  today: Day,
): Timeline {
  const todayNum = toDayNumber(today)
  // Ticks dated after today (a clock change, an import) are ignored.
  const pastDone = [...doneDays].filter((d) => toDayNumber(d) <= todayNum)
  const start = effectiveStart(startDate, pastDone)
  const startNum = Math.min(toDayNumber(start), todayNum)
  const length = todayNum - startNum + 1

  const done: boolean[] = new Array(length)
  const planned: boolean[] = new Array(length)
  const run: number[] = new Array(length)

  let carry = 0
  let best = 0
  let total = 0
  for (let i = 0; i < length; i++) {
    const day = fromDayNumber(startNum + i)
    const isDone = doneDays.has(day)
    const isPlan = isPlanned(schedule, day)
    const stillOpen = i >= length - 2
    done[i] = isDone
    planned[i] = isPlan
    if (isDone) {
      carry += 1
      total += 1
      if (carry > best) best = carry
    } else if (isPlan && !stillOpen) {
      carry = 0
    }
    run[i] = isDone ? carry : 0
  }

  return { startNum, todayNum, done, planned, run, currentStreak: carry, bestStreak: best, totalDone: total }
}

export function cellAt(timeline: Timeline, day: Day, heatMode: HeatMode): CellState {
  const n = toDayNumber(day)
  if (n > timeline.todayNum) return { kind: 'future', level: 0 }
  if (n < timeline.startNum) return { kind: 'before', level: 0 }
  const i = n - timeline.startNum
  if (timeline.done[i]) {
    return { kind: 'done', level: heatMode === 'flat' ? 3 : levelForRun(timeline.run[i]) }
  }
  if (!timeline.planned[i]) return { kind: 'off', level: 0 }
  return { kind: n >= timeline.todayNum - 1 ? 'pending' : 'missed', level: 0 }
}

export function isDoneOn(timeline: Timeline, day: Day): boolean {
  const n = toDayNumber(day)
  if (n > timeline.todayNum || n < timeline.startNum) return false
  return timeline.done[n - timeline.startNum]
}

export interface Tally {
  done: number
  /** Days that count: planned days, plus unplanned days that were ticked anyway. */
  counted: number
}

/**
 * Counts done and counted days between two dates, inclusive. Today is left
 * out while it is unticked, so the number does not dip during the day.
 */
export function tally(timeline: Timeline, from: Day, to: Day): Tally {
  const first = Math.max(toDayNumber(from), timeline.startNum)
  const last = Math.min(toDayNumber(to), timeline.todayNum)
  let done = 0
  let counted = 0
  for (let n = first; n <= last; n++) {
    const i = n - timeline.startNum
    if (timeline.done[i]) {
      done += 1
      counted += 1
    } else if (timeline.planned[i] && n !== timeline.todayNum) {
      counted += 1
    }
  }
  return { done, counted }
}

/** Share of counted days done over the last `days` days, 0 to 1, or null when nothing counts yet. */
export function recentRate(timeline: Timeline, days: number): number | null {
  const to = fromDayNumber(timeline.todayNum)
  const from = fromDayNumber(timeline.todayNum - (days - 1))
  const t = tally(timeline, from, to)
  return t.counted === 0 ? null : t.done / t.counted
}

/**
 * Consistency across several charts: done days over counted days in the
 * period. Used to compare people fairly however many charts they track.
 */
export function consistency(timelines: readonly Timeline[], from: Day, to: Day): number | null {
  let done = 0
  let counted = 0
  for (const timeline of timelines) {
    const t = tally(timeline, from, to)
    done += t.done
    counted += t.counted
  }
  return counted === 0 ? null : done / counted
}

export function formatRate(rate: number | null): string {
  return rate === null ? '–' : `${Math.round(rate * 100)}%`
}
