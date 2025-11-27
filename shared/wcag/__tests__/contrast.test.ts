import { describe, it, expect } from 'vitest'
import { parseColor, getContrastRatio, meetsWCAG_AA, suggestAccessibleColor } from '../contrast'
import cssParser from '../css-parser'

describe('contrast utilities', () => {
  it('parses hex, rgb and hsl and named colors', () => {
    expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseColor('rgb(255,0,0)')).toEqual({ r: 255, g: 0, b: 0 })
    expect(parseColor('hsl(0,100,50)')).toEqual({ r: 255, g: 0, b: 0 })
    expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('calculates contrast ratio correctly', () => {
    const ratio = getContrastRatio('#000', '#fff')
    expect(ratio).toBeGreaterThanOrEqual(21)
  })

  it('meets WCAG AA for black on white', () => {
    expect(meetsWCAG_AA('#000', '#fff')).toBe(true)
  })

  it('suggests accessible color', () => {
    const suggestion = suggestAccessibleColor('#777', '#fff')
    expect(typeof suggestion).toBe('string')
    // suggestion should increase contrast
    expect(getContrastRatio(suggestion, '#fff')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('css-parser', () => {
  it('parses inline styles from elements', async () => {
    document.body.innerHTML = '<div class="text" style="color: #123456; background: #ffffff">hello</div>'
    const bundle = await cssParser.parseStylesheetsFromDocument(document)
    const el = document.querySelector('.text')!
    const colors = cssParser.computeColorsForElement(el, bundle)
    // Should get inline style values
    expect(colors.color).toBe('#123456')
    expect(colors.background).toBe('#ffffff')
  })

  it('parses style tags and extracts rules', async () => {
    const html = '<html><head><style>.box { color: red; background-color: white; }</style></head><body><div class="box">test</div></body></html>'
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const bundle = await cssParser.parseStylesheetsFromDocument(doc)
    expect(bundle.rules.length).toBeGreaterThan(0)
    expect(bundle.rules.some(r => r.selector === '.box')).toBe(true)
  })
})
