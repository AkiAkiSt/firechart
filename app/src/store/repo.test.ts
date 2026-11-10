import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, FirechartDB } from './db'
import {
  createChart,
  deleteChart,
  deleteEverything,
  doneDaysByChart,
  exportCsv,
  exportData,
  getSettings,
  importData,
  listCharts,
  moveChart,
  setArchived,
  setDone,
  updateChart,
  updateSettings,
  type ChartDraft,
} from './repo'

const TODAY = '2026-11-10'

function draft(name: string, overrides: Partial<ChartDraft> = {}): ChartDraft {
  return {
    name,
    icon: 'dumbbell',
    color: { kind: 'preset', ramp: 'ember' },
    shape: 'rounded',
    heatMode: 'streak',
    visibility: 'friends',
    schedule: { kind: 'daily' },
    ...overrides,
  }
}

let db: FirechartDB
let counter = 0

beforeEach(() => {
  db = new FirechartDB(`test-${++counter}`)
})

afterEach(async () => {
  await db.delete()
})

describe('charts', () => {
  it('creates charts in order with a clean name', async () => {
    const a = await createChart(db, draft('  Exercise  '), TODAY)
    const b = await createChart(db, draft('Study   4 h'), TODAY)
    expect(a.name).toBe('Exercise')
    expect(b.name).toBe('Study 4 h')
    expect(a.startDate).toBe(TODAY)
    expect((await listCharts(db)).map((c) => c.name)).toEqual(['Exercise', 'Study 4 h'])
  })

  it('refuses an empty name', async () => {
    await expect(createChart(db, draft('   '), TODAY)).rejects.toThrow()
    const chart = await createChart(db, draft('Read'), TODAY)
    await expect(updateChart(db, chart.id, { name: '' })).rejects.toThrow()
  })

  it('normalizes schedules', async () => {
    const chart = await createChart(db, draft('Gym', { schedule: { kind: 'weekdays', days: [5, 1, 3, 3] } }), TODAY)
    expect(chart.schedule).toEqual({ kind: 'weekdays', days: [1, 3, 5] })
    await updateChart(db, chart.id, { schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5, 6, 7] } })
    expect((await listCharts(db))[0].schedule).toEqual({ kind: 'daily' })
  })

  it('updates and archives', async () => {
    const chart = await createChart(db, draft('Read'), TODAY)
    await updateChart(db, chart.id, { name: 'Read 30 min', visibility: 'private', shape: 'dot' })
    await setArchived(db, chart.id, true)
    const [saved] = await listCharts(db)
    expect(saved.name).toBe('Read 30 min')
    expect(saved.visibility).toBe('private')
    expect(saved.shape).toBe('dot')
    expect(saved.archivedAt).not.toBeNull()
    await setArchived(db, chart.id, false)
    expect((await listCharts(db))[0].archivedAt).toBeNull()
  })

  it('deletes a chart together with its ticks', async () => {
    const keep = await createChart(db, draft('Keep'), TODAY)
    const gone = await createChart(db, draft('Gone'), TODAY)
    await setDone(db, keep.id, TODAY, true)
    await setDone(db, gone.id, TODAY, true)
    await deleteChart(db, gone.id)
    expect((await listCharts(db)).map((c) => c.name)).toEqual(['Keep'])
    const done = await doneDaysByChart(db)
    expect(done.has(gone.id)).toBe(false)
    expect(done.get(keep.id)).toEqual(new Set([TODAY]))
  })

  it('reorders within the active group', async () => {
    const a = await createChart(db, draft('A'), TODAY)
    await createChart(db, draft('B'), TODAY)
    const c = await createChart(db, draft('C'), TODAY)
    await moveChart(db, c.id, 'up')
    expect((await listCharts(db)).map((x) => x.name)).toEqual(['A', 'C', 'B'])
    await moveChart(db, a.id, 'up')
    expect((await listCharts(db)).map((x) => x.name)).toEqual(['A', 'C', 'B'])
    await moveChart(db, a.id, 'down')
    expect((await listCharts(db)).map((x) => x.name)).toEqual(['C', 'A', 'B'])
  })
})

describe('ticks', () => {
  it('ticks and unticks a day', async () => {
    const chart = await createChart(db, draft('Exercise'), TODAY)
    await setDone(db, chart.id, TODAY, true)
    await setDone(db, chart.id, '2026-11-09', true)
    await setDone(db, chart.id, '2026-11-09', false)
    expect((await doneDaysByChart(db)).get(chart.id)).toEqual(new Set([TODAY]))
    expect(await db.entries.count()).toBe(2)
  })

  it('rejects something that is not a date', async () => {
    const chart = await createChart(db, draft('Exercise'), TODAY)
    await expect(setDone(db, chart.id, '2026-02-30', true)).rejects.toThrow()
  })
})

