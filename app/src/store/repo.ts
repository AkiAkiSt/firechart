import { isValidDay } from '../domain/dates'
import { normalizeSchedule } from '../domain/schedule'
import type {
  Chart,
  ChartColor,
  Day,
  Entry,
  HeatMode,
  RampName,
  Schedule,
  Shape,
  Visibility,
} from '../domain/types'
import { normalizeHex, RAMP_NAMES } from '../theme/ramps'
import { DEFAULT_SETTINGS, type FirechartDB, type Settings } from './db'

const SETTINGS_KEY = 'settings'
const BACKGROUND_KEY = 'background'

export const MAX_NAME_LENGTH = 60

/** The fields a person fills in when creating or editing a chart. */
export interface ChartDraft {
  name: string
  icon: string
  color: ChartColor
  shape: Shape
  heatMode: HeatMode
  visibility: Visibility
  schedule: Schedule
}

function nowIso(): string {
  return new Date().toISOString()
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH)
}

// Charts

/** Charts that still exist, in the owner's order. */
export async function listCharts(db: FirechartDB): Promise<Chart[]> {
  const all = await db.charts.orderBy('sortOrder').toArray()
  return all.filter((chart) => chart.deletedAt === null)
}

export async function createChart(db: FirechartDB, draft: ChartDraft, today: Day): Promise<Chart> {
  const name = cleanName(draft.name)
  if (name === '') throw new Error('A chart needs a name.')
  const existing = await db.charts.toArray()
  const lastOrder = existing.reduce((max, chart) => Math.max(max, chart.sortOrder), 0)
  const now = nowIso()
  const chart: Chart = {
    id: crypto.randomUUID(),
    name,
    icon: draft.icon,
    color: draft.color,
    shape: draft.shape,
    heatMode: draft.heatMode,
    visibility: draft.visibility,
    schedule: normalizeSchedule(draft.schedule),
    startDate: today,
    sortOrder: lastOrder + 1,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.charts.add(chart)
  return chart
}

export async function updateChart(db: FirechartDB, id: string, patch: Partial<ChartDraft>): Promise<void> {
  const changes: Partial<Chart> = { ...patch, updatedAt: nowIso() }
  if (patch.name !== undefined) {
    const name = cleanName(patch.name)
    if (name === '') throw new Error('A chart needs a name.')
    changes.name = name
  }
  if (patch.schedule !== undefined) changes.schedule = normalizeSchedule(patch.schedule)
  await db.charts.update(id, changes)
}

export async function setArchived(db: FirechartDB, id: string, archived: boolean): Promise<void> {
  const now = nowIso()
  await db.charts.update(id, { archivedAt: archived ? now : null, updatedAt: now })
}

/** Removes a chart and its ticks. The chart row is kept as a marker so the deletion can sync later. */
export async function deleteChart(db: FirechartDB, id: string): Promise<void> {
  const now = nowIso()
  await db.transaction('rw', db.charts, db.entries, async () => {
    await db.charts.update(id, { deletedAt: now, updatedAt: now })
    await db.entries.where('chartId').equals(id).delete()
  })
}

/** Moves a chart one place up or down among charts in the same group (active or archived). */
export async function moveChart(db: FirechartDB, id: string, direction: 'up' | 'down'): Promise<void> {
  await db.transaction('rw', db.charts, async () => {
    const charts = await listCharts(db)
    const chart = charts.find((c) => c.id === id)
    if (!chart) return
    const group = charts.filter((c) => (c.archivedAt === null) === (chart.archivedAt === null))
    const index = group.findIndex((c) => c.id === id)
    const other = group[direction === 'up' ? index - 1 : index + 1]
    if (!other) return
    const now = nowIso()
    await db.charts.update(chart.id, { sortOrder: other.sortOrder, updatedAt: now })
    await db.charts.update(other.id, { sortOrder: chart.sortOrder, updatedAt: now })
  })
}

// Ticks

export async function setDone(db: FirechartDB, chartId: string, day: Day, done: boolean): Promise<void> {
  if (!isValidDay(day)) throw new Error(`Not a date: ${day}`)
  const now = nowIso()
  const existing = await db.entries.get([chartId, day])
  await db.entries.put({
    chartId,
    day,
    done,
    loggedAt: existing && existing.done === done ? existing.loggedAt : now,
    updatedAt: now,
  })
}

/** Every chart's ticked days. */
export async function doneDaysByChart(db: FirechartDB): Promise<Map<string, Set<Day>>> {
  const map = new Map<string, Set<Day>>()
  await db.entries.each((entry) => {
    if (!entry.done) return
    let days = map.get(entry.chartId)
    if (!days) {
      days = new Set()
      map.set(entry.chartId, days)
    }
    days.add(entry.day)
  })
  return map
}

// Settings

export async function getSettings(db: FirechartDB): Promise<Settings> {
  const row = await db.kv.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings> | undefined) ?? {}) }
}

