import { Lock, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useApp } from '../../app/context'
import { addDays } from '../../domain/dates'
import { buildTimeline, cellAt } from '../../domain/stats'
import type { Chart, ChartColor, Day, HeatMode, RampName, Schedule, Shape, Visibility } from '../../domain/types'
import { Heatmap } from '../../heatmap/Heatmap'
import { trailingWeeks } from '../../heatmap/layout'
import { navigate } from '../../router'
import { db } from '../../store/db'
import { createChart, MAX_NAME_LENGTH, updateChart } from '../../store/repo'
import { RAMP_NAMES, rampFor } from '../../theme/ramps'
import { Button, Segmented, Swatches } from '../../ui/controls'
import { CHART_ICONS } from '../../ui/chartIcons'
import { sampleDoneDays } from '../chartLook'
import { TopBar } from '../common'

const SUGGESTIONS: readonly { name: string; icon: string; ramp: RampName }[] = [
  { name: 'Exercise', icon: 'dumbbell', ramp: 'ember' },
  { name: 'Study 4 h', icon: 'graduation', ramp: 'ice' },
  { name: 'Screen time under 1.5 h', icon: 'smartphone', ramp: 'moss' },
  { name: 'Read 30 min', icon: 'book', ramp: 'orchid' },
  { name: 'In bed by midnight', icon: 'moon', ramp: 'teal' },
  { name: 'No sweets', icon: 'candy-off', ramp: 'coral' },
  { name: 'Meditate', icon: 'brain', ramp: 'sun' },
  { name: 'Drink water', icon: 'water', ramp: 'bone' },
]

const WEEKDAYS: readonly { iso: number; short: string; long: string }[] = [
  { iso: 1, short: 'Mo', long: 'Monday' },
  { iso: 2, short: 'Tu', long: 'Tuesday' },
  { iso: 3, short: 'We', long: 'Wednesday' },
  { iso: 4, short: 'Th', long: 'Thursday' },
  { iso: 5, short: 'Fr', long: 'Friday' },
  { iso: 6, short: 'Sa', long: 'Saturday' },
  { iso: 7, short: 'Su', long: 'Sunday' },
]

const SHAPE_OPTIONS: readonly { value: Shape; label: string }[] = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
]

const HEAT_OPTIONS: readonly { value: HeatMode; label: string }[] = [
  { value: 'streak', label: 'Streak heat' },
  { value: 'flat', label: 'Flat' },
]

