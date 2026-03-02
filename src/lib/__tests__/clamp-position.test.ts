import { describe, it, expect } from 'vitest'
import { clampPosition } from '../clamp-position'

const panel = { width: 68, height: 200 }
const viewport = { width: 1280, height: 720 }

describe('clampPosition', () => {
  it('範囲内の座標はそのまま返す', () => {
    expect(clampPosition({ x: 100, y: 100 }, panel, viewport)).toEqual({ x: 100, y: 100 })
  })

  it('x が負の場合 0 にクランプする', () => {
    expect(clampPosition({ x: -50, y: 100 }, panel, viewport)).toEqual({ x: 0, y: 100 })
  })

  it('y が負の場合 0 にクランプする', () => {
    expect(clampPosition({ x: 100, y: -30 }, panel, viewport)).toEqual({ x: 100, y: 0 })
  })

  it('x がビューポート右端を超える場合、右端にクランプする', () => {
    const result = clampPosition({ x: 1300, y: 100 }, panel, viewport)
    expect(result).toEqual({ x: viewport.width - panel.width, y: 100 })
  })

  it('y がビューポート下端を超える場合、下端にクランプする', () => {
    const result = clampPosition({ x: 100, y: 800 }, panel, viewport)
    expect(result).toEqual({ x: 100, y: viewport.height - panel.height })
  })

  it('両方向で同時にクランプできる', () => {
    const result = clampPosition({ x: -10, y: 900 }, panel, viewport)
    expect(result).toEqual({ x: 0, y: viewport.height - panel.height })
  })

  it('ちょうど境界の位置はそのまま返す', () => {
    const edgeX = viewport.width - panel.width
    const edgeY = viewport.height - panel.height
    expect(clampPosition({ x: edgeX, y: edgeY }, panel, viewport)).toEqual({ x: edgeX, y: edgeY })
  })
})
