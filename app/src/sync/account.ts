import type { SupabaseClient, User } from '@supabase/supabase-js'
import { liveQuery } from 'dexie'
import { EMPTY_SYNC_STATE, type FirechartDB } from '../store/db'
import { clearUserData, countUnsynced, getSyncState, listCharts, updateSyncState } from '../store/repo'
import { SyncEngine } from './engine'
import { SupabaseRemote } from './remote'

/** Where this device stands with accounts. */
export type Account =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  /** Signed in, but not in a circle yet: an invite code is still needed. */
  | { kind: 'needs-invite'; email: string }
  /** Signed in, and this device has charts from before: keep or discard them? */
  | { kind: 'needs-merge'; email: string; charts: number }
  | { kind: 'ready'; userId: string; email: string; displayName: string }

export interface SyncStatus {
  phase: 'idle' | 'syncing' | 'offline' | 'error'
  error: string | null
}

export interface AccountSnapshot {
  account: Account
  sync: SyncStatus
}

const ACCOUNT_KEY = 'account'
const SYNC_DEBOUNCE_MS = 1200
const SYNC_INTERVAL_MS = 60_000

interface RememberedAccount {
  userId: string
  email: string
  displayName: string
}

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(message) ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  )
}

/** Turns a server or network error into a sentence a person can act on. */
export function explain(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (isNetworkError(error)) return 'Could not reach the server. Check your connection and try again.'
  if (/invalid login credentials/i.test(message)) return 'That email and password do not match an account.'
  if (/already registered|already been registered/i.test(message)) {
    return 'There is already an account for that email. Sign in instead.'
  }
  if (/password should be|weak password|at least \d+ characters/i.test(message)) {
    return 'Use a password of at least 8 characters.'
  }
  if (/valid email|invalid email|invalid format/i.test(message)) return 'That does not look like an email address.'
  if (/rate limit|too many requests/i.test(message)) return 'Too many attempts. Wait a minute and try again.'
  if (/signups? (are )?not allowed|signup is disabled/i.test(message)) return 'New accounts are switched off right now.'
  return message
}

/**
 * Signing in and out, and keeping the device in sync once signed in.
 *
 * The app works without an account: charts simply stay on the device. Signing
 * in ties the device to an account, sends what is on it, and from then on
 * every change is synced shortly after it is made.
 */
export class AccountManager {
  private readonly db: FirechartDB
  private readonly client: SupabaseClient
  private snapshot: AccountSnapshot = { account: { kind: 'loading' }, sync: { phase: 'idle', error: null } }
  private readonly listeners = new Set<() => void>()
  private engine: SyncEngine | null = null
  private user: User | null = null
  private running = false
  private queued = false
  private debounce: ReturnType<typeof setTimeout> | null = null
  private stopWatching: (() => void) | null = null

  constructor(db: FirechartDB, client: SupabaseClient) {
    this.db = db
    this.client = client
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): AccountSnapshot => this.snapshot

