import { describe, it, expect } from 'vitest'
import { parseDataAttributes } from '../GeoloniaDrawPlugin'

describe('parseDataAttributes の外観', () => {
  it('data-draw-appearance が dataset 形式のキーで渡された場合に読む', () => {
    expect(parseDataAttributes({ draw: 'on', drawAppearance: 'dark' }).appearance).toBe('dark')
  })

  it('data-draw-appearance がハイフン形式のキーで渡された場合に読む', () => {
    expect(parseDataAttributes({ draw: 'on', 'draw-appearance': 'glass' }).appearance).toBe('glass')
  })

  it('両方のキーがある場合は dataset 形式を優先する', () => {
    const atts = { draw: 'on', drawAppearance: 'dark', 'draw-appearance': 'glass' }
    expect(parseDataAttributes(atts).appearance).toBe('dark')
  })

  it('指定が無い場合は light になる', () => {
    expect(parseDataAttributes({ draw: 'on' }).appearance).toBe('light')
  })

  it('未知の値は light に落とす', () => {
    expect(parseDataAttributes({ draw: 'on', drawAppearance: 'neon' }).appearance).toBe('light')
  })

  it('外観の指定は showControls の判定に影響しない', () => {
    expect(parseDataAttributes({ draw: 'on', drawAppearance: 'dark' }).showControls).toBe(true)
    expect(parseDataAttributes({ draw: 'off', drawAppearance: 'dark' }).showControls).toBe(false)
  })
})
