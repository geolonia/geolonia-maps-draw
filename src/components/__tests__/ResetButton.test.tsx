import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResetButton } from '../ResetButton'

describe('ResetButton', () => {
  const originalConfirm = window.confirm

  beforeEach(() => {
    window.confirm = vi.fn()
  })

  afterEach(() => {
    window.confirm = originalConfirm
  })

  it('renders correctly with default title', () => {
    render(<ResetButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('すべてリセット')
    expect(btn).not.toBeNull()
    expect(btn.tagName).toBe('BUTTON')
  })

  it('has aria-label matching the title', () => {
    render(<ResetButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByLabelText('すべてリセット')
    expect(btn).not.toBeNull()
  })

  it('has aria-label matching custom title', () => {
    render(<ResetButton disabled={false} onClick={vi.fn()} title="Custom Reset" />)
    const btn = screen.getByLabelText('Custom Reset')
    expect(btn).not.toBeNull()
  })

  it('marks SVG as decorative with aria-hidden', () => {
    const { container } = render(<ResetButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('focusable')).toBe('false')
  })

  describe('confirm dialog behavior', () => {
    it('shows confirm dialog when clicked (showConfirm defaults to true)', () => {
      const onClick = vi.fn()
      vi.mocked(window.confirm).mockReturnValue(true)
      render(<ResetButton disabled={false} onClick={onClick} />)
      fireEvent.click(screen.getByTitle('すべてリセット'))
      expect(window.confirm).toHaveBeenCalledWith('すべてのデータをリセットしますか？')
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when confirm is cancelled', () => {
      const onClick = vi.fn()
      vi.mocked(window.confirm).mockReturnValue(false)
      render(<ResetButton disabled={false} onClick={onClick} />)
      fireEvent.click(screen.getByTitle('すべてリセット'))
      expect(window.confirm).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('shows custom confirm message', () => {
      vi.mocked(window.confirm).mockReturnValue(true)
      render(<ResetButton disabled={false} onClick={vi.fn()} confirmMessage="Are you sure?" />)
      fireEvent.click(screen.getByTitle('すべてリセット'))
      expect(window.confirm).toHaveBeenCalledWith('Are you sure?')
    })

    it('skips confirm dialog when showConfirm is false', () => {
      const onClick = vi.fn()
      render(<ResetButton disabled={false} onClick={onClick} showConfirm={false} />)
      fireEvent.click(screen.getByTitle('すべてリセット'))
      expect(window.confirm).not.toHaveBeenCalled()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<ResetButton disabled onClick={onClick} />)
    const button = screen.getByTitle('すべてリセット')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<ResetButton disabled={true} onClick={vi.fn()} />)
    const btn = screen.getByTitle('すべてリセット') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.className).toContain('draw-control-panel__action-button--disabled')
  })

  it('is enabled when disabled prop is false', () => {
    render(<ResetButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('すべてリセット') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.className).not.toContain('draw-control-panel__action-button--disabled')
  })

  it('applies custom className', () => {
    render(<ResetButton disabled={false} onClick={vi.fn()} className="my-custom-class" />)
    const btn = screen.getByTitle('すべてリセット')
    expect(btn.className).toContain('my-custom-class')
  })

  it('applies custom title', () => {
    render(<ResetButton disabled={false} onClick={vi.fn()} title="Custom Reset" />)
    const btn = screen.getByTitle('Custom Reset')
    expect(btn).not.toBeNull()
  })

  it('has --reset modifier class', () => {
    render(<ResetButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('すべてリセット')
    expect(btn.className).toContain('draw-control-panel__action-button--reset')
  })

  it('has drawing-engine-button class for standalone usage', () => {
    render(<ResetButton disabled={false} onClick={vi.fn()} />)
    const btn = screen.getByTitle('すべてリセット')
    expect(btn.className).toContain('drawing-engine-button')
  })

  it('renders an SVG icon', () => {
    const { container } = render(<ResetButton disabled={false} onClick={vi.fn()} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })
})
