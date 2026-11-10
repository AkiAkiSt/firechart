/**
 * End-to-end checks against a real Supabase stack: sign-up, invite codes, the
 * privacy rules as seen through the public API, and two devices syncing.
 *
 * Needs a local stack (`npx supabase start` at the repository root) with its
 * settings exported: API_URL, ANON_KEY and SERVICE_ROLE_KEY. CI does this in
 * .github/workflows/database.yml. It never runs against the real project.
 */
import 'fake-indexeddb/auto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import { FirechartDB } from '../src/store/db'
import {
  clearBackground,
  countUnsynced,
  createChart,
  deleteChart,
  doneDaysByChart,
  getBackground,
  getSettings,
  listCharts,
  setBackground,
  setDone,
  updateChart,
  updateSettings,
  type ChartDraft,
} from '../src/store/repo'
import { SyncEngine } from '../src/sync/engine'
import { SupabaseRemote, toRemoteChart, toRemoteEntry } from '../src/sync/remote'

declare const process: { env: Record<string, string | undefined> }

const API_URL = process.env.API_URL ?? ''
const ANON_KEY = process.env.ANON_KEY ?? ''
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY ?? ''

if (!API_URL.startsWith('http://127.0.0.1') && !API_URL.startsWith('http://localhost')) {
  throw new Error('These tests create and delete accounts, so they only run against a local Supabase stack.')
}

const run = crypto.randomUUID().slice(0, 8)
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

const ownerCode = `owner-${run}-${crypto.randomUUID()}`
const memberCode = `member-${run}-${crypto.randomUUID()}`

function newClient(key = ANON_KEY): SupabaseClient {
  return createClient(API_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

interface Person {
  email: string
  password: string
  userId: string
}

async function signUp(name: string): Promise<{ person: Person; client: SupabaseClient }> {
  const client = newClient()
  const email = `${name}-${run}@example.test`
  const password = crypto.randomUUID()
  const { data, error } = await client.auth.signUp({ email, password })
  if (error || !data.user || !data.session) throw new Error(`sign-up failed: ${error?.message ?? 'no session'}`)
  return { person: { email, password, userId: data.user.id }, client }
}

/** A device: its own database, signed in as the given person. */
async function device(person: Person, label: string) {
  const client = newClient()
  const { error } = await client.auth.signInWithPassword({ email: person.email, password: person.password })
  if (error) throw new Error(`sign-in failed: ${error.message}`)
  const db = new FirechartDB(`${label}-${run}`)
  const remote = new SupabaseRemote(client, person.userId)
  return { client, db, remote, engine: new SyncEngine(db, remote) }
}

const pause = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms))

let ana: Person
let anaClient: SupabaseClient

beforeAll(async () => {
  const admin = newClient(SERVICE_ROLE_KEY)
  const { data: circle, error } = await admin.from('circles').insert({ name: `Test ${run}` }).select('id').single()
  if (error || !circle) throw new Error(`could not create a circle: ${error?.message}`)
  const expires = new Date(Date.now() + 3_600_000).toISOString()
  const { error: inviteError } = await admin.from('invites').insert([
    { code: ownerCode, circle_id: circle.id, role: 'owner', max_uses: 1, expires_at: expires },
    { code: memberCode, circle_id: circle.id, role: 'member', max_uses: 2, expires_at: expires },
  ])
  if (inviteError) throw new Error(`could not create invites: ${inviteError.message}`)

  const created = await signUp('ana')
  ana = created.person
  anaClient = created.client
})

describe('who can get in', () => {
  it('refuses a visitor who is not signed in', async () => {
    const visitor = newClient()
    const charts = await visitor.from('charts').select('*')
    expect(charts.error).not.toBeNull()
    const redeemed = await visitor.rpc('redeem_invite', { invite_code: memberCode, display_name: 'Nobody' })
    expect(redeemed.error).not.toBeNull()
    const ping = await visitor.rpc('ping')
    expect(ping.data).toBe('ok')
  })

  it('gives an account without an invite nothing at all', async () => {
    const { person, client } = await signUp('cy')
    const remote = new SupabaseRemote(client, person.userId)
    expect(await remote.pullProfile()).toBeNull()

    const db = new FirechartDB(`cy-${run}`)
    const chart = await createChart(db, DRAFT, TODAY)
    await expect(remote.pushCharts([toRemoteChart(chart)])).rejects.toThrow(/row-level security/i)
    await expect(new SyncEngine(db, remote).sync()).rejects.toThrow()
    expect(await countUnsynced(db)).toBe(1)

    const bad = await client.rpc('redeem_invite', { invite_code: 'not-a-real-code', display_name: 'Cy' })
    expect(bad.error?.message).toBe('That invite code is not valid.')
    await db.delete()
  })

  it('lets an invited person in, once per code use', async () => {
    const { error } = await anaClient.rpc('redeem_invite', { invite_code: ownerCode, display_name: '  Ana  ' })
    expect(error).toBeNull()
    const profile = await new SupabaseRemote(anaClient, ana.userId).pullProfile()
    expect(profile?.display_name).toBe('Ana')

    const { client } = await signUp('dee')
    const reused = await client.rpc('redeem_invite', { invite_code: ownerCode, display_name: 'Dee' })
    expect(reused.error?.message).toBe('That invite code is not valid.')
  })
})

