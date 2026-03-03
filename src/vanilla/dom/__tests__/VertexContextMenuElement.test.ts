import { describe, it, expect, vi, afterEach } from 'vitest'
import { VertexContextMenuElement } from '../VertexContextMenuElement'

describe('VertexContextMenuElement', () => {
  let menu: VertexContextMenuElement | null = null

  afterEach(() => {
    if (menu) {
      menu.destroy()
      menu = null
    }
  })

  it('creates menu at correct position', () => {
    menu = new VertexContextMenuElement({
      position: { x: 100, y: 200 },
      canDelete: true,
      onDelete: vi.fn(),
      onClose: vi.fn(),
    })
    expect(menu.element.style.left).toBe('100px')
    expect(menu.element.style.top).toBe('200px')
  })

  it('has correct class name', () => {
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: true,
      onDelete: vi.fn(),
      onClose: vi.fn(),
    })
    expect(menu.element.className).toBe('vertex-context-menu')
  })

  it('delete button works when canDelete is true', () => {
    const onDelete = vi.fn()
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: true,
      onDelete,
      onClose: vi.fn(),
    })
    const btn = menu.element.querySelector('button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.className).toBe('vertex-context-menu__item')
    expect(btn.title).toBe('この頂点を削除')
    expect(btn.textContent).toBe('この頂点を削除')
    btn.click()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('delete button is disabled when canDelete is false', () => {
    const onDelete = vi.fn()
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: false,
      onDelete,
      onClose: vi.fn(),
    })
    const btn = menu.element.querySelector('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.className).toBe('vertex-context-menu__item vertex-context-menu__item--disabled')
    expect(btn.title).toBe('頂点が少なすぎるため削除できません')
    // Use dispatchEvent to force the click handler to run even on a disabled button
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('delete button has type=button', () => {
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: true,
      onDelete: vi.fn(),
      onClose: vi.fn(),
    })
    const btn = menu.element.querySelector('button') as HTMLButtonElement
    expect(btn.type).toBe('button')
  })

  it('outside click calls onClose', () => {
    const onClose = vi.fn()
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: true,
      onDelete: vi.fn(),
      onClose,
    })
    document.body.appendChild(menu.element)

    // Click outside the menu
    const outsideClick = new MouseEvent('mousedown', { bubbles: true })
    document.body.dispatchEvent(outsideClick)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('click inside menu does not call onClose', () => {
    const onClose = vi.fn()
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: true,
      onDelete: vi.fn(),
      onClose,
    })
    document.body.appendChild(menu.element)

    const insideClick = new MouseEvent('mousedown', { bubbles: true })
    menu.element.dispatchEvent(insideClick)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('escape key calls onClose', () => {
    const onClose = vi.fn()
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: true,
      onDelete: vi.fn(),
      onClose,
    })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('non-escape key does not call onClose', () => {
    const onClose = vi.fn()
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: true,
      onDelete: vi.fn(),
      onClose,
    })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('destroy() removes event listeners', () => {
    const onClose = vi.fn()
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: true,
      onDelete: vi.fn(),
      onClose,
    })
    document.body.appendChild(menu.element)

    menu.destroy()
    menu = null // prevent afterEach from calling destroy again

    // After destroy, outside click should not trigger onClose
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(onClose).not.toHaveBeenCalled()

    // Escape should not trigger onClose
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('destroy() removes element from DOM', () => {
    menu = new VertexContextMenuElement({
      position: { x: 0, y: 0 },
      canDelete: true,
      onDelete: vi.fn(),
      onClose: vi.fn(),
    })
    document.body.appendChild(menu.element)
    expect(document.body.contains(menu.element)).toBe(true)

    menu.destroy()
    expect(document.body.contains(menu.element)).toBe(false)
    menu = null
  })
})
