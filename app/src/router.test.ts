import { describe, expect, it } from 'vitest'
import { hrefFor, parseHash, type Route } from './router'

describe('routes', () => {
  it('round-trip through the hash', () => {
    const routes: Route[] = [
      { name: 'today' },
      { name: 'charts' },
      { name: 'chart', id: 'a1b2-c3' },
      { name: 'chart', id: 'a1b2-c3', from: 'charts' },
      { name: 'edit', id: 'a1b2-c3' },
      { name: 'new' },
      { name: 'style' },
      { name: 'settings' },
      { name: 'signin' },
      { name: 'signup' },
      { name: 'signup', code: 'abcd-efgh-jkmn' },
      { name: 'invite' },
    ]
    for (const route of routes) expect(parseHash(hrefFor(route))).toEqual(route)
  })

  it('fall back to Today for anything unknown', () => {
    expect(parseHash('')).toEqual({ name: 'today' })
    expect(parseHash('#')).toEqual({ name: 'today' })
    expect(parseHash('#/nope')).toEqual({ name: 'today' })
    expect(parseHash('#/chart')).toEqual({ name: 'charts' })
    expect(parseHash('#/chart/%E0%A4%A')).toEqual({ name: 'chart', id: '%E0%A4%A' })
  })
})
