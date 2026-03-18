import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UndoButton } from '../UndoButton'

describe('UndoButton', () => {
  it('renders as a button element', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '元に戻す (Ctrl+Z)' })
    expect(btn.tagName).toBe('BUTTON')
  })

  it.each([
    ['元に戻す (Ctrl+Z)', {}],
    ['Custom Undo', { title: 'Custom Undo' }],
  ])('has accessible name "%s"', (name, props) => {
    render(<UndoButton disabled={false} onClick={vi.fn()} {...props} />)
    expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.getByLabelText(name)).toBeInTheDocument()
  })

  it('marks SVG as decorative with aria-hidden', () => {
    const { container } = render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('focusable')).toBe('false')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<UndoButton disabled={false} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: '元に戻す (Ctrl+Z)' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<UndoButton disabled onClick={onClick} />)
    const button = screen.getByRole('button', { name: '元に戻す (Ctrl+Z)' })
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<UndoButton disabled={true} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '元に戻す (Ctrl+Z)' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.className).toContain('draw-control-panel__action-button--disabled')
  })

  it('is enabled when disabled prop is false', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '元に戻す (Ctrl+Z)' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.className).not.toContain('draw-control-panel__action-button--disabled')
  })

  it('applies custom className', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} className="my-custom-class" />)
    const btn = screen.getByRole('button', { name: '元に戻す (Ctrl+Z)' })
    expect(btn.className).toContain('my-custom-class')
  })

  it('has drawing-engine-button class for standalone usage', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '元に戻す (Ctrl+Z)' })
    expect(btn.className).toContain('drawing-engine-button')
  })

  it('has draw-control-panel__action-button base class', () => {
    render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '元に戻す (Ctrl+Z)' })
    expect(btn.className).toContain('draw-control-panel__action-button')
  })

  it('renders an SVG icon', () => {
    const { container } = render(<UndoButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
