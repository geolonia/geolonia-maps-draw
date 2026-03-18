import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RedoButton } from '../RedoButton'

describe('RedoButton', () => {
  it('renders as a button element', () => {
    render(<RedoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'やり直す (Ctrl+Shift+Z)' })
    expect(btn.tagName).toBe('BUTTON')
  })

  it.each([
    ['やり直す (Ctrl+Shift+Z)', {}],
    ['Custom Redo', { title: 'Custom Redo' }],
  ])('has accessible name "%s"', (name, props) => {
    render(<RedoButton disabled={false} onClick={vi.fn()} {...props} />)
    expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.getByLabelText(name)).toBeInTheDocument()
  })

  it('marks SVG as decorative with aria-hidden', () => {
    const { container } = render(<RedoButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('focusable')).toBe('false')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<RedoButton disabled={false} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'やり直す (Ctrl+Shift+Z)' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<RedoButton disabled onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'やり直す (Ctrl+Shift+Z)' })
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<RedoButton disabled={true} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'やり直す (Ctrl+Shift+Z)' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.className).toContain('draw-control-panel__action-button--disabled')
  })

  it('is enabled when disabled prop is false', () => {
    render(<RedoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'やり直す (Ctrl+Shift+Z)' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.className).not.toContain('draw-control-panel__action-button--disabled')
  })

  it('applies custom className', () => {
    render(<RedoButton disabled={false} onClick={vi.fn()} className="my-custom-class" />)
    const btn = screen.getByRole('button', { name: 'やり直す (Ctrl+Shift+Z)' })
    expect(btn.className).toContain('my-custom-class')
  })

  it('has drawing-engine-button class for standalone usage', () => {
    render(<RedoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'やり直す (Ctrl+Shift+Z)' })
    expect(btn.className).toContain('drawing-engine-button')
  })

  it('has draw-control-panel__action-button base class', () => {
    render(<RedoButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'やり直す (Ctrl+Shift+Z)' })
    expect(btn.className).toContain('draw-control-panel__action-button')
  })

  it('renders an SVG icon', () => {
    const { container } = render(<RedoButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
