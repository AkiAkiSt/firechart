import { Plus } from 'lucide-react'
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { ChartColor, ThemeName } from '../domain/types'
import { identityColor, RAMP_LABELS, RAMP_NAMES } from '../theme/ramps'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-on-ink font-semibold',
  secondary: 'border border-control bg-raised text-ink',
  ghost: 'text-ink-2 hover:text-ink',
  danger: 'border border-control bg-raised text-danger',
}

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-45 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

/** A 44 px square button that holds only an icon. `label` is read by screen readers. */
export function IconButton({
  label,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:text-ink disabled:opacity-35 ${className}`}
      {...props}
    />
  )
}

interface SegmentedProps<T extends string> {
  label: string
  value: T | null
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}

/** A row of mutually exclusive choices. */
export function Segmented<T extends string>({ label, value, options, onChange, className = '' }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`grid shrink-0 auto-cols-fr grid-flow-col gap-0.5 rounded-[13px] border border-line bg-well p-0.5 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`h-11 rounded-[11px] px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
              selected ? 'bg-selected text-ink shadow-sm' : 'text-muted hover:text-ink-2'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** A labelled row inside a settings card: label on the left, control on the right. */
export function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[60px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line py-2 first:border-t-0">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm text-ink-2">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

interface SwatchesProps {
  value: ChartColor
  theme: ThemeName
  onChange: (color: ChartColor) => void
  className?: string
}

/** The eight preset colours plus a custom colour picker. */
export function Swatches({ value, theme, onChange, className = '' }: SwatchesProps) {
  const picker = useRef<HTMLInputElement>(null)
  const custom = value.kind === 'custom' ? value.hex : null
  const ring = '0 0 0 2px var(--fc-surface), 0 0 0 4px var(--fc-ink)'
  return (
    <div role="group" aria-label="Chart colour" className={`grid w-full max-w-[396px] grid-cols-9 ${className}`}>
      {RAMP_NAMES.map((name) => {
        const selected = value.kind === 'preset' && value.ramp === name
        return (
          <button
            key={name}
            type="button"
            aria-label={RAMP_LABELS[name]}
            title={RAMP_LABELS[name]}
            aria-pressed={selected}
            onClick={() => onChange({ kind: 'preset', ramp: name })}
            className="flex h-11 items-center justify-center"
          >
            <span
              className="block size-[26px] rounded-full"
              style={{
                background: identityColor({ kind: 'preset', ramp: name }, theme),
                boxShadow: selected ? ring : 'none',
              }}
            />
          </button>
        )
      })}
      <button
        type="button"
        aria-label="Pick a custom colour"
        title="Custom colour"
        aria-pressed={custom !== null}
        onClick={() => picker.current?.click()}
        className="relative flex h-11 items-center justify-center text-ink-2"
      >
        {custom ? (
          <span
            className="block size-[26px] rounded-full"
            style={{ background: identityColor({ kind: 'custom', hex: custom }, theme), boxShadow: ring }}
          />
        ) : (
          <span className="flex size-[26px] items-center justify-center rounded-full border-[1.5px] border-dashed border-control">
            <Plus size={14} strokeWidth={2.4} aria-hidden="true" />
          </span>
        )}
        <input
          ref={picker}
          type="color"
          tabIndex={-1}
          aria-hidden="true"
          value={custom ?? '#f68c11'}
          onChange={(event) => onChange({ kind: 'custom', hex: event.target.value })}
          className="pointer-events-none absolute inset-0 size-full opacity-0"
        />
      </button>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** A modal question with Cancel and one action. Escape and the backdrop cancel. */
export function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onCancel()
      }}
      className="m-auto w-[min(92vw,380px)] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-2 p-5">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-ink-2">{body}</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}

/** Uppercase caption above a screen title. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-xs tracking-[0.08em] text-muted uppercase">{children}</div>
}
