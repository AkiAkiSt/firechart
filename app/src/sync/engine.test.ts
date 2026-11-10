import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FirechartDB } from '../store/db'
import {
  clearBackground,
  countUnsynced,
  createChart,
  deleteChart,
  doneDaysByChart,
  getBackground,
  getSettings,
  getSyncState,
  listCharts,
  setBackground,
  setDone,
  updateChart,
  updateSettings,
  type ChartDraft,
} from '../store/repo'
import { SyncEngine } from './engine'
import { FakeRemote, FakeServer } from './fakeRemote'

const TODAY = '2026-11-10'

const DRAFT: ChartDraft = {
  name: 'Exercise',
  icon: 'dumbbell',
  color: { kind: 'preset', ramp: 'ember' },
  shape: 'rounded',
  heatMode: 'streak',
  visibility: 'friends',
  schedule: { kind: 'daily' },
}

let counter = 0
let server: FakeServer
let phone: FirechartDB
let laptop: FirechartDB
let phoneSync: SyncEngine
let laptopSync: SyncEngine

/** Moves the clock, so each change gets its own timestamp. */
function later(ms = 1000): void {
  vi.setSystemTime(Date.now() + ms)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-10T09:00:00.000Z'))
  server = new FakeServer()
  phone = new FirechartDB(`phone-${++counter}`)
  laptop = new FirechartDB(`laptop-${counter}`)
  phoneSync = new SyncEngine(phone, new FakeRemote(server))
  laptopSync = new SyncEngine(laptop, new FakeRemote(server))
})

afterEach(async () => {
  vi.useRealTimers()
  await phone.delete()
  await laptop.delete()
})

describe('first sync', () => {
  it('uploads what was made before signing in and marks it sent', async () => {
    const chart = await createChart(phone, DRAFT, TODAY)
    await setDone(phone, chart.id, TODAY, true)
    await setDone(phone, chart.id, '2026-11-09', true)
    expect(await countUnsynced(phone)).toBe(3)

    await phoneSync.sync()

    expect(server.charts.size).toBe(1)
    expect(server.entries.size).toBe(2)
    expect(await countUnsynced(phone)).toBe(0)
    expect((await getSyncState(phone)).lastSyncedAt).not.toBeNull()
  })

  it('brings everything down to a second device', async () => {
    const chart = await createChart(phone, DRAFT, TODAY)
    await setDone(phone, chart.id, TODAY, true)
    await phoneSync.sync()

    await laptopSync.sync()

    const [copy] = await listCharts(laptop)
    expect(copy).toMatchObject({ id: chart.id, name: 'Exercise', dirty: 0 })
    expect((await doneDaysByChart(laptop)).get(chart.id)).toEqual(new Set([TODAY]))
    expect(await countUnsynced(laptop)).toBe(0)
  })

  it('does nothing harmful when there is nothing to do', async () => {
    await phoneSync.sync()
    await phoneSync.sync()
    expect(await listCharts(phone)).toEqual([])
  })
})

describe('changes travel both ways', () => {
  it('converges after edits on both devices', async () => {
    const chart = await createChart(phone, DRAFT, TODAY)
    await setDone(phone, chart.id, TODAY, true)
    await phoneSync.sync()
    await laptopSync.sync()

    later()
    await updateChart(laptop, chart.id, { name: 'Workout' })
    await setDone(laptop, chart.id, TODAY, false)
    later()
    await setDone(phone, chart.id, '2026-11-08', true)

    await laptopSync.sync()
    await phoneSync.sync()
    await laptopSync.sync()

    for (const device of [phone, laptop]) {
      expect((await listCharts(device))[0].name).toBe('Workout')
      expect((await doneDaysByChart(device)).get(chart.id)).toEqual(new Set(['2026-11-08']))
    }
  })

  it('lets the newest change to the same day win on every device', async () => {
    const chart = await createChart(phone, DRAFT, TODAY)
    await phoneSync.sync()
    await laptopSync.sync()

    later()
    await setDone(phone, chart.id, TODAY, false)
    later()
    await setDone(laptop, chart.id, TODAY, true)

    // The older change reaches the server last and must not win.
    await laptopSync.sync()
    await phoneSync.sync()
    await laptopSync.sync()

    expect((await doneDaysByChart(phone)).get(chart.id)).toEqual(new Set([TODAY]))
    expect((await doneDaysByChart(laptop)).get(chart.id)).toEqual(new Set([TODAY]))
    expect(await countUnsynced(phone)).toBe(0)
  })

  it('takes the server version of a row that has no unsent change, whatever its timestamp', async () => {
    const chart = await createChart(phone, DRAFT, TODAY)
    await phoneSync.sync()
    await laptopSync.sync()

    // The laptop's copy carries a timestamp from a clock that ran ahead.
    await laptop.charts.update(chart.id, { updatedAt: '2031-01-01T00:00:00.000Z', dirty: 0 })
    later()
    await updateChart(phone, chart.id, { name: 'Renamed on the phone' })
    await phoneSync.sync()
    await laptopSync.sync()

    expect((await listCharts(laptop))[0].name).toBe('Renamed on the phone')
  })
})

