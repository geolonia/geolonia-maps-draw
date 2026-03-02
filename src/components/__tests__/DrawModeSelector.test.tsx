import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DrawModeSelector, DRAW_MODE_TOOLTIPS } from '../DrawModeSelector'
import type { DrawMode } from '../../types'

describe('DrawModeSelector', () => {
  const ALL_MODES: DrawMode[] = ['point', 'line', 'polygon', 'symbol']

  it('renders all 4 mode buttons', () => {
    const onChange = vi.fn()
    const { container } = render(
      <DrawModeSelector selectedMode={null} onChange={onChange} />,
    )
    const buttons = container.querySelectorAll('button')
    expect(buttons).toHaveLength(4)
  })

  it('each button has the correct data-mode attribute', () => {
    const onChange = vi.fn()
    const { container } = render(
      <DrawModeSelector selectedMode={null} onChange={onChange} />,
    )
    for (const mode of ALL_MODES) {
      const btn = container.querySelector(`button[data-mode="${mode}"]`)
      expect(btn).not.toBeNull()
    }
  })

  it('each button has an aria-label with the Japanese label', () => {
    const onChange = vi.fn()
    render(<DrawModeSelector selectedMode={null} onChange={onChange} />)
    expect(screen.getByLabelText('ポイント')).not.toBeNull()
    expect(screen.getByLabelText('ライン')).not.toBeNull()
    expect(screen.getByLabelText('ポリゴン')).not.toBeNull()
    expect(screen.getByLabelText('シンボル')).not.toBeNull()
  })

  it('each button has the correct tooltip from DRAW_MODE_TOOLTIPS', () => {
    const onChange = vi.fn()
    render(<DrawModeSelector selectedMode={null} onChange={onChange} />)
    for (const mode of ALL_MODES) {
      const btn = screen.getByTitle(DRAW_MODE_TOOLTIPS[mode])
      expect(btn).not.toBeNull()
    }
  })

  it('clicking a non-selected mode button calls onChange with that mode', () => {
    const onChange = vi.fn()
    render(<DrawModeSelector selectedMode={null} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('ポイント'))
    expect(onChange).toHaveBeenCalledWith('point')
    fireEvent.click(screen.getByLabelText('ライン'))
    expect(onChange).toHaveBeenCalledWith('line')
    fireEvent.click(screen.getByLabelText('ポリゴン'))
    expect(onChange).toHaveBeenCalledWith('polygon')
    fireEvent.click(screen.getByLabelText('シンボル'))
    expect(onChange).toHaveBeenCalledWith('symbol')
  })

  it('clicking an already selected mode button calls onChange with null (deselect)', () => {
    const onChange = vi.fn()
    render(<DrawModeSelector selectedMode="line" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('ライン'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('selected button has the --selected class', () => {
    const onChange = vi.fn()
    const { container } = render(
      <DrawModeSelector selectedMode="polygon" onChange={onChange} />,
    )
    const polygonBtn = container.querySelector('button[data-mode="polygon"]')
    expect(polygonBtn).not.toBeNull()
    expect(polygonBtn!.className).toContain('draw-mode-selector__button--selected')

    // Other buttons should NOT have --selected
    for (const mode of ALL_MODES) {
      if (mode === 'polygon') continue
      const btn = container.querySelector(`button[data-mode="${mode}"]`)
      expect(btn!.className).not.toContain('draw-mode-selector__button--selected')
    }
  })

  it('non-selected buttons have only the base class', () => {
    const onChange = vi.fn()
    const { container } = render(
      <DrawModeSelector selectedMode={null} onChange={onChange} />,
    )
    const buttons = container.querySelectorAll('button')
    buttons.forEach((btn) => {
      expect(btn.className).toContain('draw-mode-selector__button')
      expect(btn.className).not.toContain('draw-mode-selector__button--selected')
    })
  })

  it('each button renders an SVG icon inside', () => {
    const onChange = vi.fn()
    const { container } = render(
      <DrawModeSelector selectedMode={null} onChange={onChange} />,
    )
    const buttons = container.querySelectorAll('button')
    buttons.forEach((btn) => {
      const svg = btn.querySelector('svg')
      expect(svg).not.toBeNull()
    })
  })

  describe('DRAW_MODE_TOOLTIPS export', () => {
    it('has all 4 modes', () => {
      expect(Object.keys(DRAW_MODE_TOOLTIPS)).toHaveLength(4)
      for (const mode of ALL_MODES) {
        expect(typeof DRAW_MODE_TOOLTIPS[mode]).toBe('string')
        expect(DRAW_MODE_TOOLTIPS[mode].length).toBeGreaterThan(0)
      }
    })

    it('point tooltip describes clicking to add a point', () => {
      expect(DRAW_MODE_TOOLTIPS.point).toContain('ポイント')
    })

    it('line tooltip describes creating a line', () => {
      expect(DRAW_MODE_TOOLTIPS.line).toContain('線')
    })

    it('polygon tooltip describes creating a polygon', () => {
      expect(DRAW_MODE_TOOLTIPS.polygon).toContain('ポリゴン')
    })

    it('symbol tooltip describes placing a symbol', () => {
      expect(DRAW_MODE_TOOLTIPS.symbol).toContain('シンボル')
    })
  })
})
