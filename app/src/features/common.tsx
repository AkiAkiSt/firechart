import { Check, ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { hrefFor, type Route } from '../router'
import { Eyebrow } from '../ui/controls'

/** The big tick: outlined when open, filled with the chart's hottest colour when done. */
export function TickButton({
  done,
  color,
  label,
  onToggle,
}: {
  done: boolean
  color: string
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      onClick={onToggle}
      className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] transition-colors ${
        done ? 'fc-pop text-on-heat' : 'border-control text-muted hover:text-ink-2'
      }`}
      style={done ? { background: color, borderColor: color } : undefined}
    >
      <Check size={22} strokeWidth={2.6} aria-hidden="true" />
    </button>
  )
}

/** Title block for the four main screens. */
export function ScreenHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display text-[30px] leading-9 font-semibold tracking-tight">{title}</h1>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  )
}

/** Header for screens opened from another screen: a back link, a title, an optional action. */
export function TopBar({
  back,
  backLabel,
  title,
  children,
}: {
  back: Route
  backLabel: string
  title: string
  children?: ReactNode
}) {
  return (
    <header className="-ml-2.5 flex items-center gap-1">
      <a
        href={hrefFor(back)}
        aria-label={backLabel}
        title={backLabel}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink"
      >
        <ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" />
      </a>
      <h1 className="min-w-0 flex-1 truncate font-display text-[22px] leading-7 font-semibold tracking-tight">{title}</h1>
      {children}
    </header>
  )
}