describe('two devices, one account', () => {
  it('carry charts, ticks, settings and the photo from one to the other', async () => {
    const phone = await device(ana, 'phone')
    const laptop = await device(ana, 'laptop')

    const chart = await createChart(phone.db, DRAFT, TODAY)
    await setDone(phone.db, chart.id, TODAY, true)
    await setDone(phone.db, chart.id, '2026-11-09', true)
    await updateSettings(phone.db, { theme: 'light', weekStart: 'sunday' })
    await setBackground(phone.db, new Blob(['pretend-jpeg-bytes'], { type: 'image/jpeg' }))
    await phone.engine.sync()
    expect(await countUnsynced(phone.db)).toBe(0)

    await laptop.engine.sync()
    expect((await listCharts(laptop.db)).map((c) => c.name)).toEqual(['Exercise'])
    expect((await doneDaysByChart(laptop.db)).get(chart.id)).toEqual(new Set([TODAY, '2026-11-09']))
    expect(await getSettings(laptop.db)).toMatchObject({ theme: 'light', weekStart: 'sunday', photoBackground: true })
    expect(await (await getBackground(laptop.db))?.text()).toBe('pretend-jpeg-bytes')

    // Changes on both sides, including the same day changed twice.
    await pause()
    await updateChart(laptop.db, chart.id, { name: 'Workout' })
    await setDone(laptop.db, chart.id, TODAY, false)
    await pause()
    await setDone(phone.db, chart.id, TODAY, true)
    await setDone(phone.db, chart.id, '2026-11-08', true)

    await phone.engine.sync()
    await laptop.engine.sync()
    await phone.engine.sync()

    for (const { db } of [phone, laptop]) {
      expect((await listCharts(db))[0].name).toBe('Workout')
      expect((await doneDaysByChart(db)).get(chart.id)).toEqual(new Set([TODAY, '2026-11-09', '2026-11-08']))
    }

    // Removing the photo and then the chart reaches the other device too.
    await pause()
    await clearBackground(phone.db)
    await deleteChart(phone.db, chart.id)
    await phone.engine.sync()
    await laptop.engine.sync()

    expect(await getBackground(laptop.db)).toBeNull()
    expect(await listCharts(laptop.db)).toEqual([])
    expect(await laptop.db.entries.count()).toBe(0)
    const left = await laptop.client.from('entries').select('day').eq('chart_id', chart.id)
    expect(left.data).toEqual([])

    await phone.db.delete()
    await laptop.db.delete()
  })
})

describe('other people', () => {
  it('cannot see or change anything of yours, even in the same circle', async () => {
    const phone = await device(ana, 'ana-private')
    const chart = await createChart(phone.db, { ...DRAFT, name: 'Private thing', visibility: 'private' }, TODAY)
    await setDone(phone.db, chart.id, TODAY, true)
    await setBackground(phone.db, new Blob(['anas-photo'], { type: 'image/jpeg' }))
    await phone.engine.sync()

    const { person: ben, client: benClient } = await signUp('ben')
    const joined = await benClient.rpc('redeem_invite', { invite_code: memberCode, display_name: 'Ben' })
    expect(joined.error).toBeNull()

    const bens = await device(ben, 'ben')
    await bens.engine.sync()
    expect(await listCharts(bens.db)).toEqual([])
    expect(await bens.db.entries.count()).toBe(0)

    // Asking the API directly gets no further than the app does.
    const charts = await benClient.from('charts').select('*')
    expect(charts.data).toEqual([])
    const entries = await benClient.from('entries').select('*')
    expect(entries.data).toEqual([])
    const renamed = await benClient.from('charts').update({ name: 'Hacked' }).eq('id', chart.id).select('id')
    expect(renamed.data).toEqual([])
    const local = (await listCharts(phone.db))[0]
    const planted = await benClient
      .from('entries')
      .upsert(toRemoteEntry({ chartId: chart.id, day: '2026-11-01', done: true, loggedAt: local.updatedAt, updatedAt: local.updatedAt }))
    expect(planted.error).not.toBeNull()
    const stolen = await benClient.storage.from('backgrounds').download(`${ana.userId}/background.jpg`)
    expect(stolen.data).toBeNull()
    const overwritten = await benClient.storage
      .from('backgrounds')
      .upload(`${ana.userId}/background.jpg`, new Blob(['bens-photo'], { type: 'image/jpeg' }), { upsert: true })
    expect(overwritten.error).not.toBeNull()

    // Ana's data is exactly as she left it.
    const check = await device(ana, 'ana-check')
    await check.engine.sync()
    expect((await listCharts(check.db)).map((c) => c.name)).toEqual(['Private thing'])
    expect(await (await getBackground(check.db))?.text()).toBe('anas-photo')

    // Ben deletes his account; his sign-in stops working and Ana's still does.
    const gone = await benClient.rpc('delete_my_account')
    expect(gone.error).toBeNull()
    const again = await newClient().auth.signInWithPassword({ email: ben.email, password: ben.password })
    expect(again.error).not.toBeNull()
    const stillThere = await newClient().auth.signInWithPassword({ email: ana.email, password: ana.password })
    expect(stillThere.error).toBeNull()

    await phone.db.delete()
    await bens.db.delete()
    await check.db.delete()
  })
})
