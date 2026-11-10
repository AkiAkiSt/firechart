import { useEffect, useMemo, type ReactNode } from 'react'
import { buildTimeline, type Timeline } from '../domain/stats'
import type { Day } from '../domain/types'
import { useBackgroundUrl, useCharts, useDoneDays, useSettings, useToday } from '../store/hooks'
import { AppDataContext, type AppData } from './context'

const NO_DAYS: ReadonlySet<Day> = new Set()

export function AppDataProvider({ children }: { children: ReactNode }) {
  const charts = useCharts()
  const done = useDoneDays()
  const settings = useSettings()
  const today = useToday()
  const backgroundUrl = useBackgroundUrl(settings?.photoBackground ?? false)

  const theme = settings?.theme ?? 'dark'
  const glass = backgroundUrl !== null

  // The theme lives on <html> so the CSS tokens in index.css can switch on it.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.glass = glass ? 'on' : 'off'
    const bar = glass || theme === 'dark' ? '#0c0d10' : '#f4f5f7'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar)
  }, [theme, glass])

  const data = useMemo<AppData | null>(() => {
    if (!charts || !done || !settings) return null
    const timelines = new Map<string, Timeline>()
    for (const chart of charts) {
      timelines.set(chart.id, buildTimeline(chart.schedule, chart.startDate, done.get(chart.id) ?? NO_DAYS, today))
    }
    return {
      active: charts.filter((chart) => chart.archivedAt === null),
      archived: charts.filter((chart) => chart.archivedAt !== null),
      timelines,
      settings,
      today,
      chartTheme: glass ? 'dark' : theme,
      backgroundUrl,
    }
  }, [charts, done, settings, today, glass, theme, backgroundUrl])

  if (!data) return null
  return <AppDataContext.Provider value={data}>{children}</AppDataContext.Provider>
}
