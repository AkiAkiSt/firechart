import type { Settings } from '../store/db'
import type { Page, Remote, RemoteChart, RemoteEntry, RemoteProfile } from './remote'

type Stored<T> = T & { synced_at: string }

/**
 * An in-memory server for tests. It follows the same rules as the database
 * triggers in supabase/migrations: the newest change wins, a deleted chart
 * stays deleted, and deleting a chart drops its ticks.
 */
export class FakeServer {
  charts = new Map<string, Stored<RemoteChart>>()
  entries = new Map<string, Stored<RemoteEntry>>()
  profile: RemoteProfile = { display_name: 'Test', settings: {}, updated_at: '1970-01-01T00:00:00.000Z' }
  background: Blob | null = null
  /** When true every request fails, as if the network were down. */
  offline = false
  /** Called just before a batch of charts is stored; lets a test edit locally mid-push. */
  beforeChartsStored: (() => Promise<void>) | null = null
  requests = 0

  private clock = Date.parse('2030-01-01T00:00:00.000Z')

  /** Server time only moves forward, one millisecond per stored row. */
  stamp(): string {
    this.clock += 1
    return new Date(this.clock).toISOString()
  }

  touch(): void {
    this.requests += 1
    if (this.offline) throw new Error('Failed to fetch')
  }
}

function changedSince<T extends { synced_at: string }>(rows: Iterable<T>, since: string | null): Page<T> {
  const picked = [...rows]
    .filter((row) => since === null || Date.parse(row.synced_at) > Date.parse(since))
    .sort((a, b) => Date.parse(a.synced_at) - Date.parse(b.synced_at))
  return { rows: picked, cursor: picked.length > 0 ? picked[picked.length - 1].synced_at : since }
}

export class FakeRemote implements Remote {
  private readonly server: FakeServer

  constructor(server: FakeServer) {
    this.server = server
  }

  async pushCharts(rows: RemoteChart[]): Promise<void> {
    const { server } = this
    server.touch()
    if (server.beforeChartsStored) await server.beforeChartsStored()
    for (const row of rows) {
      const existing = server.charts.get(row.id)
      if (existing?.deleted_at) continue
      if (existing && Date.parse(row.updated_at) < Date.parse(existing.updated_at)) continue
      server.charts.set(row.id, { ...row, synced_at: server.stamp() })
      if (row.deleted_at) {
        for (const [key, entry] of server.entries) if (entry.chart_id === row.id) server.entries.delete(key)
      }
    }
  }

  async pushEntries(rows: RemoteEntry[]): Promise<void> {
    const { server } = this
    server.touch()
    for (const row of rows) {
      const chart = server.charts.get(row.chart_id)
      if (!chart) throw new Error('insert or update on table "entries" violates foreign key constraint')
      if (chart.deleted_at) continue
      const key = `${row.chart_id}|${row.day}`
      const existing = server.entries.get(key)
      if (existing && Date.parse(row.updated_at) < Date.parse(existing.updated_at)) continue
      server.entries.set(key, { ...row, synced_at: server.stamp() })
    }
  }

  async pushSettings(settings: Settings, updatedAt: string): Promise<void> {
    const { server } = this
    server.touch()
    if (Date.parse(updatedAt) < Date.parse(server.profile.updated_at)) return
    server.profile = { ...server.profile, settings: { ...settings }, updated_at: updatedAt }
  }

  async pullCharts(since: string | null): Promise<Page<RemoteChart>> {
    this.server.touch()
    return changedSince(this.server.charts.values(), since)
  }

  async pullEntries(since: string | null): Promise<Page<RemoteEntry>> {
    this.server.touch()
    return changedSince(this.server.entries.values(), since)
  }

  async pullProfile(): Promise<RemoteProfile | null> {
    this.server.touch()
    return { ...this.server.profile }
  }

  async uploadBackground(blob: Blob): Promise<void> {
    this.server.touch()
    this.server.background = blob
  }

  async downloadBackground(): Promise<Blob | null> {
    this.server.touch()
    return this.server.background
  }

  async deleteBackground(): Promise<void> {
    this.server.touch()
    this.server.background = null
  }
}
