import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UndoButton } from '../UndoButton'

describe('UndoButton', () => {
  it('renders correctly with default title', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('元に戻す (Ctrl+Z)')
    expect(btn).not.toBeNull()
    expect(btn.tagName).toBe('BUTTON')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<UndoButton disabled={false} onClick={onClick} />)
    fireEvent.click(screen.getByTitle('元に戻す (Ctrl+Z)'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<UndoButton disabled={true} onClick={vi.fn()} />)
    const btn = screen.getByTitle('元に戻す (Ctrl+Z)') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.className).toContain('draw-control-panel__action-button--disabled')
  })

  it('is enabled when disabled prop is false', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('元に戻す (Ctrl+Z)') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.className).not.toContain('draw-control-panel__action-button--disabled')
  })

  it('applies custom className', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} className="my-custom-class" />)
    const btn = screen.getByTitle('元に戻す (Ctrl+Z)')
    expect(btn.className).toContain('my-custom-class')
  })

  it('applies custom title', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} title="Custom Undo" />)
    const btn = screen.getByTitle('Custom Undo')
    expect(btn).not.toBeNull()
  })

  it('has drawing-engine-button class for standalone usage', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('元に戻す (Ctrl+Z)')
    expect(btn.className).toContain('drawing-engine-button')
  })

  it('has draw-control-panel__action-button base class', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('元に戻す (Ctrl+Z)')
    expect(btn.className).toContain('draw-control-panel__action-button')
  })

  it('renders an SVG icon', () => {
    const { container } = render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })
})
