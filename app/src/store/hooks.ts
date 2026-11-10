import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { todayLocal } from '../domain/dates'
import type { Chart, Day } from '../domain/types'
import { db, type Settings } from './db'
import { doneDaysByChart, getBackground, getSettings, listCharts } from './repo'

/** Live queries re-run whenever the underlying tables change. `undefined` means still loading. */
export function useCharts(): Chart[] | undefined {
  return useLiveQuery(() => listCharts(db), [])
}

export function useDoneDays(): Map<string, Set<Day>> | undefined {
  return useLiveQuery(() => doneDaysByChart(db), [])
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => getSettings(db), [])
}

/** An object URL for the stored background photo, or null when there is none. */
export function useBackgroundUrl(enabled: boolean): string | null {
  const url =
    useLiveQuery(async () => {
      if (!enabled) return null
      const blob = await getBackground(db)
      return blob ? URL.createObjectURL(blob) : null
    }, [enabled]) ?? null

  // Release the previous photo's memory once a new URL has replaced it.
  const previous = useRef<string | null>(null)
  useEffect(() => {
    const old = previous.current
    previous.current = url
    if (old && old !== url) URL.revokeObjectURL(old)
  }, [url])

  return url
}

/** The current local day, kept fresh across midnight and when the app is reopened. */
export function useToday(): Day {
  const [today, setToday] = useState(() => todayLocal())
  useEffect(() => {
    const refresh = () => setToday(todayLocal())
    const timer = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  return today
}

/** The width of an element in pixels, updated as it resizes. Pass the first value as the element's `ref`. */
export function useElementWidth<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [node, setNode] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  // Measure as soon as the element exists, so the first paint already has the right size.
  const attach = useCallback((element: T | null) => {
    setNode(element)
    if (element) setWidth(element.clientWidth)
  }, [])
  useEffect(() => {
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return [attach, width]
}
