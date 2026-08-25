import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DrawControlPanel } from '../DrawControlPanel'
import type { DrawControlPanelProps } from '../DrawControlPanel'

function makeProps(overrides: Partial<DrawControlPanelProps> = {}): DrawControlPanelProps {
  return {
    drawMode: null,
    isDrawingPath: false,
    canFinalizeDraft: false,
    hasSelectedFeature: false,
    selectedCount: 0,
    canUndo: false,
    canRedo: false,
    onChangeMode: vi.fn(),
    onFinalize: vi.fn(),
    onDeleteFeature: vi.fn(),
    onResetGeoJSON: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    ...overrides,
  }
}

function panelOf(container: HTMLElement): HTMLElement {
  const el = container.querySelector('.draw-control-panel')
  expect(el).not.toBeNull()
  return el as HTMLElement
}

describe('DrawControlPanel の外観', () => {
  it('appearance を指定しない場合は light になる', () => {
    const { container } = render(<DrawControlPanel {...makeProps()} />)
    expect(panelOf(container).getAttribute('data-de-appearance')).toBe('light')
  })

  it.each(['light', 'dark', 'glass', 'auto'] as const)('appearance="%s" が属性に反映される', (appearance) => {
    const { container } = render(<DrawControlPanel {...makeProps({ appearance })} />)
    expect(panelOf(container).getAttribute('data-de-appearance')).toBe(appearance)
  })

  it('外観を切り替えても操作ボタンが失われない', () => {
    const { container, rerender } = render(<DrawControlPanel {...makeProps({ appearance: 'light' })} />)
    const before = container.querySelectorAll('button').length
    rerender(<DrawControlPanel {...makeProps({ appearance: 'dark' })} />)
    expect(container.querySelectorAll('button').length).toBe(before)
    expect(panelOf(container).getAttribute('data-de-appearance')).toBe('dark')
  })

  it('デザインシステムの data-theme 属性は使わない', () => {
    const { container } = render(<DrawControlPanel {...makeProps({ appearance: 'dark' })} />)
    expect(panelOf(container).hasAttribute('data-theme')).toBe(false)
  })
})
