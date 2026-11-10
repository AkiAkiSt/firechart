import { createElement } from 'react'
import { chartIconFor } from './chartIcons'

export function ChartIcon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  return createElement(chartIconFor(name), { size, strokeWidth: 2, className, 'aria-hidden': true })
}

/** The streak flame, filled with the chart's colour. */
export function Flame({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" className="shrink-0">
      <path d="M12 2.5c.6 3.2 2.3 4.6 3.9 6.4 1.4 1.6 2.6 3.4 2.6 5.9a6.5 6.5 0 0 1-13 0c0-1.9.8-3.5 2-4.9.3 1.5 1 2.4 2 2.9-.4-3.6.6-7.6 2.5-10.3z" />
    </svg>
  )
}

/** The app mark: four cells heating up. */
export function Logo({ size = 22 }: { size?: number }) {
  const cell = (size - 2) / 2
  const radius = Math.max(2, Math.round(size / 7))
  const colors = ['#953a1c', '#f68c11', '#cf5604', '#ffd15a']
  return (
    <span aria-hidden="true" className="grid shrink-0 grid-cols-2 gap-0.5" style={{ width: size, height: size }}>
      {colors.map((color) => (
        <span key={color} style={{ width: cell, height: cell, borderRadius: radius, background: color }} />
      ))}
    </span>
  )
}
