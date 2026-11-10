import { createContext, useContext } from 'react'
import type { Timeline } from '../domain/stats'
import type { Chart, Day, ThemeName } from '../domain/types'
import type { Settings } from '../store/db'

/** Everything a screen needs, loaded once at the top of the app. */
export interface AppData {
  /** Charts shown on Today, in the owner's order. */
  active: Chart[]
  archived: Chart[]
  /** Streaks, heat and counts for every chart, keyed by chart id. */
  timelines: Map<string, Timeline>
  settings: Settings
  today: Day
  /** Which set of heat ramps to draw with. Frosted cards are always dark. */
  chartTheme: ThemeName
  /** Object URL of the background photo, or null. */
  backgroundUrl: string | null
}

export const AppDataContext = createContext<AppData | null>(null)

export function useApp(): AppData {
  const data = useContext(AppDataContext)
  if (!data) throw new Error('useApp must be used inside AppDataProvider')
  return data
}
