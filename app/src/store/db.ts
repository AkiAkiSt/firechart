import Dexie, { type Table } from 'dexie'
import type { Chart, Day, Entry, ThemeName, WeekStart } from '../domain/types'

export interface Settings {
  theme: ThemeName
  weekStart: WeekStart
  /** Whether an uploaded photo is shown behind the app. */
  photoBackground: boolean
  /** How much the photo is darkened, 0 to 0.8. */
  backgroundDim: number
  /** The day whose "yesterday is still open" prompt was dismissed. */
  catchUpDismissedFor: Day | null
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  weekStart: 'monday',
  photoBackground: false,
  backgroundDim: 0.35,
  catchUpDismissedFor: null,
}

interface KeyValueRow {
  key: string
  value: unknown
}

interface FileRow {
  key: string
  blob: Blob
  updatedAt: string
}

/** Everything is stored on the device. Sync (milestone 2) will sit on top of these tables. */
export class FirechartDB extends Dexie {
  charts!: Table<Chart, string>
  entries!: Table<Entry, [string, Day]>
  kv!: Table<KeyValueRow, string>
  files!: Table<FileRow, string>

  constructor(name = 'firechart') {
    super(name)
    this.version(1).stores({
      charts: 'id, sortOrder',
      entries: '[chartId+day], chartId',
      kv: 'key',
      files: 'key',
    })
  }
}

export const db = new FirechartDB()
