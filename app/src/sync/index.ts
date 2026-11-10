import { createClient } from '@supabase/supabase-js'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSyncExternalStore } from 'react'
import { db } from '../store/db'
import { countUnsynced, getSyncState } from '../store/repo'
import { AccountManager, type AccountSnapshot } from './account'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

/** The one account manager for the running app. */
export const account = new AccountManager(
  db,
  createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  }),
)

export function useAccount(): AccountSnapshot {
  return useSyncExternalStore(account.subscribe, account.getSnapshot)
}

/** How many local changes are still waiting to be sent. */
export function useUnsyncedCount(): number {
  return useLiveQuery(() => countUnsynced(db), []) ?? 0
}

/** When this device last finished a sync, as an ISO timestamp, or null. */
export function useLastSyncedAt(): string | null {
  return useLiveQuery(() => getSyncState(db).then((state) => state.lastSyncedAt), []) ?? null
}
