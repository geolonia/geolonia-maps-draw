import { describe, it, expect } from 'vitest'
import { RubberBandElement } from '../RubberBandElement'

describe('RubberBandElement', () => {
  it('creates a hidden div by default', () => {
    const rb = new RubberBandElement()
    expect(rb.element.tagName).toBe('DIV')
    expect(rb.element.style.display).toBe('none')
  })

  it('has correct initial styles', () => {
    const rb = new RubberBandElement()
    expect(rb.element.style.position).toBe('absolute')
    expect(rb.element.style.border).toBe('2px dashed rgba(26, 115, 232, 0.7)')
    expect(rb.element.style.backgroundColor).toBe('rgba(26, 115, 232, 0.1)')
    expect(rb.element.style.pointerEvents).toBe('none')
    expect(rb.element.style.zIndex).toBe('10')
  })

  it('update(rect) shows and positions the div', () => {
    const rb = new RubberBandElement()
    rb.update({ x: 10, y: 20, width: 100, height: 50 })

    expect(rb.element.style.display).toBe('block')
    expect(rb.element.style.left).toBe('10px')
    expect(rb.element.style.top).toBe('20px')
    expect(rb.element.style.width).toBe('100px')
    expect(rb.element.style.height).toBe('50px')
  })

  it('update(null) hides the div', () => {
    const rb = new RubberBandElement()
    rb.update({ x: 10, y: 20, width: 100, height: 50 })
    expect(rb.element.style.display).toBe('block')

    rb.update(null)
    expect(rb.element.style.display).toBe('none')
  })

  it('can update position multiple times', () => {
    const rb = new RubberBandElement()

    rb.update({ x: 0, y: 0, width: 50, height: 50 })
    expect(rb.element.style.left).toBe('0px')

    rb.update({ x: 100, y: 200, width: 300, height: 400 })
    expect(rb.element.style.left).toBe('100px')
    expect(rb.element.style.top).toBe('200px')
    expect(rb.element.style.width).toBe('300px')
    expect(rb.element.style.height).toBe('400px')
  })

  it('update(null) after null stays hidden', () => {
    const rb = new RubberBandElement()
    rb.update(null)
    expect(rb.element.style.display).toBe('none')
  })
})
