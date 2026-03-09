import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteButton } from '../DeleteButton'

describe('DeleteButton', () => {
  it('renders correctly with default title', () => {
    render(<DeleteButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '選択した図形を削除' })
    expect(btn).not.toBeNull()
    expect(btn.tagName).toBe('BUTTON')
  })

  it('has aria-label matching the title', () => {
    render(<DeleteButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByLabelText('選択した図形を削除')
    expect(btn).not.toBeNull()
  })

  it('has aria-label matching custom title', () => {
    render(<DeleteButton disabled={false} onClick={vi.fn()} title="Custom Delete" />)
    const btn = screen.getByLabelText('Custom Delete')
    expect(btn).not.toBeNull()
  })

  it('marks SVG as decorative with aria-hidden', () => {
    const { container } = render(<DeleteButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('focusable')).toBe('false')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<DeleteButton disabled={false} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: '選択した図形を削除' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<DeleteButton disabled onClick={onClick} />)
    const button = screen.getByRole('button', { name: '選択した図形を削除' })
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<DeleteButton disabled={true} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '選択した図形を削除' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.className).toContain('draw-control-panel__action-button--disabled')
  })

  it('is enabled when disabled prop is false', () => {
    render(<DeleteButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '選択した図形を削除' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.className).not.toContain('draw-control-panel__action-button--disabled')
  })

  it('applies custom className', () => {
    render(<DeleteButton disabled={false} onClick={vi.fn()} className="my-custom-class" />)
    const btn = screen.getByRole('button', { name: '選択した図形を削除' })
    expect(btn.className).toContain('my-custom-class')
  })

  it('applies custom title', () => {
    render(<DeleteButton disabled={false} onClick={vi.fn()} title="Custom Delete" />)
    const btn = screen.getByRole('button', { name: 'Custom Delete' })
    expect(btn).not.toBeNull()
  })

  it('has --delete modifier class', () => {
    render(<DeleteButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '選択した図形を削除' })
    expect(btn.className).toContain('draw-control-panel__action-button--delete')
  })

  it('has drawing-engine-button class for standalone usage', () => {
    render(<DeleteButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '選択した図形を削除' })
    expect(btn.className).toContain('drawing-engine-button')
  })

  it('renders an SVG icon', () => {
    const { container } = render(<DeleteButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })
})
