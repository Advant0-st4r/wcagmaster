// Shared WCAG contrast utilities usable in both browser and Deno runtimes
// Provides parsing for common CSS color formats and WCAG 2.1 contrast helpers

export interface RGB {
  r: number
  g: number
  b: number
}

const NAMED_COLORS: Record<string, RGB> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  gray: { r: 128, g: 128, b: 128 },
  grey: { r: 128, g: 128, b: 128 },
  transparent: { r: 255, g: 255, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  orange: { r: 255, g: 165, b: 0 },
  purple: { r: 128, g: 0, b: 128 },
  cyan: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 }
}

function clampChannel(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(255, value))
}

function parseHex(color: string): RGB | null {
  const hex = color.startsWith('#') ? color.slice(1) : color
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16)
    const g = parseInt(hex[1] + hex[1], 16)
    const b = parseInt(hex[2] + hex[2], 16)
    return { r, g, b }
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return { r, g, b }
  }
  return null
}

function parseRgb(color: string): RGB | null {
  const match = color.match(/rgba?\(([^)]+)\)/i)
  if (!match) return null
  const parts = match[1].split(',').map(part => part.trim())
  if (parts.length < 3) return null

  const [r, g, b] = parts
    .slice(0, 3)
    .map(value => value.endsWith('%')
      ? clampChannel((parseFloat(value) / 100) * 255)
      : clampChannel(parseFloat(value)))

  return { r, g, b }
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const saturation = s / 100
  const lightness = l / 100
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = lightness - c / 2

  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return {
    r: clampChannel(Math.round((r + m) * 255)),
    g: clampChannel(Math.round((g + m) * 255)),
    b: clampChannel(Math.round((b + m) * 255))
  }
}

function parseHsl(color: string): RGB | null {
  const match = color.match(/hsla?\(([^)]+)\)/i)
  if (!match) return null
  const [h, s, l] = match[1]
    .split(',')
    .slice(0, 3)
    .map(value => parseFloat(value.trim()))
  if ([h, s, l].some(v => Number.isNaN(v))) return null
  return hslToRgb(h, s, l)
}

export function parseColor(color: string): RGB | null {
  if (!color) return null
  const trimmed = color.trim()
  const lower = trimmed.toLowerCase()
  if (lower in NAMED_COLORS) {
    return NAMED_COLORS[lower]
  }
  return parseHex(trimmed) || parseRgb(trimmed) || parseHsl(trimmed)
}

function toLinear(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(rgb: RGB): number {
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
}

export function getContrastRatio(foreground: string, background: string): number {
  const fg = parseColor(foreground)
  const bg = parseColor(background)
  if (!fg || !bg) return 0
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
}

export function meetsWCAG_AA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background)
  return ratio >= (isLargeText ? 3.0 : 4.5)
}

export function meetsWCAG_AAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background)
  return ratio >= (isLargeText ? 4.5 : 7.0)
}

export function suggestAccessibleColor(
  foreground: string,
  background: string,
  targetRatio = 4.5
): string {
  const fg = parseColor(foreground)
  const bg = parseColor(background)
  if (!fg || !bg) return foreground

  const bgLum = relativeLuminance(bg)
  const makeDarker = bgLum > 0.5

  let adjusted = { ...fg }
  for (let i = 0; i < 60; i++) {
    const testColor = `rgb(${adjusted.r}, ${adjusted.g}, ${adjusted.b})`
    if (getContrastRatio(testColor, background) >= targetRatio) {
      return testColor
    }

    const delta = makeDarker ? -8 : 8
    adjusted = {
      r: clampChannel(adjusted.r + delta),
      g: clampChannel(adjusted.g + delta),
      b: clampChannel(adjusted.b + delta)
    }
  }

  return makeDarker ? '#000000' : '#FFFFFF'
}

export class ContrastCalculator {
  getContrastRatio = getContrastRatio
  meetsWCAG_AA = meetsWCAG_AA
  meetsWCAG_AAA = meetsWCAG_AAA
  suggestAccessibleColor = suggestAccessibleColor
}

export const contrastCalculator = new ContrastCalculator()
