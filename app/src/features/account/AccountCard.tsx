import { LogOut, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { hrefFor } from '../../router'
import { account, useAccount, useLastSyncedAt, useUnsyncedCount } from '../../sync'
import { Button, ConfirmDialog } from '../../ui/controls'
import { changes, syncLine } from './syncLine'

/** Re-renders now and then so "5 min ago" stays true. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

const linkButton =
  'inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors'

/** The account section at the top of Settings. */
export function AccountCard() {
  const { account: state, sync } = useAccount()
  const unsynced = useUnsyncedCount()
  const lastSyncedAt = useLastSyncedAt()
  const now = useNow()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [busy, setBusy] = useState(false)

  if (state.kind === 'loading') return null

  if (state.kind === 'signed-out') {
    return (
      <section aria-label="Account" className="fc-card flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="text-sm text-ink-2">
            Sign in to keep your charts in step between your phone and your computer. Without an account they stay
            on this device.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={hrefFor({ name: 'signin' })} className={`${linkButton} bg-ink font-semibold text-on-ink`}>
            Sign in
          </a>
          <a href={hrefFor({ name: 'signup' })} className={`${linkButton} border border-control bg-raised text-ink`}>
            Create an account
          </a>
        </div>
      </section>
    )
  }

  if (state.kind === 'needs-invite' || state.kind === 'needs-merge') {
    return (
      <section aria-label="Account" className="fc-card flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="text-sm text-ink-2">
            Signed in as {state.email}.{' '}
            {state.kind === 'needs-invite'
              ? 'Your account is not in a circle yet, so nothing is synced.'
              : 'Finishing sign-in…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.kind === 'needs-invite' && (
            <a href={hrefFor({ name: 'invite' })} className={`${linkButton} bg-ink font-semibold text-on-ink`}>
              Enter invite code
            </a>
          )}
          <Button onClick={() => void account.signOut()}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Account" className="fc-card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-base font-semibold text-on-ink"
        >
          {state.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold">{state.displayName}</span>
          <span className="truncate text-xs text-muted">{state.email}</span>
        </div>
      </div>
      <p role="status" className={`text-sm ${sync.phase === 'error' ? 'text-danger' : 'text-ink-2'}`}>
        {syncLine(sync, unsynced, lastSyncedAt, now)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={sync.phase === 'syncing'} onClick={account.requestSync}>
          <RefreshCw size={16} aria-hidden="true" />
          Sync now
        </Button>
        <Button onClick={() => setConfirmSignOut(true)}>
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </Button>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        body={
          unsynced > 0
            ? `Your charts are removed from this device and stay in your account. ${changes(unsynced)} made here ${unsynced === 1 ? 'has' : 'have'} not been sent yet; signing out tries to send ${unsynced === 1 ? 'it' : 'them'} first, and anything that cannot be sent is lost.`
            : 'Your charts are removed from this device. They stay in your account and come back when you sign in again.'
        }
        confirmLabel={busy ? 'Signing out…' : 'Sign out'}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setBusy(true)
          void account.signOut().finally(() => {
            setBusy(false)
            setConfirmSignOut(false)
          })
        }}
      />
    </section>
  )
}

/** Shown after signing in on a device that already holds charts made without an account. */
export function MergeDialog() {
  const { account: state } = useAccount()
  const ref = useRef<HTMLDialogElement>(null)
  const open = state.kind === 'needs-merge'
  const charts = state.kind === 'needs-merge' ? state.charts : 0

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      // The question has to be answered; Escape does not dismiss it.
      onCancel={(event) => event.preventDefault()}
      className="m-auto w-[min(92vw,400px)] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-2 p-5">
        <h2 className="font-display text-lg font-semibold">
          This device already has {charts === 1 ? '1 chart' : `${charts} charts`}
        </h2>
        <p className="text-sm text-ink-2">
          {charts === 1 ? 'It was' : 'They were'} made here before you signed in. Add {charts === 1 ? 'it' : 'them'}{' '}
          to your account, or remove {charts === 1 ? 'it' : 'them'} from this device and use only what is in your
          account?
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button variant="primary" onClick={() => void account.resolveMerge(true)}>
            Add to my account
          </Button>
          <Button variant="danger" onClick={() => void account.resolveMerge(false)}>
            Remove from this device
          </Button>
        </div>
      </div>
    </dialog>
  )
}
