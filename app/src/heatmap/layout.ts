import { addDays, dayOfMonth, makeDay, monthOf, monthShort, startOfWeek } from '../domain/dates'
import type { Day, WeekStart } from '../domain/types'

/** One week: seven slots, top to bottom. A null slot is outside the range and drawn as nothing. */
export type Column = (Day | null)[]

/** The last `weeks` weeks, ending with the week that contains `today`. */
export function trailingWeeks(today: Day, weeks: number, weekStart: WeekStart): Column[] {
  const lastStart = startOfWeek(today, weekStart)
  const columns: Column[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDays(lastStart, -7 * w)
    const column: Column = []
    for (let d = 0; d < 7; d++) column.push(addDays(start, d))
    columns.push(column)
  }
  return columns
}

/** Every week that touches the calendar year; days outside the year are null. */
export function yearColumns(year: number, weekStart: WeekStart): Column[] {
  const first = makeDay(year, 1, 1)
  const last = makeDay(year, 12, 31)
  const columns: Column[] = []
  for (let start = startOfWeek(first, weekStart); start <= last; start = addDays(start, 7)) {
    const column: Column = []
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, d)
      column.push(day >= first && day <= last ? day : null)
    }
    columns.push(column)
  }
  return columns
}

/** Splits a year's columns into two blocks for narrow screens; the first gets the extra week. */
export function splitInHalf(columns: Column[]): [Column[], Column[]] {
  const half = Math.ceil(columns.length / 2)
  return [columns.slice(0, half), columns.slice(half)]
}

/** Pads a block with empty weeks so two blocks draw cells of the same size. */
export function padColumns(columns: Column[], count: number): Column[] {
  const out = [...columns]
  while (out.length < count) out.push([null, null, null, null, null, null, null])
  return out
}

/**
 * One label per column: the month's short name above the week that contains
 * its first day, otherwise an empty string. The first column is labelled too
 * when the next label is at least three columns away, and the last column is
 * left bare so no label hangs off the edge.
 */
export function monthLabels(columns: Column[]): string[] {
  const labels = columns.map((column) => {
    const first = column.find((day) => day !== null && dayOfMonth(day) === 1)
    return first ? monthShort(monthOf(first)) : ''
  })
  if (labels.length > 0 && labels[0] === '') {
    const next = labels.findIndex((label) => label !== '')
    const firstDay = columns[0].find((day) => day !== null)
    if (firstDay && (next === -1 || next >= 3)) labels[0] = monthShort(monthOf(firstDay))
  }
  if (labels.length > 1) labels[labels.length - 1] = ''
  return labels
}

/** How many week columns of roughly `cell` pixels fit in `width`. */
export function weeksThatFit(width: number, cell: number, gap: number, min: number, max: number): number {
  if (!(width > 0)) return min
  const fit = Math.floor((width + gap) / (cell + gap))
  return Math.max(min, Math.min(max, fit))
}
