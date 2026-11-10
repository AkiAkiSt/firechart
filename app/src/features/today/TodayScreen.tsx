import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useApp } from '../../app/context'
import { addDays, formatDayLong } from '../../domain/dates'
import { buildTimeline, cellAt, isDoneOn } from '../../domain/stats'
import type { Chart } from '../../domain/types'
import { Heatmap } from '../../heatmap/Heatmap'
import { trailingWeeks, weeksThatFit } from '../../heatmap/layout'
import { hrefFor, navigate } from '../../router'
import { db } from '../../store/db'
import { useElementWidth } from '../../store/hooks'
import { setDone, updateSettings } from '../../store/repo'
import { presetRamp } from '../../theme/ramps'
import { Button } from '../../ui/controls'
import { ChartIcon, Flame } from '../../ui/icons'
import { sampleDoneDays, streakText, useChartLook } from '../chartLook'
import { ScreenHeader, TickButton } from '../common'

/** Cells aim for this size; the number of weeks shown adapts to the card's width. */
const CELL = 12.5
const GAP = 3
const MAX_GRID_WIDTH = 53 * (CELL + GAP) - GAP

function ChartCard({ chart }: { chart: Chart }) {
  const { today, settings } = useApp()
  const { timeline, ramp, cell } = useChartLook(chart)
  const [measure, width] = useElementWidth<HTMLDivElement>()
  const weeks = weeksThatFit(width, CELL, GAP, 12, 53)
  const columns = useMemo(() => trailingWeeks(today, weeks, settings.weekStart), [today, weeks, settings.weekStart])
  const done = isDoneOn(timeline, today)
  const open = () => navigate({ name: 'chart', id: chart.id })

  return (
    <article className="fc-card flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <a href={hrefFor({ name: 'chart', id: chart.id })} className="flex min-w-0 flex-1 items-center gap-3">
          <ChartIcon name={chart.icon} className="shrink-0 text-ink-2" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base leading-[22px] font-semibold">{chart.name}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Flame color={ramp[2]} />
              {streakText(timeline.currentStreak)}
            </span>
          </span>
        </a>
        <TickButton
          done={done}
          color={ramp[3]}
          label={`Mark ${chart.name} ${done ? 'not done' : 'done'} for today`}
          onToggle={() => void setDone(db, chart.id, today, !done)}
        />
      </div>
      <div ref={measure} onClick={open} className="cursor-pointer" style={{ maxWidth: MAX_GRID_WIDTH }}>
        <Heatmap
          columns={columns}
          cellAt={cell}
          ramp={ramp}
          shape={chart.shape}
          today={today}
          gap={GAP}
          showMonths={weeks >= 30}
          label={`${chart.name}: the last ${weeks} weeks, ${streakText(timeline.currentStreak).toLowerCase()}`}
        />
      </div>
    </article>
  )
}

/** Yesterday's charts that are still unticked, with a one-tap way to log each. */
function CatchUp({ charts }: { charts: Chart[] }) {
  const { today } = useApp()
  const yesterday = addDays(today, -1)
  return (
    <section
      aria-label="Yesterday"
      className="flex flex-col gap-1 rounded-[14px] border border-dashed border-control bg-card px-3.5 py-2"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs text-muted">Yesterday is still open</h2>
        <button
          type="button"
          onClick={() => void updateSettings(db, { catchUpDismissedFor: today })}
          className="-mr-2 h-9 rounded-lg px-2 text-xs text-muted hover:text-ink-2"
        >
          Dismiss
        </button>
      </div>
      {charts.map((chart) => (
        <div key={chart.id} className="flex items-center justify-between gap-3 pb-1.5">
          <span className="min-w-0 truncate text-sm">{chart.name}</span>
          <Button onClick={() => void setDone(db, chart.id, yesterday, true)}>I did it</Button>
        </div>
      ))}
    </section>
  )
}

function EmptyState() {
  const { today, settings, chartTheme } = useApp()
  const ramp = presetRamp('ember', chartTheme)
  const [measure, width] = useElementWidth<HTMLDivElement>()
  const weeks = weeksThatFit(width, CELL, GAP, 12, 30)
  const preview = useMemo(() => {
    const timeline = buildTimeline({ kind: 'daily' }, addDays(today, -200), sampleDoneDays(today, 200), today)
    return {
      columns: trailingWeeks(today, weeks, settings.weekStart),
      cell: (day: string) => cellAt(timeline, day, 'streak'),
    }
  }, [today, weeks, settings.weekStart])

  return (
    <section className="fc-card flex flex-col gap-4 p-5">
      <div ref={measure} style={{ maxWidth: 30 * (CELL + GAP) - GAP }}>
        <Heatmap
          columns={preview.columns}
          cellAt={preview.cell}
          ramp={ramp}
          shape="rounded"
          today={today}
          gap={GAP}
          label="An example fire chart after a few months"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold">Start your first fire chart</h2>
        <p className="max-w-[46ch] text-sm text-ink-2">
          Pick something you want to do every day. Tick it off here and watch the boxes fill in. The longer your
          streak, the hotter they burn.
        </p>
      </div>
      <a
        href={hrefFor({ name: 'new' })}
        className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-ink px-4 text-sm font-semibold text-on-ink"
      >
        <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
        New chart
      </a>
    </section>
  )
}

export function TodayScreen() {
  const { active, timelines, today, settings } = useApp()
  const yesterday = addDays(today, -1)
  const doneToday = active.filter((chart) => isDoneOn(timelines.get(chart.id)!, today)).length
  const openYesterday =
    settings.catchUpDismissedFor === today
      ? []
      : active.filter((chart) => cellAt(timelines.get(chart.id)!, yesterday, chart.heatMode).kind === 'pending')

  return (
    <div className="flex flex-col gap-3.5">
      <ScreenHeader eyebrow={formatDayLong(today)} title="Today">
        {active.length > 0 && (
          <div className="flex h-9 items-center gap-1.5 rounded-full border border-card-line bg-card px-3.5 text-[13px] text-ink-2">
            <span className="font-display text-[15px] font-semibold text-ink">{doneToday}</span>
            <span>of {active.length} done</span>
          </div>
        )}
        {active.length > 0 && (
          <a
            href={hrefFor({ name: 'new' })}
            aria-label="New chart"
            title="New chart"
            className="flex size-11 items-center justify-center rounded-xl bg-ink text-on-ink"
          >
            <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
          </a>
        )}
      </ScreenHeader>

      {openYesterday.length > 0 && <CatchUp charts={openYesterday} />}

      {active.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2.5">
          {active.map((chart) => (
            <ChartCard key={chart.id} chart={chart} />
          ))}
        </div>
      )}
    </div>
  )
}
