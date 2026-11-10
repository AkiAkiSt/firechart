import type { SyncStatus } from '../../sync/account'

/** "just now", "5 min ago", "3 h ago", or the date. */
function ago(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h ago`
  return `on ${new Date(iso).toLocaleDateString()}`
}

export function changes(count: number): string {
  return count === 1 ? '1 change' : `${count} changes`
}

/** One line saying how up to date this device is. */
export function syncLine(sync: SyncStatus, unsynced: number, lastSyncedAt: string | null, now: number): string {
  if (sync.phase === 'syncing') return 'Syncing…'
  if (sync.phase === 'offline') {
    return unsynced > 0
      ? `Offline. ${changes(unsynced)} will be sent when you are back online.`
      : 'Offline. Changes will be sent when you are back online.'
  }
  if (sync.phase === 'error') return `Sync problem: ${sync.error ?? 'unknown error'}`
  if (unsynced > 0) return `${changes(unsynced)} waiting to be sent.`
  return lastSyncedAt ? `Synced ${ago(lastSyncedAt, now)}.` : 'Not synced yet.'
}