describe('deleting a chart', () => {
  it('removes it and its ticks everywhere, and it stays gone', async () => {
    const chart = await createChart(phone, DRAFT, TODAY)
    await setDone(phone, chart.id, TODAY, true)
    await phoneSync.sync()
    await laptopSync.sync()

    later()
    await deleteChart(phone, chart.id)
    // Meanwhile the laptop, unaware, ticks another day and renames the chart.
    later()
    await setDone(laptop, chart.id, '2026-11-09', true)
    await updateChart(laptop, chart.id, { name: 'Still here?' })

    await phoneSync.sync()
    await laptopSync.sync()
    await phoneSync.sync()

    expect(await listCharts(phone)).toEqual([])
    expect(await listCharts(laptop)).toEqual([])
    expect(await laptop.entries.count()).toBe(0)
    expect(server.entries.size).toBe(0)
    expect(await countUnsynced(laptop)).toBe(0)
  })
})

describe('settings', () => {
  it('sync between devices', async () => {
    await phoneSync.sync()
    await laptopSync.sync()

    later()
    await updateSettings(phone, { theme: 'light', weekStart: 'sunday' })
    await phoneSync.sync()
    await laptopSync.sync()

    expect(await getSettings(laptop)).toMatchObject({ theme: 'light', weekStart: 'sunday' })
  })

  it('keep what was chosen before signing in', async () => {
    await updateSettings(phone, { theme: 'light' })
    later()
    await phoneSync.sync()
    expect((await getSettings(phone)).theme).toBe('light')
    expect(server.profile.settings).toMatchObject({ theme: 'light' })
  })

  it('ignore junk sent by the server', async () => {
    server.profile = {
      display_name: 'Test',
      settings: { theme: 'neon', weekStart: 7, backgroundDim: 5, extra: true },
      updated_at: '2026-11-10T08:00:00.000Z',
    }
    await phoneSync.sync()
    expect(await getSettings(phone)).toMatchObject({ theme: 'dark', weekStart: 'monday', backgroundDim: 0.35 })
  })
})

describe('background photo', () => {
  it('follows the person to another device and is removed everywhere', async () => {
    await setBackground(phone, new Blob(['photo-bytes'], { type: 'image/jpeg' }))
    await phoneSync.sync()
    await laptopSync.sync()

    const copy = await getBackground(laptop)
    expect(copy).not.toBeNull()
    expect(await copy!.text()).toBe('photo-bytes')
    expect((await getSettings(laptop)).photoBackground).toBe(true)

    later()
    await clearBackground(phone)
    await phoneSync.sync()
    await laptopSync.sync()

    expect(server.background).toBeNull()
    expect(await getBackground(laptop)).toBeNull()
    expect((await getSettings(laptop)).photoBackground).toBe(false)
  })

  it('is not downloaded again when it has not changed', async () => {
    await setBackground(phone, new Blob(['photo-bytes'], { type: 'image/jpeg' }))
    await phoneSync.sync()
    await laptopSync.sync()
    const download = vi.spyOn(FakeRemote.prototype, 'downloadBackground')
    await laptopSync.sync()
    await phoneSync.sync()
    expect(download).not.toHaveBeenCalled()
    download.mockRestore()
  })
})

describe('when things go wrong', () => {
  it('keeps changes for later while offline', async () => {
    const chart = await createChart(phone, DRAFT, TODAY)
    server.offline = true
    await expect(phoneSync.sync()).rejects.toThrow('Failed to fetch')
    await setDone(phone, chart.id, TODAY, true)
    expect(await countUnsynced(phone)).toBe(2)

    server.offline = false
    await phoneSync.sync()
    expect(server.charts.size).toBe(1)
    expect(server.entries.size).toBe(1)
    expect(await countUnsynced(phone)).toBe(0)
  })

  it('does not lose an edit made while a sync is in flight', async () => {
    const chart = await createChart(phone, DRAFT, TODAY)
    server.beforeChartsStored = async () => {
      server.beforeChartsStored = null
      later()
      await updateChart(phone, chart.id, { name: 'Edited mid-sync' })
    }
    await phoneSync.sync()

    expect((await listCharts(phone))[0]).toMatchObject({ name: 'Edited mid-sync', dirty: 1 })
    await phoneSync.sync()
    expect(server.charts.get(chart.id)?.name).toBe('Edited mid-sync')
    expect(await countUnsynced(phone)).toBe(0)
  })

  it('skips a chart the server sends in a shape it does not understand', async () => {
    server.charts.set('broken', {
      id: 'broken',
      name: '',
      icon: 'target',
      color: { kind: 'preset', ramp: 'nope' },
      shape: 'hexagon',
      heat_mode: 'streak',
      visibility: 'friends',
      schedule: { kind: 'daily' },
      start_date: '2026-11-01',
      sort_order: 1,
      archived_at: null,
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
      deleted_at: null,
      synced_at: server.stamp(),
    })
    await phoneSync.sync()
    expect(await listCharts(phone)).toEqual([])
  })
})