function Field({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Preview({ color, shape, heatMode }: { color: ChartColor; shape: Shape; heatMode: HeatMode }) {
  const { today, settings, chartTheme } = useApp()
  const ramp = rampFor(color, chartTheme)
  const view = useMemo(() => {
    const timeline = buildTimeline({ kind: 'daily' }, addDays(today, -200), sampleDoneDays(today, 200), today)
    return {
      columns: trailingWeeks(today, 22, settings.weekStart),
      cell: (day: Day) => cellAt(timeline, day, heatMode),
    }
  }, [today, settings.weekStart, heatMode])
  return (
    <div className="fc-card p-4">
      <div className="max-w-[420px]">
        <Heatmap
          columns={view.columns}
          cellAt={view.cell}
          ramp={ramp}
          shape={shape}
          today={today}
          label="A preview of this chart with example history"
        />
      </div>
    </div>
  )
}

function VisibilityOption({
  selected,
  title,
  body,
  icon,
  onSelect,
}: {
  selected: boolean
  title: string
  body: string
  icon: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-h-[72px] items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
        selected ? 'border-ink bg-raised' : 'border-control bg-card'
      }`}
    >
      <span className="mt-0.5 shrink-0 text-ink-2">{icon}</span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted">{body}</span>
      </span>
    </button>
  )
}

function Form({ chart }: { chart: Chart | null }) {
  const { active, archived, today, chartTheme } = useApp()

  // A new chart starts with the first preset colour no other chart is using.
  const freeRamp = useMemo(() => {
    const used = new Set([...active, ...archived].map((c) => (c.color.kind === 'preset' ? c.color.ramp : null)))
    return RAMP_NAMES.find((name) => !used.has(name)) ?? 'ember'
  }, [active, archived])

  const [name, setName] = useState(chart?.name ?? '')
  const [icon, setIcon] = useState(chart?.icon ?? 'target')
  const [color, setColor] = useState<ChartColor>(chart?.color ?? { kind: 'preset', ramp: freeRamp })
  const [shape, setShape] = useState<Shape>(chart?.shape ?? 'rounded')
  const [heatMode, setHeatMode] = useState<HeatMode>(chart?.heatMode ?? 'streak')
  const [daily, setDaily] = useState(chart ? chart.schedule.kind === 'daily' : true)
  const [days, setDays] = useState<number[]>(chart?.schedule.kind === 'weekdays' ? chart.schedule.days : [1, 2, 3, 4, 5])
  const [visibility, setVisibility] = useState<Visibility | null>(chart?.visibility ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function toggleDay(iso: number) {
    setDays((current) => (current.includes(iso) ? current.filter((d) => d !== iso) : [...current, iso]))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (name.trim() === '') return setError('Give the chart a name.')
    if (!daily && days.length === 0) return setError('Pick at least one day of the week.')
    if (!visibility) return setError('Choose who can see this chart.')
    const schedule: Schedule = daily ? { kind: 'daily' } : { kind: 'weekdays', days }
    const draft = { name, icon, color, shape, heatMode, visibility, schedule }
    setSaving(true)
    try {
      if (chart) {
        await updateChart(db, chart.id, draft)
        navigate({ name: 'chart', id: chart.id }, { replace: true })
      } else {
        await createChart(db, draft, today)
        // Ask the browser not to evict this site's data when storage runs low.
        void navigator.storage?.persist?.()
        navigate({ name: 'today' }, { replace: true })
      }
    } catch (cause) {
      setSaving(false)
      setError(cause instanceof Error ? cause.message : 'Could not save the chart.')
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="flex flex-col gap-5">
      <TopBar
        back={chart ? { name: 'chart', id: chart.id } : { name: 'today' }}
        backLabel={chart ? 'Back to the chart' : 'Back to Today'}
        title={chart ? 'Edit chart' : 'New chart'}
      />

      <Preview color={color} shape={shape} heatMode={heatMode} />

      <Field title="Name">
        <input
          aria-label="Chart name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
          placeholder="For example: Screen time under 1.5 h"
          autoComplete="off"
          className="h-12 rounded-xl border border-control bg-well px-3.5 text-base text-ink placeholder:text-muted"
        />
        {!chart && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => {
                  setName(suggestion.name)
                  setIcon(suggestion.icon)
                  setColor({ kind: 'preset', ramp: suggestion.ramp })
                  setError(null)
                }}
                className="h-9 rounded-full border border-line bg-card px-3 text-[13px] text-ink-2 hover:text-ink"
              >
                {suggestion.name}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field title="Icon">
        <div role="group" aria-label="Icon" className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1">
          {CHART_ICONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={icon === key}
              onClick={() => setIcon(key)}
              className={`flex h-11 items-center justify-center rounded-xl ${
                icon === key ? 'bg-selected text-ink' : 'text-muted hover:text-ink-2'
              }`}
            >
              <Icon size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          ))}
        </div>
      </Field>

      <Field title="Colour">
        <Swatches value={color} theme={chartTheme} onChange={setColor} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field title="Cell shape">
          <Segmented label="Cell shape" value={shape} options={SHAPE_OPTIONS} onChange={setShape} />
        </Field>
        <Field title="Heat">
          <Segmented label="Heat" value={heatMode} options={HEAT_OPTIONS} onChange={setHeatMode} />
        </Field>
      </div>
      <p className="-mt-3 text-xs text-muted">Streak heat: the longer the run, the hotter the cell. Flat: every done day looks the same.</p>

      <Field title="Which days" hint="Days you do not plan for never break a streak.">
        <Segmented
          label="Which days"
          value={daily ? 'daily' : 'some'}
          options={[
            { value: 'daily', label: 'Every day' },
            { value: 'some', label: 'Certain days' },
          ]}
          onChange={(value) => setDaily(value === 'daily')}
        />
        {!daily && (
          <div role="group" aria-label="Days of the week" className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => {
              const on = days.includes(weekday.iso)
              return (
                <button
                  key={weekday.iso}
                  type="button"
                  aria-label={weekday.long}
                  aria-pressed={on}
                  onClick={() => toggleDay(weekday.iso)}
                  className={`h-11 rounded-xl border text-[13px] font-medium ${
                    on ? 'border-ink bg-selected text-ink' : 'border-line text-muted'
                  }`}
                >
                  {weekday.short}
                </button>
              )
            })}
          </div>
        )}
      </Field>

      <Field title="Who can see it" hint="You can change this later.">
        <div role="radiogroup" aria-label="Who can see this chart" className="grid gap-2 sm:grid-cols-2">
          <VisibilityOption
            selected={visibility === 'friends'}
            title="Friends can see"
            body="Shown to the friends in your circle."
            icon={<Users size={20} aria-hidden="true" />}
            onSelect={() => {
              setVisibility('friends')
              setError(null)
            }}
          />
          <VisibilityOption
            selected={visibility === 'private'}
            title="Only me"
            body="Private. Never shown to anyone else."
            icon={<Lock size={20} aria-hidden="true" />}
            onSelect={() => {
              setVisibility('private')
              setError(null)
            }}
          />
        </div>
      </Field>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button variant="primary" type="submit" disabled={saving} className="h-12 w-full sm:w-auto sm:self-start sm:px-8">
        {chart ? 'Save changes' : 'Create chart'}
      </Button>
    </form>
  )
}

/** Creates a chart, or edits one when `chartId` is given. */
export function ChartFormScreen({ chartId }: { chartId?: string }) {
  const { active, archived } = useApp()
  const chart = chartId ? ([...active, ...archived].find((c) => c.id === chartId) ?? null) : null
  const missing = chartId !== undefined && chart === null
  useEffect(() => {
    if (missing) navigate({ name: 'charts' }, { replace: true })
  }, [missing])
  if (missing) return null
  return <Form key={chartId ?? 'new'} chart={chart} />
}
