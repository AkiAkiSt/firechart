import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useApp } from '../../app/context'
import { addDays } from '../../domain/dates'
import { buildTimeline, cellAt } from '../../domain/stats'
import type { Day, HeatMode, Shape, ThemeName } from '../../domain/types'
import { Heatmap } from '../../heatmap/Heatmap'
import { trailingWeeks } from '../../heatmap/layout'
import { db } from '../../store/db'
import { compressImage } from '../../store/files'
import { clearBackground, hasBackground, setBackground, updateAllCharts, updateSettings } from '../../store/repo'
import { rampFor } from '../../theme/ramps'
import { Button, Segmented, SettingRow } from '../../ui/controls'
import { ChartIcon, Flame } from '../../ui/icons'
import { sampleDoneDays, streakText } from '../chartLook'
import { ScreenHeader } from '../common'

const THEME_OPTIONS: readonly { value: ThemeName; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
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

const BACKGROUND_OPTIONS: readonly { value: 'plain' | 'photo'; label: string }[] = [
  { value: 'plain', label: 'Plain' },
  { value: 'photo', label: 'Photo' },
]

/** Your first chart, or an example if you have none yet, drawn with the current look. */
function Preview() {
  const { active, timelines, today, settings, chartTheme } = useApp()
  const chart = active[0]
  const view = useMemo(() => {
    const columns = trailingWeeks(today, 22, settings.weekStart)
    if (chart) {
      const timeline = timelines.get(chart.id)!
      return { columns, streak: timeline.currentStreak, cell: (day: Day) => cellAt(timeline, day, chart.heatMode) }
    }
    const timeline = buildTimeline({ kind: 'daily' }, addDays(today, -200), sampleDoneDays(today, 200), today)
    return { columns, streak: timeline.currentStreak, cell: (day: Day) => cellAt(timeline, day, 'streak') }
  }, [chart, timelines, today, settings.weekStart])
  const ramp = rampFor(chart?.color ?? { kind: 'preset', ramp: 'ember' }, chartTheme)

  return (
    <section aria-label="Preview" className="fc-card flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <ChartIcon name={chart?.icon ?? 'dumbbell'} className="shrink-0 text-ink-2" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base leading-[22px] font-semibold">{chart?.name ?? 'Exercise'}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Flame color={ramp[2]} />
            {streakText(view.streak)}
          </span>
        </div>
      </div>
      <div className="max-w-[420px]">
        <Heatmap
          columns={view.columns}
          cellAt={view.cell}
          ramp={ramp}
          shape={chart?.shape ?? 'rounded'}
          today={today}
          label="A preview of how your charts look"
        />
      </div>
    </section>
  )
}

export function StyleScreen() {
  const { active, archived, settings, backgroundUrl } = useApp()
  const photoStored = useLiveQuery(() => hasBackground(db), []) ?? false
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const charts = [...active, ...archived]
  const shapes = new Set(charts.map((chart) => chart.shape))
  const heats = new Set(charts.map((chart) => chart.heatMode))
  const commonShape = shapes.size === 1 ? [...shapes][0] : null
  const commonHeat = heats.size === 1 ? [...heats][0] : null

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await setBackground(db, await compressImage(file))
    } catch {
      setError('That file could not be used as a background. Try a JPEG or PNG photo.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <ScreenHeader eyebrow="How your charts look" title="Style" />

      <Preview />

      <section className="fc-card flex flex-col px-4">
        <SettingRow label="Theme" hint={backgroundUrl ? 'A photo background always uses dark cards.' : undefined}>
          <Segmented
            label="Theme"
            value={settings.theme}
            options={THEME_OPTIONS}
            onChange={(theme) => void updateSettings(db, { theme })}
            className="w-[200px]"
          />
        </SettingRow>

        <SettingRow label="Background" hint={photoStored ? undefined : 'Put your own photo behind the app.'}>
          {photoStored ? (
            <Segmented
              label="Background"
              value={settings.photoBackground ? 'photo' : 'plain'}
              options={BACKGROUND_OPTIONS}
              onChange={(value) => void updateSettings(db, { photoBackground: value === 'photo' })}
              className="w-[200px]"
            />
          ) : (
            <Button disabled={busy} onClick={() => fileInput.current?.click()}>
              <Upload size={16} aria-hidden="true" />
              {busy ? 'Adding…' : 'Upload a photo'}
            </Button>
          )}
        </SettingRow>

        {photoStored && (
          <SettingRow label="Photo">
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => fileInput.current?.click()}>
                <Upload size={16} aria-hidden="true" />
                {busy ? 'Adding…' : 'Replace'}
              </Button>
              <Button variant="danger" onClick={() => void clearBackground(db)}>
                <Trash2 size={16} aria-hidden="true" />
                Remove
              </Button>
            </div>
          </SettingRow>
        )}

        {backgroundUrl && (
          <SettingRow label="Dim the photo">
            <input
              type="range"
              aria-label="Dim the photo"
              min={0}
              max={0.7}
              step={0.05}
              value={settings.backgroundDim}
              onChange={(event) => void updateSettings(db, { backgroundDim: Number(event.target.value) })}
              className="h-11 w-[200px] accent-[var(--fc-ink)]"
            />
          </SettingRow>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </section>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-2 pt-1">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">All charts at once</h2>
          <p className="text-xs text-muted">Each chart also has its own colour, shape and heat on its page.</p>
        </div>
        <div className="fc-card flex flex-col px-4">
          <SettingRow label="Cell shape">
            <Segmented
              label="Cell shape for all charts"
              value={commonShape}
              options={SHAPE_OPTIONS}
              onChange={(shape) => void updateAllCharts(db, { shape })}
            />
          </SettingRow>
          <SettingRow label="Heat" hint="Streak heat: the longer the run, the hotter the cell.">
            <Segmented
              label="Heat for all charts"
              value={commonHeat}
              options={HEAT_OPTIONS}
              onChange={(heatMode) => void updateAllCharts(db, { heatMode })}
            />
          </SettingRow>
        </div>
        {charts.length === 0 && <p className="text-xs text-muted">These apply once you have a chart.</p>}
      </section>
    </div>
  )
}
