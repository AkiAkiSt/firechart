import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, Lock, Pencil, Trash2, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../app/context'
import { addDays, dayOfMonth, formatDayLong, fromDayNumber, weekdayShort, yearOf } from '../../domain/dates'
import { describeSchedule } from '../../domain/schedule'
import { formatRate, isDoneOn, recentRate } from '../../domain/stats'
import type { Chart, Day, HeatMode, Shape, Visibility } from '../../domain/types'
import { stateWords } from '../../heatmap/describe'
import { Heatmap, Legend } from '../../heatmap/Heatmap'
import { padColumns, splitInHalf, yearColumns } from '../../heatmap/layout'
import { hrefFor, navigate, type Route } from '../../router'
import { db } from '../../store/db'
import { useElementWidth } from '../../store/hooks'
import { deleteChart, setArchived, setDone, updateChart } from '../../store/repo'
import { Button, ConfirmDialog, IconButton, Segmented, SettingRow, Swatches } from '../../ui/controls'
import { useChartLook } from '../chartLook'
import { TopBar } from '../common'

const SHAPE_OPTIONS: readonly { value: Shape; label: string }[] = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
]

const HEAT_OPTIONS: readonly { value: HeatMode; label: string }[] = [
  { value: 'streak', label: 'Streak heat' },
  { value: 'flat', label: 'Flat' },
]

const VISIBILITY_OPTIONS: readonly { value: Visibility; label: string }[] = [
  { value: 'friends', label: 'Friends' },
  { value: 'private', label: 'Only me' },
]

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="fc-card flex flex-col !rounded-[14px] px-2.5 py-2.5">
      <span className="font-display text-xl leading-[26px] font-semibold">{value}</span>
      <span className="text-[11px] leading-[14px] text-muted">{label}</span>
    </div>
  )
}

