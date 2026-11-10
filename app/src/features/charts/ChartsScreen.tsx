import { ArchiveRestore, ChevronDown, ChevronUp, Lock, Plus } from 'lucide-react'
import { useApp } from '../../app/context'
import { describeSchedule } from '../../domain/schedule'
import type { Chart } from '../../domain/types'
import { hrefFor } from '../../router'
import { db } from '../../store/db'
import { moveChart, setArchived } from '../../store/repo'
import { identityColor } from '../../theme/ramps'
import { IconButton } from '../../ui/controls'
import { ChartIcon } from '../../ui/icons'
import { streakText } from '../chartLook'
import { ScreenHeader } from '../common'

function Row({ chart, index, count }: { chart: Chart; index: number; count: number }) {
  const { timelines, chartTheme } = useApp()
  const archived = chart.archivedAt !== null
  const streak = timelines.get(chart.id)?.currentStreak ?? 0
  return (
    <li className="flex items-center gap-1 border-t border-line first:border-t-0">
      <a
        href={hrefFor({ name: 'chart', id: chart.id, from: 'charts' })}
        className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 py-2"
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-on-heat"
          style={{ background: identityColor(chart.color, chartTheme) }}
        >
          <ChartIcon name={chart.icon} size={18} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold">{chart.name}</span>
          <span className="flex items-center gap-1.5 truncate text-xs text-muted">
            {chart.visibility === 'private' && <Lock size={11} aria-label="Private" />}
            {describeSchedule(chart.schedule)} · {archived ? 'Archived' : streakText(streak)}
          </span>
        </span>
      </a>
      {archived ? (
        <IconButton label={`Restore ${chart.name}`} onClick={() => void setArchived(db, chart.id, false)}>
          <ArchiveRestore size={18} aria-hidden="true" />
        </IconButton>
      ) : (
        <>
          <IconButton
            label={`Move ${chart.name} up`}
            disabled={index === 0}
            onClick={() => void moveChart(db, chart.id, 'up')}
          >
            <ChevronUp size={18} aria-hidden="true" />
          </IconButton>
          <IconButton
            label={`Move ${chart.name} down`}
            disabled={index === count - 1}
            onClick={() => void moveChart(db, chart.id, 'down')}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </IconButton>
        </>
      )}
    </li>
  )
}

export function ChartsScreen() {
  const { active, archived } = useApp()
  const total = active.length + archived.length
  return (
    <div className="flex flex-col gap-3.5">
      <ScreenHeader eyebrow={total === 1 ? '1 chart' : `${total} charts`} title="Charts">
        <a
          href={hrefFor({ name: 'new' })}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-on-ink"
        >
          <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
          New chart
        </a>
      </ScreenHeader>

      {active.length > 0 ? (
        <ul className="fc-card flex flex-col px-4 py-1">
          {active.map((chart, index) => (
            <Row key={chart.id} chart={chart} index={index} count={active.length} />
          ))}
        </ul>
      ) : (
        <p className="fc-card p-5 text-sm text-ink-2">
          {archived.length > 0
            ? 'Every chart is archived. Restore one below or make a new one.'
            : 'No charts yet. Make your first one and it will show up on Today.'}
        </p>
      )}

      {active.length > 1 && <p className="text-xs text-muted">The arrows set the order charts appear in on Today.</p>}

      {archived.length > 0 && (
        <section className="flex flex-col gap-2 pt-2">
          <h2 className="text-sm font-semibold">Archived</h2>
          <ul className="fc-card flex flex-col px-4 py-1">
            {archived.map((chart, index) => (
              <Row key={chart.id} chart={chart} index={index} count={archived.length} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
