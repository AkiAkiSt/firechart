import { describe, expect, it } from 'vitest'
import type { ThemeName } from '../domain/types'
import {
  CARD_SURFACE,
  contrast,
  customRamp,
  hexToOklch,
  normalizeHex,
  oklchToHex,
  presetRamp,
  RAMP_NAMES,
  rampFor,
  type Ramp,
} from './ramps'

const THEMES: ThemeName[] = ['dark', 'light']

/** The rules every ramp must meet; see docs/DESIGN.md, section 3. */
function check(ramp: Ramp, theme: ThemeName): string[] {
  const problems: string[] = []
  const lightness = ramp.map((hex) => hexToOklch(hex).l)
  const direction = theme === 'dark' ? 1 : -1
  for (let i = 0; i < 3; i++) {
    const delta = (lightness[i + 1] - lightness[i]) * direction
    if (delta < 0.06) problems.push(`step ${i + 1} to ${i + 2} differs by ${delta.toFixed(3)}`)
  }
  const first = contrast(ramp[0], CARD_SURFACE[theme])
  if (first < 2) problems.push(`level 1 contrast is ${first.toFixed(2)}`)
  for (const hex of ramp) if (!/^#[0-9a-f]{6}$/.test(hex)) problems.push(`bad hex ${hex}`)
  return problems
}

describe('preset ramps', () => {
  for (const theme of THEMES) {
    for (const name of RAMP_NAMES) {
      it(`${name} passes on ${theme}`, () => {
        expect(check(presetRamp(name, theme), theme)).toEqual([])
      })
    }
  }
})

describe('custom ramps', () => {
  it('pass for every hue at high and low saturation', () => {
    for (const theme of THEMES) {
      for (let hue = 0; hue < 360; hue += 15) {
        for (const chroma of [0.02, 0.1, 0.2, 0.32]) {
          const picked = oklchToHex(0.65, chroma, hue)
          expect(check(customRamp(picked, theme), theme), `${picked} on ${theme}`).toEqual([])
        }
      }
    }
  })

  it('pass for extreme picks', () => {
    for (const theme of THEMES) {
      for (const picked of ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#808080']) {
        expect(check(customRamp(picked, theme), theme), `${picked} on ${theme}`).toEqual([])
      }
    }
  })

  it('keep the hue of the picked colour', () => {
    const ramp = customRamp('#2c83c5', 'dark')
    const hue = hexToOklch('#2c83c5').h
    for (const hex of ramp) expect(Math.abs(hexToOklch(hex).h - hue)).toBeLessThan(6)
  })

  it('fall back to a valid ramp for a bad value', () => {
    expect(check(customRamp('not a colour', 'dark'), 'dark')).toEqual([])
  })
})

describe('colour helpers', () => {
  it('normalizes hex input', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc')
    expect(normalizeHex(' #F68C11 ')).toBe('#f68c11')
    expect(normalizeHex('f68c11')).toBeNull()
    expect(normalizeHex('#12345')).toBeNull()
  })

  it('round-trips through OKLCH', () => {
    for (const hex of ['#f68c11', '#37c667', '#4eb2f1', '#df7ddd', '#abaeb3']) {
      const { l, c, h } = hexToOklch(hex)
      expect(oklchToHex(l, c, h)).toBe(hex)
    }
  })

  it('computes contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#15171c', '#15171c')).toBe(1)
  })

  it('resolves presets and custom colours', () => {
    expect(rampFor({ kind: 'preset', ramp: 'ember' }, 'dark')[2]).toBe('#f68c11')
    expect(rampFor({ kind: 'custom', hex: '#2c83c5' }, 'dark')).toHaveLength(4)
  })
})