  private set(patch: Partial<AccountSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of this.listeners) listener()
  }

  /** Call once when the app starts. Restores a saved sign-in without needing the network. */
  async start(): Promise<void> {
    try {
      const { data } = await this.client.auth.getSession()
      await this.adopt(data.session?.user ?? null)
    } catch {
      this.set({ account: { kind: 'signed-out' } })
    }
    this.client.auth.onAuthStateChange((event) => {
      // The saved sign-in stopped being valid without the person asking, for
      // example because it was revoked. Stop syncing but keep what is on the
      // device, unsent changes included: signing in again picks up from here.
      if (event === 'SIGNED_OUT' && this.user !== null) {
        this.stopWatching?.()
        this.stopWatching = null
        this.engine = null
        this.user = null
        this.set({ account: { kind: 'signed-out' }, sync: { phase: 'idle', error: null } })
      }
    })
  }

  // Signing in

  async signUp(name: string, email: string, password: string, inviteCode: string): Promise<void> {
    const { data, error } = await this.client.auth.signUp({ email: email.trim(), password })
    if (error) throw new Error(explain(error))
    if (!data.session || !data.user) {
      throw new Error('The account was created but needs confirming by email, which is not set up. Ask the app owner.')
    }
    this.user = data.user
    await this.redeem(inviteCode, name)
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await this.client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(explain(error))
    await this.adopt(data.user)
  }

  /** Joins a circle with an invite code. Used right after sign-up, or later by someone who signed up without one. */
  async redeem(inviteCode: string, name: string): Promise<void> {
    const user = this.user
    if (!user) throw new Error('Sign in first.')
    const { error } = await this.client.rpc('redeem_invite', { invite_code: inviteCode.trim(), display_name: name })
    if (error) {
      this.set({ account: { kind: 'needs-invite', email: user.email ?? '' } })
      throw new Error(explain(error))
    }
    await this.claimDevice(user, name.trim())
  }

  /** Works out what a signed-in user still needs before this device can sync. */
  private async adopt(user: User | null): Promise<void> {
    this.user = user
    if (!user) {
      this.set({ account: { kind: 'signed-out' } })
      return
    }
    const remembered = (await this.db.kv.get(ACCOUNT_KEY))?.value as RememberedAccount | undefined
    const state = await getSyncState(this.db)
    if (state.userId === user.id && remembered?.userId === user.id) {
      this.becomeReady(remembered)
      return
    }
    let profile
    try {
      profile = await new SupabaseRemote(this.client, user.id).pullProfile()
    } catch (error) {
      this.set({ account: { kind: 'signed-out' } })
      throw new Error(explain(error))
    }
    if (!profile) {
      this.set({ account: { kind: 'needs-invite', email: user.email ?? '' } })
      return
    }
    await this.claimDevice(user, profile.display_name)
  }

  /** Ties this device's database to the account, asking first if it already holds charts. */
  private async claimDevice(user: User, displayName: string): Promise<void> {
    const remembered: RememberedAccount = { userId: user.id, email: user.email ?? '', displayName }
    await this.db.kv.put({ key: ACCOUNT_KEY, value: remembered })
    const state = await getSyncState(this.db)
    if (state.userId === user.id) {
      this.becomeReady(remembered)
      return
    }
    if (state.userId !== null) {
      // Someone else used this device before; their data does not belong in this account.
      await clearUserData(this.db)
    } else {
      const charts = (await listCharts(this.db)).length
      if (charts > 0) {
        this.set({ account: { kind: 'needs-merge', email: remembered.email, charts } })
        return
      }
    }
    await updateSyncState(this.db, { ...EMPTY_SYNC_STATE, userId: user.id })
    this.becomeReady(remembered)
  }

  /** Answers the "this device already has charts" question. */
  async resolveMerge(keepLocalCharts: boolean): Promise<void> {
    const user = this.user
    const remembered = (await this.db.kv.get(ACCOUNT_KEY))?.value as RememberedAccount | undefined
    if (!user || !remembered) throw new Error('Sign in first.')
    if (!keepLocalCharts) await clearUserData(this.db)
    await updateSyncState(this.db, { ...EMPTY_SYNC_STATE, userId: user.id })
    this.becomeReady(remembered)
  }

  private becomeReady(remembered: RememberedAccount): void {
    this.engine = new SyncEngine(this.db, new SupabaseRemote(this.client, remembered.userId))
    this.set({ account: { kind: 'ready', ...remembered }, sync: { phase: 'idle', error: null } })
    this.watch()
    this.requestSync()
  }

  // Signing out

  async signOut(): Promise<void> {
    // One last attempt to send anything unsent; signing out goes ahead either way.
    if (this.engine && (await countUnsynced(this.db)) > 0) {
      try {
        await this.engine.sync()
      } catch {
        // Offline: the unsent changes are lost with the local copy, as the dialog warned.
      }
    }
    await this.forget()
    await this.client.auth.signOut({ scope: 'local' })
  }

  /** Deletes the account and everything stored for it on the server. */
  async deleteAccount(): Promise<void> {
    const user = this.user
    if (!user) throw new Error('Sign in first.')
    try {
      await new SupabaseRemote(this.client, user.id).deleteBackground()
    } catch {
      // No photo, or it is already gone.
    }
    const { error } = await this.client.rpc('delete_my_account')
    if (error) throw new Error(explain(error))
    await this.forget()
    await this.client.auth.signOut({ scope: 'local' })
  }

  /** Clears the account's data from this device. */
  private async forget(): Promise<void> {
    this.stopWatching?.()
    this.stopWatching = null
    this.engine = null
    this.user = null
    await clearUserData(this.db)
    await this.db.kv.delete(ACCOUNT_KEY)
    await updateSyncState(this.db, EMPTY_SYNC_STATE)
    this.set({ account: { kind: 'signed-out' }, sync: { phase: 'idle', error: null } })
  }

  // Syncing

  /** Starts a sync now, or right after the one in progress. */
  requestSync = (): void => {
    if (!this.engine) return
    if (this.running) {
      this.queued = true
      return
    }
    void this.run()
  }

  private async run(): Promise<void> {
    const engine = this.engine
    if (!engine) return
    this.running = true
    this.set({ sync: { phase: 'syncing', error: null } })
    try {
      await engine.sync()
      if (this.engine === engine) this.set({ sync: { phase: 'idle', error: null } })
    } catch (error) {
      if (this.engine === engine) {
        this.set({
          sync: isNetworkError(error)
            ? { phase: 'offline', error: null }
            : { phase: 'error', error: error instanceof Error ? error.message : String(error) },
        })
      }
    } finally {
      this.running = false
      if (this.queued) {
        this.queued = false
        this.requestSync()
      }
    }
  }

  /** Syncs shortly after any local change, when the app comes back into view, and once a minute. */
  private watch(): void {
    this.stopWatching?.()
    const pending = liveQuery(() => countUnsynced(this.db)).subscribe({
      next: (count) => {
        if (count === 0) return
        if (this.debounce) clearTimeout(this.debounce)
        this.debounce = setTimeout(this.requestSync, SYNC_DEBOUNCE_MS)
      },
      error: () => undefined,
    })
    const cleanups: (() => void)[] = [() => pending.unsubscribe()]
    if (typeof window !== 'undefined') {
      const whenVisible = () => {
        if (document.visibilityState === 'visible') this.requestSync()
      }
      window.addEventListener('online', this.requestSync)
      window.addEventListener('focus', this.requestSync)
      document.addEventListener('visibilitychange', whenVisible)
      const timer = window.setInterval(whenVisible, SYNC_INTERVAL_MS)
      cleanups.push(() => {
        window.removeEventListener('online', this.requestSync)
        window.removeEventListener('focus', this.requestSync)
        document.removeEventListener('visibilitychange', whenVisible)
        window.clearInterval(timer)
      })
    }
    this.stopWatching = () => {
      if (this.debounce) clearTimeout(this.debounce)
      for (const cleanup of cleanups) cleanup()
    }
  }
}
