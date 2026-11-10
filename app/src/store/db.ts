import Dexie, { type Table } from 'dexie'
import type { Chart, Day, Entry, ThemeName, WeekStart } from '../domain/types'

/** 1 when a row has changes the server has not received yet. */
export type Dirty = 0 | 1

export type StoredChart = Chart & { dirty: Dirty }
export type StoredEntry = Entry & { dirty: Dirty }

/** A person's preferences. Synced between their devices once they sign in. */
export interface Settings {
  theme: ThemeName
  weekStart: WeekStart
  /** Whether the background photo is shown. */
  photoBackground: boolean
  /** How much the photo is darkened, 0 to 0.8. */
  backgroundDim: number
  /** Changes every time the photo is replaced; null when there is none. */
  backgroundVersion: string | null
  /** The day whose "yesterday is still open" prompt was dismissed. */
  catchUpDismissedFor: Day | null
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  weekStart: 'monday',
  photoBackground: false,
  backgroundDim: 0.35,
  backgroundVersion: null,
  catchUpDismissedFor: null,
}

/** What this device knows about syncing. Never leaves the device. */
export interface SyncState {
  /** The account this device's data belongs to; null while nobody has signed in. */
  userId: string | null
  /** The newest server timestamps already pulled. */
  chartsCursor: string | null
  entriesCursor: string | null
  lastSyncedAt: string | null
  /** Set when the photo was removed here and still has to be removed on the server. */
  backgroundDeletePending: boolean
}

export const EMPTY_SYNC_STATE: SyncState = {
  userId: null,
  chartsCursor: null,
  entriesCursor: null,
  lastSyncedAt: null,
  backgroundDeletePending: false,
}

export interface KeyValueRow {
  key: string
  value: unknown
  /** Present on the settings row: when it last changed, and whether that still has to be sent. */
  updatedAt?: string
  dirty?: Dirty
}

export interface FileRow {
  key: string
  blob: Blob
  /** Matches Settings.backgroundVersion for the photo this is. */
  version: string
  dirty: Dirty
}

/**
 * Everything is stored on the device first. The sync engine (src/sync) sends
 * rows marked dirty to the server and merges what other devices changed.
 */
export class FirechartDB extends Dexie {
  charts!: Table<StoredChart, string>
  entries!: Table<StoredEntry, [string, Day]>
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
    // Version 2 adds the dirty marker. Everything already on the device is
    // marked so it is uploaded the first time its owner signs in.
    this.version(2)
      .stores({
        charts: 'id, sortOrder, dirty',
        entries: '[chartId+day], chartId, dirty',
        kv: 'key',
        files: 'key',
      })
      .upgrade(async (tx) => {
        const now = new Date().toISOString()
        await tx.table('charts').toCollection().modify({ dirty: 1 })
        await tx.table('entries').toCollection().modify({ dirty: 1 })
        const file = await tx.table('files').get('background')
        if (file) {
          await tx.table('files').put({ key: 'background', blob: file.blob, version: file.updatedAt ?? now, dirty: 1 })
        }
        const settings = await tx.table('kv').get('settings')
        if (settings) {
          await tx.table('kv').put({
            key: 'settings',
            value: { ...settings.value, backgroundVersion: file ? (file.updatedAt ?? now) : null },
            updatedAt: now,
            dirty: 1,
          })
        }
      })
  }
}

export const db = new FirechartDB()
