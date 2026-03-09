import type { DrawMode } from '../../types'

const SVG_NS = 'http://www.w3.org/2000/svg'

function svg(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag)
}

function setAttrs(el: SVGElement, attrs: Record<string, string>): void {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
}

function createBaseSvg(viewBox: string, extra?: Record<string, string>): SVGSVGElement {
  const s = svg('svg') as SVGSVGElement
  setAttrs(s, {
    viewBox,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    ...extra,
  })
  return s
}

export function createPointIcon(): SVGSVGElement {
  const s = createBaseSvg('0 0 24 24')
  const inner = svg('circle')
  setAttrs(inner, { cx: '12', cy: '12', r: '3', fill: 'currentColor' })
  const outer = svg('circle')
  setAttrs(outer, { cx: '12', cy: '12', r: '8' })
  s.appendChild(inner)
  s.appendChild(outer)
  return s
}

export function createLineIcon(): SVGSVGElement {
  const s = createBaseSvg('0 0 24 24')
  const pl = svg('polyline')
  setAttrs(pl, { points: '4,18 12,6 20,16' })
  s.appendChild(pl)
  for (const [cx, cy] of [['4', '18'], ['12', '6'], ['20', '16']]) {
    const c = svg('circle')
    setAttrs(c, { cx, cy, r: '2', fill: 'currentColor' })
    s.appendChild(c)
  }
  return s
}

export function createPolygonIcon(): SVGSVGElement {
  const s = createBaseSvg('0 0 24 24')
  const pg = svg('polygon')
  setAttrs(pg, { points: '12,3 3,20 21,20' })
  s.appendChild(pg)
  return s
}

export function createSymbolIcon(): SVGSVGElement {
  const s = createBaseSvg('0 0 24 24')
  const path = svg('path')
  setAttrs(path, {
    d: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
    fill: 'currentColor',
  })
  const circle = svg('circle')
  setAttrs(circle, {
    cx: '12',
    cy: '9',
    r: '2.5',
    fill: 'none',
    stroke: '#fff',
    'stroke-width': '1.5',
  })
  s.appendChild(path)
  s.appendChild(circle)
  return s
}

export function createUndoIcon(): SVGSVGElement {
  const s = createBaseSvg('0 0 24 24')
  const pl = svg('polyline')
  setAttrs(pl, { points: '9 14 4 9 9 4' })
  const path = svg('path')
  setAttrs(path, { d: 'M20 20v-7a4 4 0 0 0-4-4H4' })
  s.appendChild(pl)
  s.appendChild(path)
  return s
}

export function createRedoIcon(): SVGSVGElement {
  const s = createBaseSvg('0 0 24 24')
  const pl = svg('polyline')
  setAttrs(pl, { points: '15 14 20 9 15 4' })
  const path = svg('path')
  setAttrs(path, { d: 'M4 20v-7a4 4 0 0 1 4-4h12' })
  s.appendChild(pl)
  s.appendChild(path)
  return s
}

export function createCheckIcon(): SVGSVGElement {
  const s = createBaseSvg('0 0 24 24', { 'stroke-width': '3' })
  const pl = svg('polyline')
  setAttrs(pl, { points: '20 6 9 17 4 12' })
  s.appendChild(pl)
  return s
}

export function createDeleteIcon(): SVGSVGElement {
  const s = createBaseSvg('0 0 24 24')
  const pl = svg('polyline')
  setAttrs(pl, { points: '3 6 5 6 21 6' })
  const path = svg('path')
  setAttrs(path, {
    d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  })
  s.appendChild(pl)
  s.appendChild(path)
  return s
}

export function createResetIcon(): SVGSVGElement {
  const s = createBaseSvg('0 0 24 24')
  const pl = svg('polyline')
  setAttrs(pl, { points: '1 4 1 10 7 10' })
  const path = svg('path')
  setAttrs(path, { d: 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10' })
  s.appendChild(pl)
  s.appendChild(path)
  return s
}

export function createGripIcon(): SVGSVGElement {
  const s = svg('svg') as SVGSVGElement
  setAttrs(s, { viewBox: '0 0 24 8', fill: 'currentColor' })
  for (const [cx, cy] of [['6', '2'], ['12', '2'], ['18', '2'], ['6', '6'], ['12', '6'], ['18', '6']]) {
    const c = svg('circle')
    setAttrs(c, { cx, cy, r: '1.5' })
    s.appendChild(c)
  }
  return s
}

export function createGeoloniaIcon(): SVGSVGElement {
  const s = svg('svg') as SVGSVGElement
  setAttrs(s, {
    viewBox: '0 0 24 24',
    width: '24',
    height: '24',
    fill: 'none',
    'aria-label': 'Powered by Geolonia',
    role: 'img',
  })
  const circle = svg('circle')
  setAttrs(circle, { cx: '12', cy: '12', r: '11', fill: '#2563eb' })
  const text = svg('text')
  setAttrs(text, {
    x: '12',
    y: '16.5',
    'text-anchor': 'middle',
    fill: '#fff',
    'font-size': '14',
    'font-weight': 'bold',
    'font-family': 'system-ui, sans-serif',
  })
  text.textContent = 'G'
  s.appendChild(circle)
  s.appendChild(text)
  return s
}

export const DRAW_MODE_ICONS: Record<DrawMode, () => SVGSVGElement> = {
  point: createPointIcon,
  line: createLineIcon,
  polygon: createPolygonIcon,
  symbol: createSymbolIcon,
}