export async function updateSettings(db: FirechartDB, patch: Partial<Settings>): Promise<void> {
  await db.transaction('rw', db.kv, async () => {
    const current = await getSettings(db)
    await db.kv.put({ key: SETTINGS_KEY, value: { ...current, ...patch } })
  })
}

// Background photo

export async function getBackground(db: FirechartDB): Promise<Blob | null> {
  return (await db.files.get(BACKGROUND_KEY))?.blob ?? null
}

export async function setBackground(db: FirechartDB, blob: Blob): Promise<void> {
  await db.transaction('rw', db.files, db.kv, async () => {
    await db.files.put({ key: BACKGROUND_KEY, blob, updatedAt: nowIso() })
    await updateSettings(db, { photoBackground: true })
  })
}

export async function clearBackground(db: FirechartDB): Promise<void> {
  await db.transaction('rw', db.files, db.kv, async () => {
    await db.files.delete(BACKGROUND_KEY)
    await updateSettings(db, { photoBackground: false })
  })
}

// Export and import

export const EXPORT_FORMAT = 'firechart-export'
export const EXPORT_VERSION = 1

export interface ExportFile {
  format: typeof EXPORT_FORMAT
  version: number
  exportedAt: string
  charts: Chart[]
  entries: Entry[]
  settings: Settings
}

/** Everything except the background photo, which stays on the device. */
export async function exportData(db: FirechartDB): Promise<ExportFile> {
  const charts = await listCharts(db)
  const ids = new Set(charts.map((chart) => chart.id))
  const entries = (await db.entries.toArray()).filter((entry) => ids.has(entry.chartId))
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: nowIso(),
    charts,
    entries,
    settings: { ...(await getSettings(db)), photoBackground: false },
  }
}

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** One line per ticked day: chart name, date. Opens in any spreadsheet. */
export function exportCsv(file: ExportFile): string {
  const names = new Map(file.charts.map((chart) => [chart.id, chart.name]))
  const lines = file.entries
    .filter((entry) => entry.done)
    .sort((a, b) => (a.day === b.day ? 0 : a.day < b.day ? -1 : 1))
    .map((entry) => `${csvField(names.get(entry.chartId) ?? '')},${entry.day}`)
  return ['chart,day', ...lines].join('\n') + '\n'
}

const SHAPES: readonly Shape[] = ['rounded', 'square', 'dot']
const HEAT_MODES: readonly HeatMode[] = ['streak', 'flat']
const VISIBILITIES: readonly Visibility[] = ['friends', 'private']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readColor(value: unknown): ChartColor | null {
  if (!isRecord(value)) return null
  if (value.kind === 'preset' && RAMP_NAMES.includes(value.ramp as RampName)) {
    return { kind: 'preset', ramp: value.ramp as RampName }
  }
  if (value.kind === 'custom' && typeof value.hex === 'string') {
    const hex = normalizeHex(value.hex)
    if (hex) return { kind: 'custom', hex }
  }
  return null
}

function readSchedule(value: unknown): Schedule | null {
  if (!isRecord(value)) return null
  if (value.kind === 'daily') return { kind: 'daily' }
  if (value.kind === 'weekdays' && Array.isArray(value.days) && value.days.every((d) => Number.isInteger(d))) {
    return normalizeSchedule({ kind: 'weekdays', days: value.days as number[] })
  }
  return null
}

