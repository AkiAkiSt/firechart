import { Download, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useApp } from '../../app/context'
import type { WeekStart } from '../../domain/types'
import { account, useAccount } from '../../sync'
import { db } from '../../store/db'
import { downloadFile } from '../../store/files'
import { deleteEverything, exportCsv, exportData, importData, updateSettings } from '../../store/repo'
import { Button, ConfirmDialog, Segmented, SettingRow } from '../../ui/controls'
import { AccountCard } from '../account/AccountCard'
import { ScreenHeader } from '../common'

const WEEK_OPTIONS: readonly { value: WeekStart; label: string }[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
]

export function SettingsScreen() {
  const { settings, today, active, archived } = useApp()
  const { account: accountState } = useAccount()
  const signedIn = accountState.kind !== 'signed-out' && accountState.kind !== 'loading'
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const hasCharts = active.length + archived.length > 0

  async function saveJson() {
    const file = await exportData(db)
    downloadFile(`firechart-${today}.json`, JSON.stringify(file, null, 2), 'application/json')
  }

  async function saveCsv() {
    downloadFile(`firechart-${today}.csv`, exportCsv(await exportData(db)), 'text/csv')
  }

  async function load(file: File | undefined) {
    if (!file) return
    try {
      const result = await importData(db, JSON.parse(await file.text()))
      const skipped = result.skipped > 0 ? ` ${result.skipped} unreadable rows were skipped.` : ''
      setMessage({
        text: `Imported ${result.charts} ${result.charts === 1 ? 'chart' : 'charts'} and ${result.entries} ${
          result.entries === 1 ? 'tick' : 'ticks'
        }.${skipped}`,
        bad: false,
      })
    } catch (cause) {
      const reason = cause instanceof SyntaxError ? 'That file is not valid JSON.' : cause instanceof Error ? cause.message : ''
      setMessage({ text: `Nothing was imported. ${reason}`.trim(), bad: true })
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function wipe() {
    setConfirmWipe(false)
    try {
      if (signedIn) await account.deleteAccount()
      else await deleteEverything(db)
      setMessage({ text: signedIn ? 'Your account was deleted.' : 'Everything was deleted.', bad: false })
    } catch (cause) {
      setMessage({ text: cause instanceof Error ? cause.message : 'That did not work.', bad: true })
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <ScreenHeader eyebrow={`Version ${__APP_VERSION__}`} title="Settings" />

      <AccountCard />

      <section className="fc-card flex flex-col px-4">
        <SettingRow label="Week starts on">
          <Segmented
            label="Week starts on"
            value={settings.weekStart}
            options={WEEK_OPTIONS}
            onChange={(weekStart) => void updateSettings(db, { weekStart })}
            className="w-[200px]"
          />
        </SettingRow>
      </section>

      <section className="flex flex-col gap-2 pt-1">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">Your data</h2>
          <p className="text-xs text-muted">
            {signedIn
              ? 'Your charts are kept on this device and in your account. A backup file is still worth having now and then.'
              : 'Your charts are stored on this device only. Export a copy now and then, or sign in to keep them in an account.'}
          </p>
        </div>
        <div className="fc-card flex flex-col px-4">
          <SettingRow label="Export" hint="A full backup, or a spreadsheet of ticked days.">
            <div className="flex flex-wrap gap-2">
              <Button disabled={!hasCharts} onClick={() => void saveJson()}>
                <Download size={16} aria-hidden="true" />
                Backup file
              </Button>
              <Button disabled={!hasCharts} onClick={() => void saveCsv()}>
                <Download size={16} aria-hidden="true" />
                Spreadsheet
              </Button>
            </div>
          </SettingRow>
          <SettingRow label="Import" hint="Adds charts and ticks from a backup file. Nothing is deleted.">
            <Button onClick={() => fileInput.current?.click()}>
              <Upload size={16} aria-hidden="true" />
              Choose a file
            </Button>
          </SettingRow>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void load(event.target.files?.[0])}
          />
        </div>
        {message && (
          <p role="status" className={`text-sm ${message.bad ? 'text-danger' : 'text-ink-2'}`}>
            {message.text}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2 pt-1">
        <h2 className="text-sm font-semibold">Start over</h2>
        <div className="fc-card flex flex-col px-4">
          {signedIn ? (
            <SettingRow
              label="Delete account"
              hint="Removes your account and every chart and tick in it, here and on your other devices."
            >
              <Button variant="danger" onClick={() => setConfirmWipe(true)}>
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </Button>
            </SettingRow>
          ) : (
            <SettingRow label="Delete everything" hint="Removes every chart, tick and setting from this device.">
              <Button variant="danger" onClick={() => setConfirmWipe(true)}>
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </Button>
            </SettingRow>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmWipe}
        title={signedIn ? 'Delete your account?' : 'Delete everything?'}
        body={
          signedIn
            ? 'Your account, charts and ticks are removed from the server and from this device. This cannot be undone. Export a backup first if you might want them back.'
            : 'Every chart, tick and setting on this device will be removed. Export a backup first if you might want it back.'
        }
        confirmLabel={signedIn ? 'Delete account' : 'Delete everything'}
        danger
        onCancel={() => setConfirmWipe(false)}
        onConfirm={() => void wipe()}
      />
    </div>
  )
}