function Detail({ chart, back }: { chart: Chart; back: Route }) {
  const { today, settings, chartTheme } = useApp()
  const { timeline, ramp, cell } = useChartLook(chart)
  const thisYear = yearOf(today)
  const firstYear = yearOf(fromDayNumber(timeline.startNum))
  const [year, setYear] = useState(thisYear)
  const [selected, setSelected] = useState<Day | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [measure, width] = useElementWidth<HTMLDivElement>()

  const columns = useMemo(() => yearColumns(year, settings.weekStart), [year, settings.weekStart])
  const [firstHalf, secondHalf] = useMemo(() => {
    const [a, b] = splitInHalf(columns)
    return [a, padColumns(b, a.length)]
  }, [columns])
  const oneRow = width >= 640

  const recent: Day[] = []
  for (let i = 6; i >= 0; i--) recent.push(addDays(today, -i))

  const toggle = (day: Day) => void setDone(db, chart.id, day, !isDoneOn(timeline, day))
  const selectedDone = selected !== null && isDoneOn(timeline, selected)
  const grid = { cellAt: cell, ramp, shape: chart.shape, today, selected, onSelect: setSelected, showMonths: true }

  return (
    <div className="flex flex-col gap-3">
      <TopBar back={back} backLabel="Back" title={chart.name}>
        <span className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border border-card-line bg-card px-3 text-xs text-ink-2">
          {chart.visibility === 'friends' ? <Users size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
          {chart.visibility === 'friends' ? 'Friends can see' : 'Only you'}
        </span>
        <a
          href={hrefFor({ name: 'edit', id: chart.id })}
          aria-label="Edit name, icon and days"
          title="Edit"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-2 hover:text-ink"
        >
          <Pencil size={18} aria-hidden="true" />
        </a>
      </TopBar>

      <div className="grid grid-cols-4 gap-2">
        <Stat value={timeline.currentStreak} label="Streak" />
        <Stat value={timeline.bestStreak} label="Best streak" />
        <Stat value={formatRate(recentRate(timeline, 30))} label="Last 30 days" />
        <Stat value={timeline.totalDone} label="Days done" />
      </div>

      <section className="fc-card flex flex-col gap-1.5 px-4 pt-2 pb-4">
        <div className="-ml-3 flex items-center justify-between gap-2">
          <div className="flex items-center">
            <IconButton label="Previous year" disabled={year <= firstYear} onClick={() => setYear(year - 1)}>
              <ChevronLeft size={18} strokeWidth={2.2} aria-hidden="true" />
            </IconButton>
            <span className="font-display text-base font-semibold">{year}</span>
            <IconButton label="Next year" disabled={year >= thisYear} onClick={() => setYear(year + 1)}>
              <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" />
            </IconButton>
          </div>
          <Legend ramp={ramp} shape={chart.shape} />
        </div>

        <div ref={measure} className="flex flex-col gap-3">
          {oneRow ? (
            <div style={{ maxWidth: columns.length * 15.5 + 30 }}>
              <Heatmap {...grid} columns={columns} weekdays={settings.weekStart} label={`${chart.name} in ${year}`} />
            </div>
          ) : (
            <>
              <Heatmap {...grid} columns={firstHalf} gap={2} label={`${chart.name}, first half of ${year}`} />
              <Heatmap {...grid} columns={secondHalf} gap={2} label={`${chart.name}, second half of ${year}`} />
            </>
          )}
        </div>

        {selected ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-well px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{formatDayLong(selected)}</span>
              <span className="text-xs text-muted">{stateWords(cell(selected))}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant={selectedDone ? 'secondary' : 'primary'} onClick={() => toggle(selected)}>
                {selectedDone ? 'Mark not done' : 'Mark done'}
              </Button>
              <IconButton label="Close" onClick={() => setSelected(null)}>
                <X size={18} aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted">Tap any past day to change it.</p>
        )}
      </section>

      <section className="fc-card flex flex-col gap-2 px-4 py-3.5">
        <h2 className="text-sm font-semibold">Last 7 days</h2>
        <div className="grid grid-cols-7 gap-0.5">
          {recent.map((day) => {
            const done = isDoneOn(timeline, day)
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <span className="text-[11px] leading-[14px] text-muted">{weekdayShort(day).slice(0, 2)}</span>
                <button
                  type="button"
                  aria-label={`${formatDayLong(day)}, ${done ? 'done' : 'not done'}`}
                  aria-pressed={done}
                  onClick={() => toggle(day)}
                  className={`flex size-11 items-center justify-center rounded-full border-[1.5px] font-display text-[15px] font-semibold ${
                    done ? 'text-on-heat' : 'border-control text-ink-2'
                  }`}
                  style={{
                    ...(done ? { background: ramp[2], borderColor: ramp[2] } : {}),
                    boxShadow: day === today ? '0 0 0 2px var(--fc-surface), 0 0 0 3.5px var(--fc-ink)' : undefined,
                  }}
                >
                  {dayOfMonth(day)}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="fc-card flex flex-col px-4">
        <SettingRow label="Colour">
          <Swatches
            value={chart.color}
            theme={chartTheme}
            onChange={(color) => void updateChart(db, chart.id, { color })}
          />
        </SettingRow>
        <SettingRow label="Shape">
          <Segmented
            label="Cell shape"
            value={chart.shape}
            options={SHAPE_OPTIONS}
            onChange={(shape) => void updateChart(db, chart.id, { shape })}
          />
        </SettingRow>
        <SettingRow label="Heat">
          <Segmented
            label="Heat"
            value={chart.heatMode}
            options={HEAT_OPTIONS}
            onChange={(heatMode) => void updateChart(db, chart.id, { heatMode })}
          />
        </SettingRow>
        <SettingRow label="Visible to">
          <Segmented
            label="Who can see this chart"
            value={chart.visibility}
            options={VISIBILITY_OPTIONS}
            onChange={(visibility) => void updateChart(db, chart.id, { visibility })}
          />
        </SettingRow>
        <SettingRow label="Planned for" hint={describeSchedule(chart.schedule)}>
          <a
            href={hrefFor({ name: 'edit', id: chart.id })}
            className="inline-flex h-11 items-center rounded-xl border border-control bg-raised px-4 text-sm font-medium"
          >
            Change
          </a>
        </SettingRow>
      </section>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button onClick={() => void setArchived(db, chart.id, chart.archivedAt === null)}>
          {chart.archivedAt === null ? <Archive size={16} aria-hidden="true" /> : <ArchiveRestore size={16} aria-hidden="true" />}
          {chart.archivedAt === null ? 'Archive' : 'Restore'}
        </Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </Button>
      </div>
      <p className="text-xs text-muted">
        Archiving hides a chart from Today and keeps its history. Deleting removes it and every tick for good.
      </p>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${chart.name}"?`}
        body="This removes the chart and all of its ticks. It cannot be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          void deleteChart(db, chart.id).then(() => navigate(back, { replace: true }))
        }}
      />
    </div>
  )
}

export function ChartDetailScreen({ chartId, from }: { chartId: string; from?: 'charts' }) {
  const { active, archived } = useApp()
  const chart = [...active, ...archived].find((c) => c.id === chartId)
  const backName: 'charts' | 'today' = from === 'charts' ? 'charts' : 'today'
  const back: Route = { name: backName }
  useEffect(() => {
    if (!chart) navigate({ name: backName }, { replace: true })
  }, [chart, backName])
  if (!chart) return null
  return <Detail key={chart.id} chart={chart} back={back} />
}
