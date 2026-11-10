import type { FirechartDB, StoredChart, StoredEntry } from '../store/db'
import { BACKGROUND_KEY, getSettings, getSyncState, updateSyncState } from '../store/repo'
import {
  fromRemoteChart,
  fromRemoteEntry,
  readSettings,
  toIso,
  toRemoteChart,
  toRemoteEntry,
  type Remote,
} from './remote'

const SETTINGS_KEY = 'settings'
const ENTRY_BATCH = 500

/**
 * Pulls ask for rows the server stored after the last pull, minus this margin,
 * so a row that was written just before the previous pull but became visible
 * just after it is not missed. Merging the same row twice is harmless.
 */
const PULL_OVERLAP_MS = 30_000

function overlap(cursor: string | null): string | null {
  return cursor === null ? null : new Date(Date.parse(cursor) - PULL_OVERLAP_MS).toISOString()
}

function later(a: string | null, b: string | null): string | null {
  if (a === null) return b
  if (b === null) return a
  return Date.parse(b) > Date.parse(a) ? b : a
}

/**
 * Keeps one device's database in step with the server.
 *
 * Rules:
 * - Local writes mark rows dirty. A sync sends dirty rows, then pulls what
 *   changed on the server since the last pull.
 * - The newest change wins, by the timestamp of the device that made it. The
 *   server applies the same rule, so a stale row we send is simply ignored.
 * - A row with no unsent local change always takes the server's version.
 * - A deleted chart stays deleted and takes its ticks with it.
 */
export class SyncEngine {
  private readonly db: FirechartDB
  private readonly remote: Remote

  constructor(db: FirechartDB, remote: Remote) {
    this.db = db
    this.remote = remote
  }

  async sync(): Promise<void> {
    await this.push()
    await this.pull()
    await updateSyncState(this.db, { lastSyncedAt: new Date().toISOString() })
  }

  // Sending

  private async push(): Promise<void> {
    const { db, remote } = this

    const charts = await db.charts.where('dirty').equals(1).toArray()
    if (charts.length > 0) {
      await remote.pushCharts(charts.map(toRemoteChart))
      await db.transaction('rw', db.charts, async () => {
        for (const sent of charts) {
          // A row edited while it was being sent stays dirty and goes out next time.
          await db.charts
            .where('id')
            .equals(sent.id)
            .modify((row) => {
              if (row.updatedAt === sent.updatedAt) row.dirty = 0
            })
        }
      })
    }

    for (;;) {
      const entries = await db.entries.where('dirty').equals(1).limit(ENTRY_BATCH).toArray()
      if (entries.length === 0) break
      await remote.pushEntries(entries.map(toRemoteEntry))
      await db.transaction('rw', db.entries, async () => {
        for (const sent of entries) {
          await db.entries
            .where('[chartId+day]')
            .equals([sent.chartId, sent.day])
            .modify((row) => {
              if (row.updatedAt === sent.updatedAt) row.dirty = 0
            })
        }
      })
      if (entries.length < ENTRY_BATCH) break
    }

    // The photo goes up before the settings that point at it.
    const file = await db.files.get(BACKGROUND_KEY)
    if (file?.dirty === 1) {
      await remote.uploadBackground(file.blob)
      await db.files
        .where('key')
        .equals(BACKGROUND_KEY)
        .modify((row) => {
          if (row.version === file.version) row.dirty = 0
        })
    }
    if ((await getSyncState(db)).backgroundDeletePending) {
      await remote.deleteBackground()
      await updateSyncState(db, { backgroundDeletePending: false })
    }

    const settings = await db.kv.get(SETTINGS_KEY)
    if (settings?.dirty === 1 && settings.updatedAt) {
      await remote.pushSettings(await getSettings(db), settings.updatedAt)
      await db.kv
        .where('key')
        .equals(SETTINGS_KEY)
        .modify((row) => {
          if (row.updatedAt === settings.updatedAt) row.dirty = 0
        })
    }
  }

  // Receiving

  private async pull(): Promise<void> {
    const { db, remote } = this
    const state = await getSyncState(db)

    const chartPage = await remote.pullCharts(overlap(state.chartsCursor))
    await db.transaction('rw', db.charts, db.entries, async () => {
      for (const row of chartPage.rows) {
        const incoming = fromRemoteChart(row)
        if (!incoming) continue
        const local = await db.charts.get(incoming.id)
        if (local && local.dirty === 1 && Date.parse(local.updatedAt) > Date.parse(incoming.updatedAt)) continue
        await db.charts.put({ ...incoming, dirty: 0 } satisfies StoredChart)
        if (incoming.deletedAt !== null) await db.entries.where('chartId').equals(incoming.id).delete()
      }
    })

    const entryPage = await remote.pullEntries(overlap(state.entriesCursor))
    await db.transaction('rw', db.charts, db.entries, async () => {
      const live = new Set((await db.charts.toArray()).filter((c) => c.deletedAt === null).map((c) => c.id))
      const incoming = entryPage.rows.map(fromRemoteEntry).filter((entry) => live.has(entry.chartId))
      const existing = await db.entries.bulkGet(incoming.map((entry): [string, string] => [entry.chartId, entry.day]))
      const accepted: StoredEntry[] = []
      incoming.forEach((entry, index) => {
        const local = existing[index]
        if (local && local.dirty === 1 && Date.parse(local.updatedAt) > Date.parse(entry.updatedAt)) return
        accepted.push({ ...entry, dirty: 0 })
      })
      await db.entries.bulkPut(accepted)
    })

    const profile = await remote.pullProfile()
    if (profile) {
      const local = await db.kv.get(SETTINGS_KEY)
      const localIsNewer =
        local?.dirty === 1 &&
        local.updatedAt !== undefined &&
        Date.parse(local.updatedAt) > Date.parse(profile.updated_at)
      if (!localIsNewer) {
        await db.kv.put({
          key: SETTINGS_KEY,
          value: readSettings(profile.settings),
          updatedAt: toIso(profile.updated_at),
          dirty: 0,
        })
      }
    }

    await this.reconcileBackground()

    await updateSyncState(db, {
      chartsCursor: later(state.chartsCursor, chartPage.cursor),
      entriesCursor: later(state.entriesCursor, entryPage.cursor),
    })
  }

  /** Makes the stored photo match what the settings say it should be. */
  private async reconcileBackground(): Promise<void> {
    const { db, remote } = this
    const wanted = (await getSettings(db)).backgroundVersion
    const file = await db.files.get(BACKGROUND_KEY)
    if (file?.dirty === 1) return
    if (wanted === null) {
      if (file) await db.files.delete(BACKGROUND_KEY)
      return
    }
    if (file?.version === wanted) return
    const blob = await remote.downloadBackground()
    if (blob) await db.files.put({ key: BACKGROUND_KEY, blob, version: wanted, dirty: 0 })
  }
}
