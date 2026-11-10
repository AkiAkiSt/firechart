import type { SupabaseClient } from '@supabase/supabase-js'
import type { Chart, Entry } from '../domain/types'
import { DEFAULT_SETTINGS, type Settings } from '../store/db'
import { readChart } from '../store/repo'

/** Rows as the server stores them. */
export interface RemoteChart {
  id: string
  name: string
  icon: string
  color: unknown
  shape: string
  heat_mode: string
  visibility: string
  schedule: unknown
  start_date: string
  sort_order: number
  archived_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  synced_at?: string
}

export interface RemoteEntry {
  chart_id: string
  day: string
  done: boolean
  logged_at: string
  updated_at: string
  synced_at?: string
}

export interface RemoteProfile {
  display_name: string
  settings: unknown
  updated_at: string
}

/** Rows changed since a point in time, and the newest server timestamp among them. */
export interface Page<T> {
  rows: T[]
  cursor: string | null
}

/**
 * Everything the sync engine needs from a server. The real one talks to
 * Supabase; tests use an in-memory stand-in with the same rules.
 */
export interface Remote {
  pushCharts(rows: RemoteChart[]): Promise<void>
  pushEntries(rows: RemoteEntry[]): Promise<void>
  pushSettings(settings: Settings, updatedAt: string): Promise<void>
  pullCharts(since: string | null): Promise<Page<RemoteChart>>
  pullEntries(since: string | null): Promise<Page<RemoteEntry>>
  pullProfile(): Promise<RemoteProfile | null>
  uploadBackground(blob: Blob): Promise<void>
  downloadBackground(): Promise<Blob | null>
  deleteBackground(): Promise<void>
}

/** Timestamps are compared as numbers and stored in one format, whatever the server sent. */
export function toIso(value: string): string {
  return new Date(value).toISOString()
}

export function toRemoteChart(chart: Chart): RemoteChart {
  return {
    id: chart.id,
    name: chart.name,
    icon: chart.icon,
    color: chart.color,
    shape: chart.shape,
    heat_mode: chart.heatMode,
    visibility: chart.visibility,
    schedule: chart.schedule,
    start_date: chart.startDate,
    sort_order: chart.sortOrder,
    archived_at: chart.archivedAt,
    created_at: chart.createdAt,
    updated_at: chart.updatedAt,
    deleted_at: chart.deletedAt,
  }
}

/** Null when the server sent something the app cannot use. */
export function fromRemoteChart(row: RemoteChart): Chart | null {
  const chart = readChart({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    shape: row.shape,
    heatMode: row.heat_mode,
    visibility: row.visibility,
    schedule: row.schedule,
    startDate: row.start_date,
    sortOrder: row.sort_order,
  })
  if (!chart) return null
  return {
    ...chart,
    archivedAt: row.archived_at ? toIso(row.archived_at) : null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
  }
}

export function toRemoteEntry(entry: Entry): RemoteEntry {
  return {
    chart_id: entry.chartId,
    day: entry.day,
    done: entry.done,
    logged_at: entry.loggedAt,
    updated_at: entry.updatedAt,
  }
}

export function fromRemoteEntry(row: RemoteEntry): Entry {
  return {
    chartId: row.chart_id,
    day: row.day,
    done: row.done,
    loggedAt: toIso(row.logged_at),
    updatedAt: toIso(row.updated_at),
  }
}

/** Keeps only settings the app knows, with sensible types, on top of the defaults. */
export function readSettings(value: unknown): Settings {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const settings = { ...DEFAULT_SETTINGS }
  if (raw.theme === 'dark' || raw.theme === 'light') settings.theme = raw.theme
  if (raw.weekStart === 'monday' || raw.weekStart === 'sunday') settings.weekStart = raw.weekStart
  if (typeof raw.photoBackground === 'boolean') settings.photoBackground = raw.photoBackground
  if (typeof raw.backgroundDim === 'number' && raw.backgroundDim >= 0 && raw.backgroundDim <= 0.8) {
    settings.backgroundDim = raw.backgroundDim
  }
  if (typeof raw.backgroundVersion === 'string') settings.backgroundVersion = raw.backgroundVersion
  if (typeof raw.catchUpDismissedFor === 'string') settings.catchUpDismissedFor = raw.catchUpDismissedFor
  return settings
}

