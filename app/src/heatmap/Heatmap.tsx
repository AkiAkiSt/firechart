import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { addDays, weekdayLabels } from '../domain/dates'
import type { CellState } from '../domain/stats'
import type { Day, Shape, WeekStart } from '../domain/types'
import type { Ramp } from '../theme/ramps'
import { describeCell } from './describe'
import { monthLabels, type Column } from './layout'

const RADIUS: Record<Shape, string> = { rounded: '26%', square: '8%', dot: '50%' }

interface HeatmapProps {
  columns: Column[]
  cellAt: (day: Day) => CellState
  ramp: Ramp
  shape: Shape
  today: Day
  /** Describes the whole chart for screen readers. */
  label: string
  gap?: number
  showMonths?: boolean
  /** Show Mon, Wed and Fri beside the rows. */
  weekdays?: WeekStart
  selected?: Day | null
  /** When given, days up to today can be selected by tap, click or arrow keys. */
  onSelect?: (day: Day) => void
}

function cellStyle(state: CellState, ramp: Ramp, radius: string, isToday: boolean, isSelected: boolean): CSSProperties {
  const shadows: string[] = []
  let background = 'transparent'
  let opacity: number | undefined
  if (state.kind === 'done') {
    background = ramp[Math.max(1, state.level) - 1]
  } else if (state.kind === 'off') {
    shadows.push('inset 0 0 0 1px var(--fc-control-line)')
    opacity = 0.55
  } else if (state.kind === 'future') {
    shadows.push('inset 0 0 0 1px var(--fc-empty)')
  } else {
    background = 'var(--fc-empty)'
  }
  if (isSelected) shadows.push('0 0 0 2px var(--fc-ink)')
  else if (isToday) shadows.push('0 0 0 1.5px var(--fc-ink)')
  return {
    aspectRatio: '1 / 1',
    borderRadius: radius,
    background,
    opacity: isToday || isSelected ? undefined : opacity,
    boxShadow: shadows.length > 0 ? shadows.join(', ') : undefined,
  }
}

/**
 * A grid of days: weeks as columns, weekdays as rows, oldest on the left. It
 * fills the width it is given; cells stay square.
 */
export function Heatmap({
  columns,
  cellAt,
  ramp,
  shape,
  today,
  label,
  gap = 3,
  showMonths = false,
  weekdays,
  selected = null,
  onSelect,
}: HeatmapProps) {
  const grid = useRef<HTMLDivElement>(null)
  const radius = RADIUS[shape]
  const template = `repeat(${columns.length}, minmax(0, 1fr))`

  // Keep keyboard focus on the selected day as arrow keys move it.
  useEffect(() => {
    const node = grid.current
    if (!node || !selected || !node.contains(document.activeElement)) return
    node.querySelector<HTMLElement>(`[data-day="${selected}"]`)?.focus()
  }, [selected])

  const firstDay = columns[0]?.find((day) => day !== null) ?? today

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onSelect) return
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    const from = selected ?? today
    const next = addDays(from, step)
    if (next > today || next < firstDay) return
    if (!columns.some((column) => column.includes(next))) return
    onSelect(next)
  }

  const cells = columns.flatMap((column, c) =>
    column.map((day, r) => {
      const key = `${c}-${r}`
      if (day === null) return <span key={key} style={{ aspectRatio: '1 / 1' }} />
      const state = cellAt(day)
      const isToday = day === today
      const isSelected = day === selected
      const style = cellStyle(state, ramp, radius, isToday, isSelected)
      const text = describeCell(day, state)
      if (!onSelect || state.kind === 'future') return <span key={key} title={text} style={style} />
      const focusable = selected ? isSelected : isToday
      return (
        <button
          key={key}
          type="button"
          data-day={day}
          tabIndex={focusable ? 0 : -1}
          aria-label={text.replace(' · ', ', ')}
          aria-pressed={isSelected}
          title={text}
          onClick={() => onSelect(day)}
          className="p-0"
          style={style}
        />
      )
    }),
  )

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {showMonths && (
        <div aria-hidden="true" className="grid h-3" style={{ gridTemplateColumns: template, columnGap: gap }}>
          {monthLabels(columns).map((text, index) => (
            <span key={index} className="overflow-visible text-[10px] leading-3 whitespace-nowrap text-muted">
              {text}
            </span>
          ))}
        </div>
      )}
      <div
        ref={grid}
        role={onSelect ? 'group' : 'img'}
        aria-label={label}
        onKeyDown={onKeyDown}
        className="grid"
        style={{ gridTemplateColumns: template, gridTemplateRows: 'repeat(7, auto)', gridAutoFlow: 'column', gap }}
      >
        {cells}
      </div>
    </div>
  )

  if (!weekdays) return body

  const names = weekdayLabels(weekdays)
  return (
    <div className="flex gap-2">
      <div
        aria-hidden="true"
        className="grid shrink-0 text-[10px] leading-none text-muted"
        style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))', rowGap: gap, paddingTop: showMonths ? 16 : 0 }}
      >
        {names.map((name) => (
          <span key={name} className="flex items-center">
            {name === 'Mon' || name === 'Wed' || name === 'Fri' ? name : ''}
          </span>
        ))}
      </div>
      {body}
    </div>
  )
}

/** "Less ▢▢▢▢▢ More" */
export function Legend({ ramp, shape }: { ramp: Ramp; shape: Shape }) {
  const radius = RADIUS[shape]
  return (
    <div className="flex items-center gap-1.5 text-[11px] leading-none text-muted">
      <span>Less</span>
      <span aria-hidden="true" className="flex gap-[3px]">
        <span className="size-2.5 bg-empty" style={{ borderRadius: radius }} />
        {ramp.map((color) => (
          <span key={color} className="size-2.5" style={{ borderRadius: radius, background: color }} />
        ))}
      </span>
      <span>More</span>
    </div>
  )
}
