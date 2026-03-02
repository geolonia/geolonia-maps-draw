import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VertexContextMenu } from '../VertexContextMenu'

describe('VertexContextMenu', () => {
  const defaultProps = {
    position: { x: 100, y: 200 },
    canDelete: true,
    onDelete: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders the menu at the correct position', () => {
    const { container } = render(<VertexContextMenu {...defaultProps} />)
    const menu = container.querySelector('.vertex-context-menu')
    expect(menu).not.toBeNull()
    expect(menu!.getAttribute('style')).toContain('left: 100px')
    expect(menu!.getAttribute('style')).toContain('top: 200px')
  })

  it('renders the delete button with correct text', () => {
    render(<VertexContextMenu {...defaultProps} />)
    const btn = screen.getByText('この頂点を削除')
    expect(btn).not.toBeNull()
    expect(btn.tagName).toBe('BUTTON')
  })

  it('clicking delete button calls onDelete when canDelete is true', () => {
    const onDelete = vi.fn()
    render(
      <VertexContextMenu {...defaultProps} canDelete={true} onDelete={onDelete} />,
    )
    fireEvent.click(screen.getByText('この頂点を削除'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('clicking delete button does NOT call onDelete when canDelete is false', () => {
    const onDelete = vi.fn()
    render(
      <VertexContextMenu {...defaultProps} canDelete={false} onDelete={onDelete} />,
    )
    fireEvent.click(screen.getByText('この頂点を削除'))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('handleDelete returns early when canDelete is false (branch coverage)', () => {
    const onDelete = vi.fn()
    render(
      <VertexContextMenu {...defaultProps} canDelete={false} onDelete={onDelete} />,
    )
    const btn = screen.getByText('この頂点を削除') as HTMLButtonElement
    // React blocks onClick on disabled buttons, so access internal React props
    // to call the handler directly for branch coverage
    const reactPropsKey = Object.keys(btn).find(key => key.startsWith('__reactProps'))
    if (reactPropsKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reactProps = (btn as any)[reactPropsKey]
      reactProps.onClick()
    }
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('delete button is disabled when canDelete is false', () => {
    render(
      <VertexContextMenu {...defaultProps} canDelete={false} />,
    )
    const btn = screen.getByText('この頂点を削除') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('delete button is not disabled when canDelete is true', () => {
    render(
      <VertexContextMenu {...defaultProps} canDelete={true} />,
    )
    const btn = screen.getByText('この頂点を削除') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('delete button has --disabled class when canDelete is false', () => {
    render(
      <VertexContextMenu {...defaultProps} canDelete={false} />,
    )
    const btn = screen.getByText('この頂点を削除')
    expect(btn.className).toContain('vertex-context-menu__item--disabled')
  })

  it('delete button does NOT have --disabled class when canDelete is true', () => {
    render(
      <VertexContextMenu {...defaultProps} canDelete={true} />,
    )
    const btn = screen.getByText('この頂点を削除')
    expect(btn.className).not.toContain('vertex-context-menu__item--disabled')
  })

  it('delete button has appropriate title when canDelete is true', () => {
    render(
      <VertexContextMenu {...defaultProps} canDelete={true} />,
    )
    const btn = screen.getByText('この頂点を削除')
    expect(btn.getAttribute('title')).toBe('この頂点を削除')
  })

  it('delete button has appropriate title when canDelete is false', () => {
    render(
      <VertexContextMenu {...defaultProps} canDelete={false} />,
    )
    const btn = screen.getByText('この頂点を削除')
    expect(btn.getAttribute('title')).toBe('頂点が少なすぎるため削除できません')
  })

  it('clicking outside the menu calls onClose', () => {
    const onClose = vi.fn()
    render(
      <VertexContextMenu {...defaultProps} onClose={onClose} />,
    )
    // Fire mousedown on document body (outside the menu)
    fireEvent.mouseDown(document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the menu does NOT call onClose', () => {
    const onClose = vi.fn()
    const { container } = render(
      <VertexContextMenu {...defaultProps} onClose={onClose} />,
    )
    const menu = container.querySelector('.vertex-context-menu')!
    fireEvent.mouseDown(menu)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('pressing Escape calls onClose', () => {
    const onClose = vi.fn()
    render(
      <VertexContextMenu {...defaultProps} onClose={onClose} />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('pressing a non-Escape key does NOT call onClose', () => {
    const onClose = vi.fn()
    render(
      <VertexContextMenu {...defaultProps} onClose={onClose} />,
    )
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('cleans up event listeners on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <VertexContextMenu {...defaultProps} onClose={onClose} />,
    )
    unmount()
    // After unmount, events should not trigger onClose
    fireEvent.mouseDown(document.body)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