const PAGE_SIZE = 1000
const PUSH_BATCH = 500
const BACKGROUND_BUCKET = 'backgrounds'

function newest(rows: { synced_at?: string }[], previous: string | null): string | null {
  let best = previous
  for (const row of rows) {
    if (row.synced_at && (best === null || Date.parse(row.synced_at) > Date.parse(best))) best = row.synced_at
  }
  return best
}

/** The real server: a Supabase project, acting as the signed-in person. */
export class SupabaseRemote implements Remote {
  private readonly client: SupabaseClient
  private readonly userId: string

  constructor(client: SupabaseClient, userId: string) {
    this.client = client
    this.userId = userId
  }

  private get backgroundPath(): string {
    return `${this.userId}/background.jpg`
  }

  async pushCharts(rows: RemoteChart[]): Promise<void> {
    for (let i = 0; i < rows.length; i += PUSH_BATCH) {
      const { error } = await this.client.from('charts').upsert(rows.slice(i, i + PUSH_BATCH), { onConflict: 'id' })
      if (error) throw new Error(error.message)
    }
  }

  async pushEntries(rows: RemoteEntry[]): Promise<void> {
    for (let i = 0; i < rows.length; i += PUSH_BATCH) {
      const { error } = await this.client
        .from('entries')
        .upsert(rows.slice(i, i + PUSH_BATCH), { onConflict: 'chart_id,day' })
      if (error) throw new Error(error.message)
    }
  }

  async pushSettings(settings: Settings, updatedAt: string): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({ settings, updated_at: updatedAt })
      .eq('id', this.userId)
    if (error) throw new Error(error.message)
  }

  private async pullAll<T extends { synced_at?: string }>(
    table: 'charts' | 'entries',
    since: string | null,
    order: string[],
  ): Promise<Page<T>> {
    const rows: T[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = this.client.from(table).select('*').eq('owner_id', this.userId)
      if (since) query = query.gt('synced_at', since)
      for (const column of order) query = query.order(column)
      const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
      if (error) throw new Error(error.message)
      rows.push(...((data ?? []) as T[]))
      if (!data || data.length < PAGE_SIZE) break
    }
    return { rows, cursor: newest(rows, since) }
  }

  pullCharts(since: string | null): Promise<Page<RemoteChart>> {
    return this.pullAll<RemoteChart>('charts', since, ['synced_at', 'id'])
  }

  pullEntries(since: string | null): Promise<Page<RemoteEntry>> {
    return this.pullAll<RemoteEntry>('entries', since, ['synced_at', 'chart_id', 'day'])
  }

  async pullProfile(): Promise<RemoteProfile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('display_name, settings, updated_at')
      .eq('id', this.userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as RemoteProfile | null) ?? null
  }

  async uploadBackground(blob: Blob): Promise<void> {
    const { error } = await this.client.storage
      .from(BACKGROUND_BUCKET)
      .upload(this.backgroundPath, blob, { upsert: true, contentType: blob.type || 'image/jpeg' })
    if (error) throw new Error(error.message)
  }

  async downloadBackground(): Promise<Blob | null> {
    const { data, error } = await this.client.storage.from(BACKGROUND_BUCKET).download(this.backgroundPath)
    if (error) {
      // A missing file is an answer, not a failure.
      if (/not.?found|does not exist|400|404/i.test(error.message)) return null
      throw new Error(error.message)
    }
    return data
  }

  async deleteBackground(): Promise<void> {
    const { error } = await this.client.storage.from(BACKGROUND_BUCKET).remove([this.backgroundPath])
    if (error) throw new Error(error.message)
  }
}
