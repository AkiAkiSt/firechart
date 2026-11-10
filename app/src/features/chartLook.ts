import { useCallback } from 'react'
import { useApp } from '../app/context'
import { addDays } from '../domain/dates'
import { cellAt, type CellState, type Timeline } from '../domain/stats'
import type { Chart, Day } from '../domain/types'
import { rampFor, type Ramp } from '../theme/ramps'

/** The pieces every chart view needs: its numbers, its colours and a cell lookup. */
export function useChartLook(chart: Chart): { timeline: Timeline; ramp: Ramp; cell: (day: Day) => CellState } {
  const { timelines, chartTheme } = useApp()
  const timeline = timelines.get(chart.id)
  if (!timeline) throw new Error(`No timeline for chart ${chart.id}`)
  const ramp = rampFor(chart.color, chartTheme)
  const heatMode = chart.heatMode
  const cell = useCallback((day: Day) => cellAt(timeline, day, heatMode), [timeline, heatMode])
  return { timeline, ramp, cell }
}

export function streakText(streak: number): string {
  if (streak === 0) return 'No streak yet'
  return streak === 1 ? '1 day streak' : `${streak} day streak`
}

/**
 * Made-up history for previews: patchy at first, steadier later, ending in a
 * long streak, so a preview shows every heat level.
 */
export function sampleDoneDays(today: Day, days = 140, seed = 11): Set<Day> {
  let state = seed
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
  const done = new Set<Day>()
  for (let i = days - 1; i >= 21; i--) {
    if (random() < 0.4 + 0.5 * (1 - i / days)) done.add(addDays(today, -i))
  }
  for (let i = 19; i >= 0; i--) done.add(addDays(today, -i))
  return done
}
