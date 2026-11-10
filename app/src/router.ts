import { useMemo, useSyncExternalStore } from 'react'

/**
 * The app's screens. Routes live in the URL hash ("#/chart/abc") so the same
 * build works from any folder on a static host and inside the desktop shell.
 */
export type Route =
  | { name: 'today' }
  | { name: 'charts' }
  /** `from` records which list the chart was opened from, so Back returns there. */
  | { name: 'chart'; id: string; from?: 'charts' }
  | { name: 'new' }
  | { name: 'edit'; id: string }
  | { name: 'style' }
  | { name: 'settings' }
  | { name: 'signin' }
  /** `code` is an invite code carried by a "#/join/<code>" link. */
  | { name: 'signup'; code?: string }
  /** For someone who is signed in but has not joined a circle yet. */
  | { name: 'invite' }

function decode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const parts = path
    .split('/')
    .filter((part) => part !== '')
    .map(decode)
  switch (parts[0]) {
    case 'charts':
      return { name: 'charts' }
    case 'chart':
      if (!parts[1]) return { name: 'charts' }
      if (parts[2] === 'edit') return { name: 'edit', id: parts[1] }
      return query === 'from=charts' ? { name: 'chart', id: parts[1], from: 'charts' } : { name: 'chart', id: parts[1] }
    case 'new':
      return { name: 'new' }
    case 'style':
      return { name: 'style' }
    case 'settings':
      return { name: 'settings' }
    case 'signin':
      return { name: 'signin' }
    case 'signup':
      return { name: 'signup' }
    case 'join':
      return parts[1] ? { name: 'signup', code: parts[1] } : { name: 'signup' }
    case 'invite':
      return { name: 'invite' }
    default:
      return { name: 'today' }
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'today':
      return '#/'
    case 'chart':
      return `#/chart/${encodeURIComponent(route.id)}${route.from ? `?from=${route.from}` : ''}`
    case 'edit':
      return `#/chart/${encodeURIComponent(route.id)}/edit`
    case 'signup':
      return route.code ? `#/join/${encodeURIComponent(route.code)}` : '#/signup'
    default:
      return `#/${route.name}`
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => parseHash(hash), [hash])
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const href = hrefFor(route)
  if (options.replace) window.location.replace(href)
  else window.location.hash = href.slice(1)
}
