import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FinalizeButton } from '../FinalizeButton'

describe('FinalizeButton', () => {
  it('renders correctly with default title', () => {
    render(<FinalizeButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('描画を確定')
    expect(btn).not.toBeNull()
    expect(btn.tagName).toBe('BUTTON')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<FinalizeButton disabled={false} onClick={onClick} />)
    fireEvent.click(screen.getByTitle('描画を確定'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<FinalizeButton disabled={true} onClick={vi.fn()} />)
    const btn = screen.getByTitle('描画を確定') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.className).toContain('draw-control-panel__action-button--disabled')
  })

  it('is enabled when disabled prop is false', () => {
    render(<FinalizeButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('描画を確定') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.className).not.toContain('draw-control-panel__action-button--disabled')
  })

  it('applies custom className', () => {
    render(<FinalizeButton disabled={false} onClick={vi.fn()} className="my-custom-class" />)
    const btn = screen.getByTitle('描画を確定')
    expect(btn.className).toContain('my-custom-class')
  })

  it('applies custom title', () => {
    render(<FinalizeButton disabled={false} onClick={vi.fn()} title="Custom Finalize" />)
    const btn = screen.getByTitle('Custom Finalize')
    expect(btn).not.toBeNull()
  })

  it('has --confirm modifier class', () => {
    render(<FinalizeButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('描画を確定')
    expect(btn.className).toContain('draw-control-panel__action-button--confirm')
  })

  it('has drawing-engine-button class for standalone usage', () => {
    render(<FinalizeButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('描画を確定')
    expect(btn.className).toContain('drawing-engine-button')
  })

  it('renders an SVG icon', () => {
    const { container } = render(<FinalizeButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })
})
