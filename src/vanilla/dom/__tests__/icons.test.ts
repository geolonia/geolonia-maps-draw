import { describe, it, expect } from 'vitest'
import {
  createPointIcon,
  createLineIcon,
  createPolygonIcon,
  createSymbolIcon,
  createUndoIcon,
  createRedoIcon,
  createCheckIcon,
  createDeleteIcon,
  createResetIcon,
  createGripIcon,
  createGeoloniaIcon,
  DRAW_MODE_ICONS,
} from '../icons'

describe('icons', () => {
  describe('createPointIcon', () => {
    it('returns SVGSVGElement with correct viewBox', () => {
      const el = createPointIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('has 2 circle children (inner filled + outer)', () => {
      const el = createPointIcon()
      const circles = el.querySelectorAll('circle')
      expect(circles).toHaveLength(2)
      expect(circles[0].getAttribute('r')).toBe('3')
      expect(circles[0].getAttribute('fill')).toBe('currentColor')
      expect(circles[1].getAttribute('r')).toBe('8')
    })

    it('has correct stroke attributes', () => {
      const el = createPointIcon()
      expect(el.getAttribute('stroke')).toBe('currentColor')
      expect(el.getAttribute('stroke-width')).toBe('2')
      expect(el.getAttribute('stroke-linecap')).toBe('round')
      expect(el.getAttribute('stroke-linejoin')).toBe('round')
      expect(el.getAttribute('fill')).toBe('none')
    })
  })

  describe('createLineIcon', () => {
    it('returns SVGSVGElement with correct viewBox', () => {
      const el = createLineIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('has a polyline and 3 circles', () => {
      const el = createLineIcon()
      expect(el.querySelectorAll('polyline')).toHaveLength(1)
      expect(el.querySelector('polyline')!.getAttribute('points')).toBe('4,18 12,6 20,16')
      const circles = el.querySelectorAll('circle')
      expect(circles).toHaveLength(3)
      expect(circles[0].getAttribute('cx')).toBe('4')
      expect(circles[0].getAttribute('cy')).toBe('18')
      expect(circles[1].getAttribute('cx')).toBe('12')
      expect(circles[1].getAttribute('cy')).toBe('6')
      expect(circles[2].getAttribute('cx')).toBe('20')
      expect(circles[2].getAttribute('cy')).toBe('16')
    })
  })

  describe('createPolygonIcon', () => {
    it('returns SVGSVGElement with correct viewBox', () => {
      const el = createPolygonIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('has a polygon child', () => {
      const el = createPolygonIcon()
      const polygon = el.querySelector('polygon')
      expect(polygon).not.toBeNull()
      expect(polygon!.getAttribute('points')).toBe('12,3 3,20 21,20')
    })

    it('has 1 child element', () => {
      const el = createPolygonIcon()
      expect(el.children).toHaveLength(1)
    })
  })

  describe('createSymbolIcon', () => {
    it('returns SVGSVGElement with correct viewBox', () => {
      const el = createSymbolIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('has a path and a circle', () => {
      const el = createSymbolIcon()
      expect(el.querySelector('path')).not.toBeNull()
      expect(el.querySelector('path')!.getAttribute('fill')).toBe('currentColor')
      const circle = el.querySelector('circle')
      expect(circle).not.toBeNull()
      expect(circle!.getAttribute('stroke')).toBe('#fff')
      expect(circle!.getAttribute('stroke-width')).toBe('1.5')
    })

    it('has 2 child elements', () => {
      const el = createSymbolIcon()
      expect(el.children).toHaveLength(2)
    })
  })

  describe('createUndoIcon', () => {
    it('returns SVGSVGElement with correct viewBox', () => {
      const el = createUndoIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('has a polyline and a path', () => {
      const el = createUndoIcon()
      expect(el.querySelector('polyline')!.getAttribute('points')).toBe('9 14 4 9 9 4')
      expect(el.querySelector('path')!.getAttribute('d')).toBe('M20 20v-7a4 4 0 0 0-4-4H4')
    })

    it('has 2 child elements', () => {
      const el = createUndoIcon()
      expect(el.children).toHaveLength(2)
    })
  })

  describe('createRedoIcon', () => {
    it('returns SVGSVGElement with correct viewBox', () => {
      const el = createRedoIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('has a polyline and a path', () => {
      const el = createRedoIcon()
      expect(el.querySelector('polyline')!.getAttribute('points')).toBe('15 14 20 9 15 4')
      expect(el.querySelector('path')!.getAttribute('d')).toBe('M4 20v-7a4 4 0 0 1 4-4h12')
    })

    it('has 2 child elements', () => {
      const el = createRedoIcon()
      expect(el.children).toHaveLength(2)
    })
  })

  describe('createCheckIcon', () => {
    it('returns SVGSVGElement with correct viewBox and stroke-width 3', () => {
      const el = createCheckIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(el.getAttribute('stroke-width')).toBe('3')
    })

    it('has a polyline', () => {
      const el = createCheckIcon()
      expect(el.querySelector('polyline')!.getAttribute('points')).toBe('20 6 9 17 4 12')
    })

    it('has 1 child element', () => {
      const el = createCheckIcon()
      expect(el.children).toHaveLength(1)
    })
  })

  describe('createDeleteIcon', () => {
    it('returns SVGSVGElement with correct viewBox', () => {
      const el = createDeleteIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('has a polyline and a path', () => {
      const el = createDeleteIcon()
      expect(el.querySelector('polyline')!.getAttribute('points')).toBe('3 6 5 6 21 6')
      expect(el.querySelector('path')).not.toBeNull()
    })

    it('has 2 child elements', () => {
      const el = createDeleteIcon()
      expect(el.children).toHaveLength(2)
    })
  })

  describe('createResetIcon', () => {
    it('returns SVGSVGElement with correct viewBox', () => {
      const el = createResetIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('has a polyline and a path', () => {
      const el = createResetIcon()
      expect(el.querySelector('polyline')!.getAttribute('points')).toBe('1 4 1 10 7 10')
      expect(el.querySelector('path')!.getAttribute('d')).toBe('M3.51 15a9 9 0 1 0 2.13-9.36L1 10')
    })

    it('has 2 child elements', () => {
      const el = createResetIcon()
      expect(el.children).toHaveLength(2)
    })
  })

  describe('createGripIcon', () => {
    it('returns SVGSVGElement with viewBox 0 0 24 8', () => {
      const el = createGripIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 8')
    })

    it('has fill=currentColor', () => {
      const el = createGripIcon()
      expect(el.getAttribute('fill')).toBe('currentColor')
    })

    it('has 6 circles', () => {
      const el = createGripIcon()
      const circles = el.querySelectorAll('circle')
      expect(circles).toHaveLength(6)
      expect(circles[0].getAttribute('cx')).toBe('6')
      expect(circles[0].getAttribute('cy')).toBe('2')
      expect(circles[0].getAttribute('r')).toBe('1.5')
      expect(circles[5].getAttribute('cx')).toBe('18')
      expect(circles[5].getAttribute('cy')).toBe('6')
    })
  })

  describe('createGeoloniaIcon', () => {
    it('returns SVGSVGElement with correct viewBox', () => {
      const el = createGeoloniaIcon()
      expect(el).toBeInstanceOf(SVGSVGElement)
      expect(el.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('has width and height of 24', () => {
      const el = createGeoloniaIcon()
      expect(el.getAttribute('width')).toBe('24')
      expect(el.getAttribute('height')).toBe('24')
    })

    it('has aria-label and role', () => {
      const el = createGeoloniaIcon()
      expect(el.getAttribute('aria-label')).toBe('Powered by Geolonia')
      expect(el.getAttribute('role')).toBe('img')
    })

    it('has a circle and a text element', () => {
      const el = createGeoloniaIcon()
      const circle = el.querySelector('circle')
      expect(circle).not.toBeNull()
      expect(circle!.getAttribute('fill')).toBe('#2563eb')
      const text = el.querySelector('text')
      expect(text).not.toBeNull()
      expect(text!.textContent).toBe('G')
      expect(text!.getAttribute('text-anchor')).toBe('middle')
    })

    it('has fill=none on the root svg', () => {
      const el = createGeoloniaIcon()
      expect(el.getAttribute('fill')).toBe('none')
    })
  })

  describe('DRAW_MODE_ICONS', () => {
    it('has all 4 draw modes', () => {
      expect(Object.keys(DRAW_MODE_ICONS)).toEqual(['point', 'line', 'polygon', 'symbol'])
    })

    it('each value is a function that returns SVGSVGElement', () => {
      for (const mode of ['point', 'line', 'polygon', 'symbol'] as const) {
        expect(typeof DRAW_MODE_ICONS[mode]).toBe('function')
        const el = DRAW_MODE_ICONS[mode]()
        expect(el).toBeInstanceOf(SVGSVGElement)
      }
    })
  })
})
