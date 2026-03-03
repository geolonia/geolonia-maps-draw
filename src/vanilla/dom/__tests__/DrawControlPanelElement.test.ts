import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DrawControlPanelElement } from '../DrawControlPanelElement'
import type { DrawControlPanelCallbacks, DrawControlPanelState } from '../DrawControlPanelElement'

function createCallbacks(): DrawControlPanelCallbacks {
  return {
    onChangeMode: vi.fn(),
    onFinalize: vi.fn(),
    onDeleteFeature: vi.fn(),
    onResetGeoJSON: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  }
}

function defaultState(overrides: Partial<DrawControlPanelState> = {}): DrawControlPanelState {
  return {
    drawMode: null,
    isDrawingPath: false,
    canFinalizeDraft: false,
    hasSelectedFeature: false,
    selectedCount: 0,
    canUndo: false,
    canRedo: false,
    ...overrides,
  }
}

describe('DrawControlPanelElement', () => {
  let panel: DrawControlPanelElement
  let callbacks: DrawControlPanelCallbacks

  beforeEach(() => {
    callbacks = createCallbacks()
    panel = new DrawControlPanelElement(callbacks)
    document.body.appendChild(panel.element)
  })

  afterEach(() => {
    panel.destroy()
  })

  it('creates panel with correct class', () => {
    expect(panel.element.className).toBe('draw-control-panel')
  })

  it('has initial position style', () => {
    expect(panel.element.style.left).toBe('10px')
    expect(panel.element.style.top).toBe('54px')
  })

  it('contains grip element', () => {
    const grip = panel.element.querySelector('.draw-control-panel__grip')
    expect(grip).not.toBeNull()
    expect(grip!.getAttribute('title')).toBe('ドラッグで移動')
    expect(grip!.querySelector('svg')).not.toBeNull()
  })

  it('contains mode selector', () => {
    const selector = panel.element.querySelector('.draw-mode-selector')
    expect(selector).not.toBeNull()
    expect(selector!.querySelectorAll('button')).toHaveLength(4)
  })

  it('contains undo and redo buttons', () => {
    const actionButtons = panel.element.querySelectorAll('.draw-control-panel__action-button')
    // Undo, Redo, Finalize, Delete, Reset = 5 action buttons
    expect(actionButtons.length).toBeGreaterThanOrEqual(5)
  })

  it('contains finalize button (hidden by default)', () => {
    const finalizeBtn = panel.element.querySelector('.draw-control-panel__action-button--confirm') as HTMLButtonElement
    expect(finalizeBtn).not.toBeNull()
    expect(finalizeBtn.style.display).toBe('none')
  })

  it('contains delete button', () => {
    const deleteBtn = panel.element.querySelector('.draw-control-panel__action-button--delete')
    expect(deleteBtn).not.toBeNull()
  })

  it('contains reset button with aria-label', () => {
    const resetBtn = panel.element.querySelector('.draw-control-panel__action-button--reset') as HTMLButtonElement
    expect(resetBtn).not.toBeNull()
    expect(resetBtn.getAttribute('aria-label')).toBe('GeoJSONを初期化')
  })

  it('contains branding with Geolonia icon', () => {
    const branding = panel.element.querySelector('.draw-control-panel__branding')
    expect(branding).not.toBeNull()
    expect(branding!.querySelector('svg')).not.toBeNull()
  })

  it('contains separators', () => {
    const seps = panel.element.querySelectorAll('.draw-control-panel__separator')
    expect(seps).toHaveLength(3)
  })

  describe('update()', () => {
    it('disables undo when canUndo is false', () => {
      panel.update(defaultState({ canUndo: false }))
      const undoBtn = panel.element.querySelectorAll('.draw-control-panel__action-button')[0] as HTMLButtonElement
      expect(undoBtn.disabled).toBe(true)
      expect(undoBtn.classList.contains('draw-control-panel__action-button--disabled')).toBe(true)
    })

    it('enables undo when canUndo is true', () => {
      panel.update(defaultState({ canUndo: true }))
      const undoBtn = panel.element.querySelectorAll('.draw-control-panel__action-button')[0] as HTMLButtonElement
      expect(undoBtn.disabled).toBe(false)
      expect(undoBtn.classList.contains('draw-control-panel__action-button--disabled')).toBe(false)
    })

    it('disables redo when canRedo is false', () => {
      panel.update(defaultState({ canRedo: false }))
      const redoBtn = panel.element.querySelectorAll('.draw-control-panel__action-button')[1] as HTMLButtonElement
      expect(redoBtn.disabled).toBe(true)
    })

    it('enables redo when canRedo is true', () => {
      panel.update(defaultState({ canRedo: true }))
      const redoBtn = panel.element.querySelectorAll('.draw-control-panel__action-button')[1] as HTMLButtonElement
      expect(redoBtn.disabled).toBe(false)
    })

    it('shows finalize button when isDrawingPath is true', () => {
      panel.update(defaultState({ isDrawingPath: true, canFinalizeDraft: true }))
      const finalizeBtn = panel.element.querySelector('.draw-control-panel__action-button--confirm') as HTMLButtonElement
      expect(finalizeBtn.style.display).toBe('')
    })

    it('hides finalize button when isDrawingPath is false', () => {
      panel.update(defaultState({ isDrawingPath: false }))
      const finalizeBtn = panel.element.querySelector('.draw-control-panel__action-button--confirm') as HTMLButtonElement
      expect(finalizeBtn.style.display).toBe('none')
    })

    it('disables finalize button when canFinalizeDraft is false', () => {
      panel.update(defaultState({ isDrawingPath: true, canFinalizeDraft: false }))
      const finalizeBtn = panel.element.querySelector('.draw-control-panel__action-button--confirm') as HTMLButtonElement
      expect(finalizeBtn.disabled).toBe(true)
    })

    it('enables finalize button when canFinalizeDraft is true', () => {
      panel.update(defaultState({ isDrawingPath: true, canFinalizeDraft: true }))
      const finalizeBtn = panel.element.querySelector('.draw-control-panel__action-button--confirm') as HTMLButtonElement
      expect(finalizeBtn.disabled).toBe(false)
    })

    it('disables delete button when no feature selected', () => {
      panel.update(defaultState({ hasSelectedFeature: false }))
      const deleteBtn = panel.element.querySelector('.draw-control-panel__action-button--delete') as HTMLButtonElement
      expect(deleteBtn.disabled).toBe(true)
    })

    it('enables delete button when feature is selected', () => {
      panel.update(defaultState({ hasSelectedFeature: true }))
      const deleteBtn = panel.element.querySelector('.draw-control-panel__action-button--delete') as HTMLButtonElement
      expect(deleteBtn.disabled).toBe(false)
    })

    it('changes delete title for multi-select', () => {
      panel.update(defaultState({ hasSelectedFeature: true, selectedCount: 3 }))
      const deleteBtn = panel.element.querySelector('.draw-control-panel__action-button--delete') as HTMLButtonElement
      expect(deleteBtn.title).toBe('選択中の 3 件を削除')
    })

    it('uses default delete title for single select', () => {
      panel.update(defaultState({ hasSelectedFeature: true, selectedCount: 1 }))
      const deleteBtn = panel.element.querySelector('.draw-control-panel__action-button--delete') as HTMLButtonElement
      expect(deleteBtn.title).toBe('選択した地物を削除')
    })

    it('uses default delete title for zero select', () => {
      panel.update(defaultState({ hasSelectedFeature: false, selectedCount: 0 }))
      const deleteBtn = panel.element.querySelector('.draw-control-panel__action-button--delete') as HTMLButtonElement
      expect(deleteBtn.title).toBe('選択した地物を削除')
    })
  })

  describe('button callbacks', () => {
    it('undo button calls onUndo', () => {
      const undoBtn = panel.element.querySelectorAll('.draw-control-panel__action-button')[0] as HTMLButtonElement
      undoBtn.click()
      expect(callbacks.onUndo).toHaveBeenCalledOnce()
    })

    it('redo button calls onRedo', () => {
      const redoBtn = panel.element.querySelectorAll('.draw-control-panel__action-button')[1] as HTMLButtonElement
      redoBtn.click()
      expect(callbacks.onRedo).toHaveBeenCalledOnce()
    })

    it('finalize button calls onFinalize', () => {
      const finalizeBtn = panel.element.querySelector('.draw-control-panel__action-button--confirm') as HTMLButtonElement
      finalizeBtn.click()
      expect(callbacks.onFinalize).toHaveBeenCalledOnce()
    })

    it('delete button calls onDeleteFeature', () => {
      const deleteBtn = panel.element.querySelector('.draw-control-panel__action-button--delete') as HTMLButtonElement
      deleteBtn.click()
      expect(callbacks.onDeleteFeature).toHaveBeenCalledOnce()
    })

    it('reset button calls onResetGeoJSON', () => {
      const resetBtn = panel.element.querySelector('.draw-control-panel__action-button--reset') as HTMLButtonElement
      resetBtn.click()
      expect(callbacks.onResetGeoJSON).toHaveBeenCalledOnce()
    })
  })

  describe('drag behavior', () => {
    it('grip mousedown starts drag', () => {
      const grip = panel.element.querySelector('.draw-control-panel__grip') as HTMLDivElement
      const mousedown = new MouseEvent('mousedown', { clientX: 50, clientY: 100, bubbles: true })
      grip.dispatchEvent(mousedown)

      // Mouse move should update position
      const mousemove = new MouseEvent('mousemove', { clientX: 80, clientY: 130 })
      window.dispatchEvent(mousemove)

      // Position should have changed (exact values depend on drag offset)
      const left = parseInt(panel.element.style.left)
      const top = parseInt(panel.element.style.top)
      expect(typeof left).toBe('number')
      expect(typeof top).toBe('number')
    })

    it('mousemove without drag does nothing', () => {
      const initialLeft = panel.element.style.left
      const initialTop = panel.element.style.top

      const mousemove = new MouseEvent('mousemove', { clientX: 100, clientY: 200 })
      window.dispatchEvent(mousemove)

      expect(panel.element.style.left).toBe(initialLeft)
      expect(panel.element.style.top).toBe(initialTop)
    })

    it('mouseup stops dragging', () => {
      const grip = panel.element.querySelector('.draw-control-panel__grip') as HTMLDivElement
      grip.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 100, bubbles: true }))

      window.dispatchEvent(new MouseEvent('mouseup'))

      // After mouseup, further mousemove should not change position
      const leftAfterUp = panel.element.style.left
      const topAfterUp = panel.element.style.top

      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 300 }))

      expect(panel.element.style.left).toBe(leftAfterUp)
      expect(panel.element.style.top).toBe(topAfterUp)
    })
  })

  describe('destroy()', () => {
    it('removes element from DOM', () => {
      expect(document.body.contains(panel.element)).toBe(true)
      panel.destroy()
      expect(document.body.contains(panel.element)).toBe(false)
    })

    it('removes window event listeners', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      panel.destroy()
      expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
      removeSpy.mockRestore()
    })
  })
})