describe('settings', () => {
  it('starts from the defaults and merges changes', async () => {
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS)
    await updateSettings(db, { theme: 'light' })
    await updateSettings(db, { weekStart: 'sunday' })
    expect(await getSettings(db)).toEqual({ ...DEFAULT_SETTINGS, theme: 'light', weekStart: 'sunday' })
  })
})

describe('export and import', () => {
  it('round-trips into an empty device', async () => {
    const chart = await createChart(db, draft('Exercise', { color: { kind: 'custom', hex: '#2c83c5' } }), TODAY)
    await setDone(db, chart.id, TODAY, true)
    await setDone(db, chart.id, '2026-11-08', true)
    await updateSettings(db, { weekStart: 'sunday' })
    const file = JSON.parse(JSON.stringify(await exportData(db)))

    const other = new FirechartDB(`test-${++counter}`)
    try {
      const result = await importData(other, file)
      expect(result).toEqual({ charts: 1, entries: 2, skipped: 0 })
      const [copy] = await listCharts(other)
      expect(copy.name).toBe('Exercise')
      expect(copy.color).toEqual({ kind: 'custom', hex: '#2c83c5' })
      expect((await doneDaysByChart(other)).get(chart.id)).toEqual(new Set([TODAY, '2026-11-08']))
    } finally {
      await other.delete()
    }
  })

  it('adds to what is already there without deleting anything', async () => {
    const mine = await createChart(db, draft('Mine'), TODAY)
    await setDone(db, mine.id, TODAY, true)
    const other = new FirechartDB(`test-${++counter}`)
    try {
      const theirs = await createChart(other, draft('Theirs'), TODAY)
      await setDone(other, theirs.id, '2026-11-01', true)
      await importData(db, JSON.parse(JSON.stringify(await exportData(other))))
    } finally {
      await other.delete()
    }
    expect((await listCharts(db)).map((c) => c.name)).toEqual(['Mine', 'Theirs'])
    expect((await doneDaysByChart(db)).get(mine.id)).toEqual(new Set([TODAY]))
  })

  it('skips malformed rows and rejects foreign files', async () => {
    const result = await importData(db, {
      format: 'firechart-export',
      version: 1,
      charts: [
        { id: 'ok', name: 'Fine', color: { kind: 'preset', ramp: 'moss' }, schedule: { kind: 'daily' }, startDate: '2026-01-01', shape: 'dot', heatMode: 'flat', visibility: 'private' },
        { id: 'bad-colour', name: 'X', color: { kind: 'preset', ramp: 'nope' }, schedule: { kind: 'daily' }, startDate: '2026-01-01', shape: 'dot', heatMode: 'flat', visibility: 'private' },
        { name: 'no id' },
        'nonsense',
      ],
      entries: [
        { chartId: 'ok', day: '2026-01-02', done: true },
        { chartId: 'ok', day: '2026-02-30', done: true },
        { chartId: 'unknown', day: '2026-01-02', done: true },
      ],
    })
    expect(result).toEqual({ charts: 1, entries: 1, skipped: 5 })
    await expect(importData(db, { format: 'something-else' })).rejects.toThrow()
    await expect(importData(db, { format: 'firechart-export', version: 99 })).rejects.toThrow()
    await expect(importData(db, null)).rejects.toThrow()
  })

  it('writes a CSV of ticked days', async () => {
    const chart = await createChart(db, draft('Read, 30 min'), TODAY)
    await setDone(db, chart.id, TODAY, true)
    await setDone(db, chart.id, '2026-11-01', true)
    await setDone(db, chart.id, '2026-11-05', false)
    expect(exportCsv(await exportData(db))).toBe('chart,day\n"Read, 30 min",2026-11-01\n"Read, 30 min",2026-11-10\n')
  })

  it('wipes everything', async () => {
    const chart = await createChart(db, draft('Exercise'), TODAY)
    await setDone(db, chart.id, TODAY, true)
    await updateSettings(db, { theme: 'light' })
    await deleteEverything(db)
    expect(await listCharts(db)).toEqual([])
    expect(await db.entries.count()).toBe(0)
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS)
  })
})
