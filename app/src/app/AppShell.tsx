import { CircleCheck, LayoutGrid, Settings, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { MergeDialog } from '../features/account/AccountCard'
import { hrefFor, type Route } from '../router'
import { useAccount } from '../sync'
import { Logo } from '../ui/icons'
import { useApp } from './context'

type Section = 'today' | 'charts' | 'style' | 'settings'

const NAV: readonly { section: Section; label: string; Icon: LucideIcon }[] = [
  { section: 'today', label: 'Today', Icon: CircleCheck },
  { section: 'charts', label: 'Charts', Icon: LayoutGrid },
  { section: 'style', label: 'Style', Icon: SlidersHorizontal },
  { section: 'settings', label: 'Settings', Icon: Settings },
]

/** Which nav item a route belongs to. Chart pages opened from the list stay under Charts. */
function sectionOf(route: Route): Section {
  switch (route.name) {
    case 'charts':
    case 'edit':
      return 'charts'
    case 'chart':
      return route.from === 'charts' ? 'charts' : 'today'
    case 'style':
      return 'style'
    case 'settings':
    case 'signin':
    case 'signup':
    case 'invite':
      return 'settings'
    default:
      return 'today'
  }
}

/** Screens reached from another screen have their own back arrow, so the phone tab bar steps aside. */
function isPushed(route: Route): boolean {
  return ['chart', 'edit', 'new', 'signin', 'signup', 'invite'].includes(route.name)
}

/** Who is signed in, at the foot of the sidebar. */
function AccountChip() {
  const { account, sync } = useAccount()
  if (account.kind === 'loading') return null
  if (account.kind !== 'ready') {
    return (
      <a
        href={hrefFor({ name: account.kind === 'needs-invite' ? 'invite' : 'signin' })}
        className="mt-auto flex h-11 items-center rounded-xl px-3 text-sm font-medium text-ink-2 hover:text-ink"
      >
        {account.kind === 'needs-invite' ? 'Enter invite code' : 'Sign in to sync'}
      </a>
    )
  }
  const status = { idle: 'Synced', syncing: 'Syncing…', offline: 'Offline', error: 'Sync problem' }[sync.phase]
  return (
    <a href={hrefFor({ name: 'settings' })} className="mt-auto flex items-center gap-2.5 rounded-xl p-2">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-on-ink"
      >
        {account.displayName.slice(0, 1).toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{account.displayName}</span>
        <span className={`text-xs ${sync.phase === 'error' ? 'text-danger' : 'text-muted'}`}>{status}</span>
      </span>
    </a>
  )
}

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const { backgroundUrl, settings } = useApp()
  const current = sectionOf(route)

  return (
    <div className="flex h-full flex-col wide:flex-row">
      {backgroundUrl && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
          <div
            aria-hidden="true"
            className="fixed inset-0 -z-10"
            style={{ background: `rgb(8 9 14 / ${settings.backgroundDim})` }}
          />
        </>
      )}

      <aside className="hidden w-[216px] shrink-0 flex-col gap-5 border-r border-line bg-bar px-3.5 pt-6 pb-4 backdrop-blur-xl wide:flex">
        <a href={hrefFor({ name: 'today' })} className="flex items-center gap-2.5 px-2">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight">Firechart</span>
        </a>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map(({ section, label, Icon }) => (
            <a
              key={section}
              href={hrefFor({ name: section })}
              aria-current={section === current ? 'page' : undefined}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                section === current ? 'bg-raised text-ink' : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>
        <AccountChip />
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[900px] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8 wide:px-8 wide:pt-8">
          {children}
        </div>
      </main>

      <nav
        aria-label="Main"
        className={`shrink-0 border-t border-line bg-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl wide:hidden ${
          isPushed(route) ? 'hidden' : 'flex'
        }`}
      >
        {NAV.map(({ section, label, Icon }) => (
          <a
            key={section}
            href={hrefFor({ name: section })}
            aria-current={section === current ? 'page' : undefined}
            className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              section === current ? 'text-ink' : 'text-muted'
            }`}
          >
            <Icon size={22} aria-hidden="true" />
            {label}
          </a>
        ))}
      </nav>

      <MergeDialog />
    </div>
  )
}
