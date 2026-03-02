import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DRAW_MODE_ICONS } from '../DrawModeIcons'
import type { DrawMode } from '../../types'

describe('DrawModeIcons', () => {
  const ALL_MODES: DrawMode[] = ['point', 'line', 'polygon', 'symbol']

  it('DRAW_MODE_ICONS has all 4 draw modes', () => {
    const keys = Object.keys(DRAW_MODE_ICONS)
    expect(keys).toHaveLength(4)
    for (const mode of ALL_MODES) {
      expect(DRAW_MODE_ICONS[mode]).toBeDefined()
      expect(typeof DRAW_MODE_ICONS[mode]).toBe('function')
    }
  })

  it.each(ALL_MODES)('"%s" icon renders an SVG element', (mode) => {
    const Icon = DRAW_MODE_ICONS[mode]
    const { container } = render(<Icon />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  it('PointIcon renders two circles', () => {
    const Icon = DRAW_MODE_ICONS['point']
    const { container } = render(<Icon />)
    const circles = container.querySelectorAll('circle')
    expect(circles).toHaveLength(2)
    // Inner filled circle
    expect(circles[0].getAttribute('r')).toBe('3')
    expect(circles[0].getAttribute('fill')).toBe('currentColor')
    // Outer ring
    expect(circles[1].getAttribute('r')).toBe('8')
  })

  it('LineIcon renders a polyline and three circles', () => {
    const Icon = DRAW_MODE_ICONS['line']
    const { container } = render(<Icon />)
    const polylines = container.querySelectorAll('polyline')
    expect(polylines).toHaveLength(1)
    const circles = container.querySelectorAll('circle')
    expect(circles).toHaveLength(3)
  })

  it('PolygonIcon renders a polygon element', () => {
    const Icon = DRAW_MODE_ICONS['polygon']
    const { container } = render(<Icon />)
    const polygon = container.querySelector('polygon')
    expect(polygon).not.toBeNull()
    expect(polygon!.getAttribute('points')).toBe('12,3 3,20 21,20')
  })

  it('SymbolIcon renders a path and a circle', () => {
    const Icon = DRAW_MODE_ICONS['symbol']
    const { container } = render(<Icon />)
    const paths = container.querySelectorAll('path')
    expect(paths).toHaveLength(1)
    const circles = container.querySelectorAll('circle')
    expect(circles).toHaveLength(1)
    expect(circles[0].getAttribute('stroke')).toBe('#fff')
  })
})
