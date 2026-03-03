import { describe, it, expect, vi } from 'vitest'
import { DrawModeSelectorElement } from '../DrawModeSelectorElement'

describe('DrawModeSelectorElement', () => {
  it('creates 4 buttons', () => {
    const onChange = vi.fn()
    const selector = new DrawModeSelectorElement(onChange)
    const buttons = selector.element.querySelectorAll('button')
    expect(buttons).toHaveLength(4)
  })

  it('root element has correct class', () => {
    const selector = new DrawModeSelectorElement(vi.fn())
    expect(selector.element.className).toBe('draw-mode-selector')
  })

  it('each button has aria-label and title', () => {
    const selector = new DrawModeSelectorElement(vi.fn())
    const buttons = selector.element.querySelectorAll('button')

    const expectedLabels = ['ポイント', 'ライン', 'ポリゴン', 'シンボル']
    buttons.forEach((btn, i) => {
      expect(btn.getAttribute('aria-label')).toBe(expectedLabels[i])
      expect(btn.title).toBeTruthy()
    })
  })

  it('each button has data-mode attribute', () => {
    const selector = new DrawModeSelectorElement(vi.fn())
    const buttons = selector.element.querySelectorAll('button')
    const expectedModes = ['point', 'line', 'polygon', 'symbol']
    buttons.forEach((btn, i) => {
      expect(btn.dataset.mode).toBe(expectedModes[i])
    })
  })

  it('each button contains an SVG icon', () => {
    const selector = new DrawModeSelectorElement(vi.fn())
    const buttons = selector.element.querySelectorAll('button')
    buttons.forEach((btn) => {
      expect(btn.querySelector('svg')).not.toBeNull()
    })
  })

  it('each button has type=button', () => {
    const selector = new DrawModeSelectorElement(vi.fn())
    const buttons = selector.element.querySelectorAll('button')
    buttons.forEach((btn) => {
      expect(btn.type).toBe('button')
    })
  })

  it('buttons have aria-pressed="false" by default', () => {
    const selector = new DrawModeSelectorElement(vi.fn())
    const buttons = selector.element.querySelectorAll('button')
    buttons.forEach((btn) => {
      expect(btn.getAttribute('aria-pressed')).toBe('false')
    })
  })

  it('update() toggles aria-pressed', () => {
    const selector = new DrawModeSelectorElement(vi.fn())
    const buttons = selector.element.querySelectorAll('button')

    selector.update('point')
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true')
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false')
    expect(buttons[2].getAttribute('aria-pressed')).toBe('false')
    expect(buttons[3].getAttribute('aria-pressed')).toBe('false')

    selector.update(null)
    buttons.forEach((btn) => {
      expect(btn.getAttribute('aria-pressed')).toBe('false')
    })
  })

  it('update() toggles selected class', () => {
    const selector = new DrawModeSelectorElement(vi.fn())
    const buttons = selector.element.querySelectorAll('button')

    selector.update('point')
    expect(buttons[0].className).toBe('draw-mode-selector__button draw-mode-selector__button--selected')
    expect(buttons[1].className).toBe('draw-mode-selector__button')
    expect(buttons[2].className).toBe('draw-mode-selector__button')
    expect(buttons[3].className).toBe('draw-mode-selector__button')

    selector.update('polygon')
    expect(buttons[0].className).toBe('draw-mode-selector__button')
    expect(buttons[2].className).toBe('draw-mode-selector__button draw-mode-selector__button--selected')
  })

  it('update(null) deselects all', () => {
    const selector = new DrawModeSelectorElement(vi.fn())
    const buttons = selector.element.querySelectorAll('button')

    selector.update('line')
    selector.update(null)
    buttons.forEach((btn) => {
      expect(btn.className).toBe('draw-mode-selector__button')
    })
  })

  it('click fires onChange with mode when not selected', () => {
    const onChange = vi.fn()
    const selector = new DrawModeSelectorElement(onChange)
    const buttons = selector.element.querySelectorAll('button')

    buttons[1].click() // line
    expect(onChange).toHaveBeenCalledWith('line')
  })

  it('click fires onChange with null when clicking already selected mode', () => {
    const onChange = vi.fn()
    const selector = new DrawModeSelectorElement(onChange)
    const buttons = selector.element.querySelectorAll('button')

    // First, set the selected mode via update
    selector.update('line')
    buttons[1].click() // line is already selected
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('click fires onChange with mode when clicking a different mode', () => {
    const onChange = vi.fn()
    const selector = new DrawModeSelectorElement(onChange)
    const buttons = selector.element.querySelectorAll('button')

    selector.update('point')
    buttons[2].click() // polygon, different from selected point
    expect(onChange).toHaveBeenCalledWith('polygon')
  })
})
