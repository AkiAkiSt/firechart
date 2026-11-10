import type { ChartColor, RampName, ThemeName } from '../domain/types'

/** Four heat levels, from the step nearest the card surface to the hottest. */
export type Ramp = readonly [string, string, string, string]

export const RAMP_NAMES: readonly RampName[] = ['ember', 'moss', 'ice', 'orchid', 'bone', 'sun', 'coral', 'teal']

export const RAMP_LABELS: Record<RampName, string> = {
  ember: 'Ember',
  moss: 'Moss',
  ice: 'Ice',
  orchid: 'Orchid',
  bone: 'Bone',
  sun: 'Sun',
  coral: 'Coral',
  teal: 'Teal',
}

/** Values are generated and checked by tools/ramps.py and recorded in docs/DESIGN.md. */
const DARK: Record<RampName, Ramp> = {
  ember: ['#953a1c', '#cf5604', '#f68c11', '#ffd15a'],
  moss: ['#1d6835', '#21954a', '#37c667', '#65f68e'],
  ice: ['#225b8d', '#2c83c5', '#4eb2f1', '#a1defe'],
  orchid: ['#7d397c', '#b151af', '#df7ddd', '#fcbbf9'],
  bone: ['#55585d', '#7d8085', '#abaeb3', '#dfe1e5'],
  sun: ['#72560f', '#9f7f12', '#cfaf1d', '#f9e03f'],
  coral: ['#8e3642', '#ca4c58', '#f77d80', '#fec3c0'],
  teal: ['#026565', '#08908c', '#24bfb8', '#65eee3'],
}

const LIGHT: Record<RampName, Ramp> = {
  ember: ['#e5a83a', '#dc7702', '#c14802', '#971d08'],
  moss: ['#58cd78', '#1eab53', '#02853c', '#005e28'],
  ice: ['#73baea', '#3c96d8', '#0f72bb', '#014f8a'],
  orchid: ['#e18fde', '#c760c6', '#a33ea2', '#762575'],
  bone: ['#aeb1b6', '#8c8f94', '#696c71', '#45484c'],
  sun: ['#cfaf1d', '#ae8a0d', '#8c6802', '#654702'],
  coral: ['#f98e8f', '#e45b63', '#c13045', '#8c1832'],
  teal: ['#49c7c0', '#0ca4a0', '#0c7f7e', '#055959'],
}

/** The card surface each theme's ramps are checked against. */
export const CARD_SURFACE: Record<ThemeName, string> = { dark: '#15171c', light: '#ffffff' }

/** OKLCH lightness of each level for ramps built from a custom colour. */
const CUSTOM_LIGHTNESS: Record<ThemeName, readonly [number, number, number, number]> = {
  dark: [0.46, 0.59, 0.73, 0.87],
  light: [0.76, 0.65, 0.54, 0.42],
}

/** How much of the picked colour's saturation each level keeps. */
const CUSTOM_CHROMA: readonly [number, number, number, number] = [0.8, 1, 1, 0.75]

export interface Oklch {
  l: number
  c: number
  h: number
}

export function normalizeHex(input: string): string | null {
  const value = input.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(value)) return value
  if (/^#[0-9a-f]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  }
  return null
}

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(v: number): number {
  const x = Math.min(1, Math.max(0, v))
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
}

function hexToLinear(hex: string): [number, number, number] {
  return [
    srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255),
    srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255),
    srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255),
  ]
}

function oklchToLinear(l: number, c: number, h: number): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToLinear(hex)
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const h = (Math.atan2(bb, a) * 180) / Math.PI
  return { l, c: Math.hypot(a, bb), h: h < 0 ? h + 360 : h }
}

/** Converts to hex, lowering saturation until the colour fits the sRGB gamut. */
export function oklchToHex(l: number, c: number, h: number): string {
  let chroma = Math.max(0, c)
  let rgb = oklchToLinear(l, chroma, h)
  while (chroma > 0 && rgb.some((v) => v < -0.0005 || v > 1.0005)) {
    chroma = Math.max(0, chroma - 0.002)
    rgb = oklchToLinear(l, chroma, h)
  }
  return `#${rgb
    .map((v) =>
      Math.round(linearToSrgb(v) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToLinear(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const customCache = new Map<string, Ramp>()

/**
 * Builds four heat levels from any colour: the hue is kept, lightness is set
 * per level, and saturation is reduced only where the screen cannot show it.
 * Level 1 is nudged away from the card until it reaches 2:1 contrast, so a
 * custom ramp passes the same checks as the presets.
 */
export function customRamp(hex: string, theme: ThemeName): Ramp {
  const base = normalizeHex(hex) ?? '#f68c11'
  const key = `${theme}:${base}`
  const cached = customCache.get(key)
  if (cached) return cached

  const { c, h } = hexToOklch(base)
  const lightness = [...CUSTOM_LIGHTNESS[theme]]
  const step = theme === 'dark' ? 0.01 : -0.01
  const surface = CARD_SURFACE[theme]
  let first = oklchToHex(lightness[0], c * CUSTOM_CHROMA[0], h)
  for (let i = 0; i < 6 && contrast(first, surface) < 2; i++) {
    lightness[0] += step
    first = oklchToHex(lightness[0], c * CUSTOM_CHROMA[0], h)
  }
  const ramp: Ramp = [
    first,
    oklchToHex(lightness[1], c * CUSTOM_CHROMA[1], h),
    oklchToHex(lightness[2], c * CUSTOM_CHROMA[2], h),
    oklchToHex(lightness[3], c * CUSTOM_CHROMA[3], h),
  ]
  customCache.set(key, ramp)
  return ramp
}

export function presetRamp(name: RampName, theme: ThemeName): Ramp {
  return (theme === 'dark' ? DARK : LIGHT)[name]
}

export function rampFor(color: ChartColor, theme: ThemeName): Ramp {
  return color.kind === 'preset' ? presetRamp(color.ramp, theme) : customRamp(color.hex, theme)
}

/** The colour that stands for a chart in swatches, flames and avatars: level 3. */
export function identityColor(color: ChartColor, theme: ThemeName): string {
  return rampFor(color, theme)[2]
}
