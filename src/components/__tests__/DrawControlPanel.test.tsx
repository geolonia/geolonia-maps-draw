import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DrawControlPanel } from '../DrawControlPanel'
import type { DrawControlPanelProps } from '../DrawControlPanel'

function makeProps(overrides: Partial<DrawControlPanelProps> = {}): DrawControlPanelProps {
  return {
    drawMode: null,
    isDrawingPath: false,
    canFinalizeDraft: false,
    hasSelectedFeature: false,
    selectedCount: 0,
    canUndo: false,
    canRedo: false,
    onChangeMode: vi.fn(),
    onFinalize: vi.fn(),
    onDeleteFeature: vi.fn(),
    onResetGeoJSON: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    ...overrides,
  }
}

describe('DrawControlPanel', () => {
  let originalInnerWidth: number
  let originalInnerHeight: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true, configurable: true })
  })

  it('renders with default props', () => {
    const props = makeProps()
    const { container } = render(<DrawControlPanel {...props} />)
    const panel = container.querySelector('.draw-control-panel')
    expect(panel).not.toBeNull()
  })

  it('panel is positioned at the initial position', () => {
    const props = makeProps()
    const { container } = render(<DrawControlPanel {...props} />)
    const panel = container.querySelector('.draw-control-panel')
    expect(panel!.getAttribute('style')).toContain('left: 10px')
    expect(panel!.getAttribute('style')).toContain('top: 54px')
  })

  it('renders the grip handle with the correct title', () => {
    const props = makeProps()
    render(<DrawControlPanel {...props} />)
    const grip = screen.getByTitle('ドラッグで移動')
    expect(grip).not.toBeNull()
    expect(grip.className).toContain('draw-control-panel__grip')
  })

  it('renders DrawModeSelector inside the panel', () => {
    const props = makeProps()
    const { container } = render(<DrawControlPanel {...props} />)
    const selector = container.querySelector('.draw-mode-selector')
    expect(selector).not.toBeNull()
  })

  describe('undo/redo buttons', () => {
    it('undo button is disabled when canUndo is false', () => {
      const props = makeProps({ canUndo: false })
      render(<DrawControlPanel {...props} />)
      const undoBtn = screen.getByTitle('元に戻す (Ctrl+Z)') as HTMLButtonElement
      expect(undoBtn.disabled).toBe(true)
      expect(undoBtn.className).toContain('draw-control-panel__action-button--disabled')
    })

    it('undo button is enabled when canUndo is true', () => {
      const props = makeProps({ canUndo: true })
      render(<DrawControlPanel {...props} />)
      const undoBtn = screen.getByTitle('元に戻す (Ctrl+Z)') as HTMLButtonElement
      expect(undoBtn.disabled).toBe(false)
      expect(undoBtn.className).not.toContain('draw-control-panel__action-button--disabled')
    })

    it('redo button is disabled when canRedo is false', () => {
      const props = makeProps({ canRedo: false })
      render(<DrawControlPanel {...props} />)
      const redoBtn = screen.getByTitle('やり直す (Ctrl+Shift+Z)') as HTMLButtonElement
      expect(redoBtn.disabled).toBe(true)
      expect(redoBtn.className).toContain('draw-control-panel__action-button--disabled')
    })

    it('redo button is enabled when canRedo is true', () => {
      const props = makeProps({ canRedo: true })
      render(<DrawControlPanel {...props} />)
      const redoBtn = screen.getByTitle('やり直す (Ctrl+Shift+Z)') as HTMLButtonElement
      expect(redoBtn.disabled).toBe(false)
      expect(redoBtn.className).not.toContain('draw-control-panel__action-button--disabled')
    })

    it('clicking undo button calls onUndo', () => {
      const onUndo = vi.fn()
      const props = makeProps({ canUndo: true, onUndo })
      render(<DrawControlPanel {...props} />)
      fireEvent.click(screen.getByTitle('元に戻す (Ctrl+Z)'))
      expect(onUndo).toHaveBeenCalledTimes(1)
    })

    it('clicking redo button calls onRedo', () => {
      const onRedo = vi.fn()
      const props = makeProps({ canRedo: true, onRedo })
      render(<DrawControlPanel {...props} />)
      fireEvent.click(screen.getByTitle('やり直す (Ctrl+Shift+Z)'))
      expect(onRedo).toHaveBeenCalledTimes(1)
    })
  })

  describe('delete button', () => {
    it('delete button is disabled when hasSelectedFeature is false', () => {
      const props = makeProps({ hasSelectedFeature: false })
      render(<DrawControlPanel {...props} />)
      const deleteBtn = screen.getByTitle('選択した地物を削除') as HTMLButtonElement
      expect(deleteBtn.disabled).toBe(true)
      expect(deleteBtn.className).toContain('draw-control-panel__action-button--disabled')
    })

    it('delete button is enabled when hasSelectedFeature is true', () => {
      const props = makeProps({ hasSelectedFeature: true, selectedCount: 1 })
      render(<DrawControlPanel {...props} />)
      const deleteBtn = screen.getByTitle('選択した地物を削除') as HTMLButtonElement
      expect(deleteBtn.disabled).toBe(false)
      expect(deleteBtn.className).not.toContain('draw-control-panel__action-button--disabled')
    })

    it('delete button calls onDeleteFeature when clicked', () => {
      const onDeleteFeature = vi.fn()
      const props = makeProps({ hasSelectedFeature: true, selectedCount: 1, onDeleteFeature })
      render(<DrawControlPanel {...props} />)
      fireEvent.click(screen.getByTitle('選択した地物を削除'))
      expect(onDeleteFeature).toHaveBeenCalledTimes(1)
    })

    it('delete button title shows count when selectedCount > 1', () => {
      const props = makeProps({ hasSelectedFeature: true, selectedCount: 3 })
      render(<DrawControlPanel {...props} />)
      const deleteBtn = screen.getByTitle('選択中の 3 件を削除')
      expect(deleteBtn).not.toBeNull()
    })

    it('delete button title is singular when selectedCount <= 1', () => {
      const props = makeProps({ hasSelectedFeature: true, selectedCount: 1 })
      render(<DrawControlPanel {...props} />)
      const deleteBtn = screen.getByTitle('選択した地物を削除')
      expect(deleteBtn).not.toBeNull()
    })

    it('delete button has --delete class', () => {
      const props = makeProps({ hasSelectedFeature: true, selectedCount: 1 })
      render(<DrawControlPanel {...props} />)
      const deleteBtn = screen.getByTitle('選択した地物を削除')
      expect(deleteBtn.className).toContain('draw-control-panel__action-button--delete')
    })
  })

  describe('reset button', () => {
    it('reset button is rendered with correct title', () => {
      const props = makeProps()
      render(<DrawControlPanel {...props} />)
      const resetBtn = screen.getByTitle('GeoJSONを初期化')
      expect(resetBtn).not.toBeNull()
    })

    it('reset button has correct aria-label', () => {
      const props = makeProps()
      render(<DrawControlPanel {...props} />)
      const resetBtn = screen.getByLabelText('GeoJSONを初期化')
      expect(resetBtn).not.toBeNull()
    })

    it('reset button calls onResetGeoJSON when clicked', () => {
      const onResetGeoJSON = vi.fn()
      const props = makeProps({ onResetGeoJSON })
      render(<DrawControlPanel {...props} />)
      fireEvent.click(screen.getByTitle('GeoJSONを初期化'))
      expect(onResetGeoJSON).toHaveBeenCalledTimes(1)
    })

    it('reset button has --reset class', () => {
      const props = makeProps()
      render(<DrawControlPanel {...props} />)
      const resetBtn = screen.getByTitle('GeoJSONを初期化')
      expect(resetBtn.className).toContain('draw-control-panel__action-button--reset')
    })
  })

  describe('finalize button', () => {
    it('finalize button does NOT appear when isDrawingPath is false', () => {
      const props = makeProps({ isDrawingPath: false })
      render(<DrawControlPanel {...props} />)
      const finalizeBtn = screen.queryByTitle('ドラフトを確定')
      expect(finalizeBtn).toBeNull()
    })

    it('finalize button appears when isDrawingPath is true', () => {
      const props = makeProps({ isDrawingPath: true })
      render(<DrawControlPanel {...props} />)
      const finalizeBtn = screen.getByTitle('ドラフトを確定')
      expect(finalizeBtn).not.toBeNull()
    })

    it('finalize button is disabled when canFinalizeDraft is false', () => {
      const props = makeProps({ isDrawingPath: true, canFinalizeDraft: false })
      render(<DrawControlPanel {...props} />)
      const finalizeBtn = screen.getByTitle('ドラフトを確定') as HTMLButtonElement
      expect(finalizeBtn.disabled).toBe(true)
      expect(finalizeBtn.className).toContain('draw-control-panel__action-button--disabled')
    })

    it('finalize button is enabled when canFinalizeDraft is true', () => {
      const props = makeProps({ isDrawingPath: true, canFinalizeDraft: true })
      render(<DrawControlPanel {...props} />)
      const finalizeBtn = screen.getByTitle('ドラフトを確定') as HTMLButtonElement
      expect(finalizeBtn.disabled).toBe(false)
      expect(finalizeBtn.className).not.toContain('draw-control-panel__action-button--disabled')
    })

    it('finalize button has --confirm class', () => {
      const props = makeProps({ isDrawingPath: true, canFinalizeDraft: true })
      render(<DrawControlPanel {...props} />)
      const finalizeBtn = screen.getByTitle('ドラフトを確定')
      expect(finalizeBtn.className).toContain('draw-control-panel__action-button--confirm')
    })

    it('finalize button calls onFinalize when clicked', () => {
      const onFinalize = vi.fn()
      const props = makeProps({ isDrawingPath: true, canFinalizeDraft: true, onFinalize })
      render(<DrawControlPanel {...props} />)
      fireEvent.click(screen.getByTitle('ドラフトを確定'))
      expect(onFinalize).toHaveBeenCalledTimes(1)
    })
  })

  describe('DrawModeSelector integration', () => {
    it('passes drawMode as selectedMode to DrawModeSelector', () => {
      const props = makeProps({ drawMode: 'line' })
      const { container } = render(<DrawControlPanel {...props} />)
      const selectedBtn = container.querySelector('.draw-mode-selector__button--selected')
      expect(selectedBtn).not.toBeNull()
      expect(selectedBtn!.getAttribute('data-mode')).toBe('line')
    })

    it('clicking a mode button in DrawModeSelector calls onChangeMode', () => {
      const onChangeMode = vi.fn()
      const props = makeProps({ onChangeMode })
      render(<DrawControlPanel {...props} />)
      fireEvent.click(screen.getByLabelText('ポリゴン'))
      expect(onChangeMode).toHaveBeenCalledWith('polygon')
    })
  })

  describe('grip drag behavior', () => {
    it('dragging the grip moves the panel', () => {
      const props = makeProps()
      const { container } = render(<DrawControlPanel {...props} />)
      const grip = screen.getByTitle('ドラッグで移動')
      const panel = container.querySelector('.draw-control-panel')!

      // Mock getBoundingClientRect on the panel
      vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
        x: 10,
        y: 54,
        width: 300,
        height: 40,
        top: 54,
        left: 10,
        right: 310,
        bottom: 94,
        toJSON: () => ({}),
      })

      // mousedown on grip at (15, 60) => offset = (15-10, 60-54) = (5, 6)
      fireEvent.mouseDown(grip, { clientX: 15, clientY: 60 })

      // mousemove to (205, 206) => raw = (205-5, 206-6) = (200, 200)
      fireEvent.mouseMove(window, { clientX: 205, clientY: 206 })

      expect(panel.getAttribute('style')).toContain('left: 200px')
      expect(panel.getAttribute('style')).toContain('top: 200px')
    })

    it('mouseup stops the drag', () => {
      const props = makeProps()
      const { container } = render(<DrawControlPanel {...props} />)
      const grip = screen.getByTitle('ドラッグで移動')
      const panel = container.querySelector('.draw-control-panel')!

      vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
        x: 10,
        y: 54,
        width: 300,
        height: 40,
        top: 54,
        left: 10,
        right: 310,
        bottom: 94,
        toJSON: () => ({}),
      })

      // Start drag
      fireEvent.mouseDown(grip, { clientX: 10, clientY: 54 })
      // Move
      fireEvent.mouseMove(window, { clientX: 110, clientY: 154 })
      // Release
      fireEvent.mouseUp(window)
      // Move again - should NOT move the panel
      fireEvent.mouseMove(window, { clientX: 500, clientY: 500 })

      // Should still be at the position from the last move before mouseup
      expect(panel.getAttribute('style')).toContain('left: 110px')
      expect(panel.getAttribute('style')).toContain('top: 154px')
    })

    it('clamps the position to viewport bounds', () => {
      const props = makeProps()
      const { container } = render(<DrawControlPanel {...props} />)
      const grip = screen.getByTitle('ドラッグで移動')
      const panel = container.querySelector('.draw-control-panel')!

      vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
        x: 10,
        y: 54,
        width: 300,
        height: 40,
        top: 54,
        left: 10,
        right: 310,
        bottom: 94,
        toJSON: () => ({}),
      })

      // Start drag
      fireEvent.mouseDown(grip, { clientX: 10, clientY: 54 })
      // Move to a position that would go beyond viewport
      // raw = (2000 - 0, 2000 - 0) = (2000, 2000)
      // clamped x = min(2000, 1024 - 300) = 724
      // clamped y = min(2000, 768 - 40) = 728
      fireEvent.mouseMove(window, { clientX: 2000, clientY: 2000 })

      expect(panel.getAttribute('style')).toContain('left: 724px')
      expect(panel.getAttribute('style')).toContain('top: 728px')
    })

    it('clamps position to 0 when dragged to negative coordinates', () => {
      const props = makeProps()
      const { container } = render(<DrawControlPanel {...props} />)
      const grip = screen.getByTitle('ドラッグで移動')
      const panel = container.querySelector('.draw-control-panel')!

      vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
        x: 10,
        y: 54,
        width: 300,
        height: 40,
        top: 54,
        left: 10,
        right: 310,
        bottom: 94,
        toJSON: () => ({}),
      })

      // Start drag
      fireEvent.mouseDown(grip, { clientX: 10, clientY: 54 })
      // Move to negative
      fireEvent.mouseMove(window, { clientX: -100, clientY: -100 })

      expect(panel.getAttribute('style')).toContain('left: 0px')
      expect(panel.getAttribute('style')).toContain('top: 0px')
    })

    it('mousemove without mousedown does not move the panel', () => {
      const props = makeProps()
      const { container } = render(<DrawControlPanel {...props} />)
      const panel = container.querySelector('.draw-control-panel')!

      // Move without starting drag
      fireEvent.mouseMove(window, { clientX: 500, clientY: 500 })

      // Should remain at initial position
      expect(panel.getAttribute('style')).toContain('left: 10px')
      expect(panel.getAttribute('style')).toContain('top: 54px')
    })

    it('cleans up window event listeners on unmount', () => {
      const props = makeProps()
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = render(<DrawControlPanel {...props} />)
      unmount()

      const removedEvents = removeSpy.mock.calls.map((call) => call[0])
      expect(removedEvents).toContain('mousemove')
      expect(removedEvents).toContain('mouseup')
      removeSpy.mockRestore()
    })
  })

  describe('separators', () => {
    it('renders separator elements', () => {
      const props = makeProps()
      const { container } = render(<DrawControlPanel {...props} />)
      const separators = container.querySelectorAll('.draw-control-panel__separator')
      expect(separators.length).toBe(2)
    })
  })
})
