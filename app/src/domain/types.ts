/** A local calendar date as "YYYY-MM-DD". Never converted through UTC. */
export type Day = string

export type WeekStart = 'monday' | 'sunday'
export type Shape = 'rounded' | 'square' | 'dot'
export type HeatMode = 'streak' | 'flat'
export type Visibility = 'friends' | 'private'
export type ThemeName = 'dark' | 'light'

/** ISO weekday numbers: 1 is Monday, 7 is Sunday. */
export type Schedule = { kind: 'daily' } | { kind: 'weekdays'; days: number[] }

export type RampName = 'ember' | 'moss' | 'ice' | 'orchid' | 'bone' | 'sun' | 'coral' | 'teal'

export type ChartColor = { kind: 'preset'; ramp: RampName } | { kind: 'custom'; hex: string }

export interface Chart {
  id: string
  name: string
  icon: string
  color: ChartColor
  shape: Shape
  heatMode: HeatMode
  visibility: Visibility
  schedule: Schedule
  /** The first day that counts. Ticks before it move the effective start earlier. */
  startDate: Day
  sortOrder: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** One row per chart per day. `done: false` rows are kept so un-ticking can sync later. */
export interface Entry {
  chartId: string
  day: Day
  done: boolean
  loggedAt: string
  updatedAt: string
}