function readChart(value: unknown): Chart | null {
  if (!isRecord(value)) return null
  const color = readColor(value.color)
  const schedule = readSchedule(value.schedule)
  const name = typeof value.name === 'string' ? cleanName(value.name) : ''
  if (
    typeof value.id !== 'string' ||
    value.id === '' ||
    name === '' ||
    !color ||
    !schedule ||
    !isValidDay(value.startDate) ||
    !SHAPES.includes(value.shape as Shape) ||
    !HEAT_MODES.includes(value.heatMode as HeatMode) ||
    !VISIBILITIES.includes(value.visibility as Visibility)
  ) {
    return null
  }
  const now = nowIso()
  return {
    id: value.id,
    name,
    icon: typeof value.icon === 'string' ? value.icon : 'target',
    color,
    shape: value.shape as Shape,
    heatMode: value.heatMode as HeatMode,
    visibility: value.visibility as Visibility,
    schedule,
    startDate: value.startDate,
    sortOrder: typeof value.sortOrder === 'number' ? value.sortOrder : 0,
    archivedAt: typeof value.archivedAt === 'string' ? value.archivedAt : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
    deletedAt: null,
  }
}

function readEntry(value: unknown, chartIds: ReadonlySet<string>): Entry | null {
  if (!isRecord(value)) return null
  if (typeof value.chartId !== 'string' || !chartIds.has(value.chartId)) return null
  if (!isValidDay(value.day) || typeof value.done !== 'boolean') return null
  const now = nowIso()
  return {
    chartId: value.chartId,
    day: value.day,
    done: value.done,
    loggedAt: typeof value.loggedAt === 'string' ? value.loggedAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
  }
}

export interface ImportResult {
  charts: number
  entries: number
  skipped: number
}

/**
 * Adds or updates charts and ticks from an export. Nothing already on the
 * device is deleted, and anything malformed in the file is skipped.
 */
export async function importData(db: FirechartDB, raw: unknown): Promise<ImportResult> {
  if (!isRecord(raw) || raw.format !== EXPORT_FORMAT) {
    throw new Error('This is not a Firechart export file.')
  }
  if (typeof raw.version !== 'number' || raw.version > EXPORT_VERSION) {
    throw new Error('This export was made by a newer version of Firechart.')
  }
  const rawCharts = Array.isArray(raw.charts) ? raw.charts : []
  const rawEntries = Array.isArray(raw.entries) ? raw.entries : []

  const charts = rawCharts.map(readChart).filter((chart): chart is Chart => chart !== null)
  const chartIds = new Set(charts.map((chart) => chart.id))
  const entries = rawEntries
    .map((entry) => readEntry(entry, chartIds))
    .filter((entry): entry is Entry => entry !== null)

  await db.transaction('rw', db.charts, db.entries, async () => {
    // Imported charts go after the existing ones, keeping their own order.
    const existing = await db.charts.toArray()
    const known = new Map(existing.map((chart) => [chart.id, chart]))
    let order = existing.reduce((max, chart) => Math.max(max, chart.sortOrder), 0)
    const sorted = [...charts].sort((a, b) => a.sortOrder - b.sortOrder)
    for (const chart of sorted) {
      const current = known.get(chart.id)
      const sortOrder = current && current.deletedAt === null ? current.sortOrder : ++order
      await db.charts.put({ ...chart, sortOrder })
    }
    await db.entries.bulkPut(entries)
  })

  return {
    charts: charts.length,
    entries: entries.length,
    skipped: rawCharts.length - charts.length + (rawEntries.length - entries.length),
  }
}

/** Wipes the device's copy of everything. */
export async function deleteEverything(db: FirechartDB): Promise<void> {
  await db.transaction('rw', db.charts, db.entries, db.kv, db.files, async () => {
    await Promise.all([db.charts.clear(), db.entries.clear(), db.kv.clear(), db.files.clear()])
  })
}
