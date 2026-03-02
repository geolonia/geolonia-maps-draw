import type { ReactElement } from 'react'
import type { DrawMode } from '../types'

function PointIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}

function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,18 12,6 20,16" />
      <circle cx="4" cy="18" r="2" fill="currentColor" />
      <circle cx="12" cy="6" r="2" fill="currentColor" />
      <circle cx="20" cy="16" r="2" fill="currentColor" />
    </svg>
  )
}

function PolygonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,3 3,20 21,20" />
    </svg>
  )
}

function SymbolIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" />
      <circle cx="12" cy="9" r="2.5" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

export const DRAW_MODE_ICONS: Record<DrawMode, () => ReactElement> = {
  point: PointIcon,
  line: LineIcon,
  polygon: PolygonIcon,
  symbol: SymbolIcon,
}
