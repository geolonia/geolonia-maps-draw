import type { DrawMode } from '../../types'
import { DrawModeSelectorElement } from './DrawModeSelectorElement'
import {
  createGripIcon,
  createUndoIcon,
  createRedoIcon,
  createCheckIcon,
  createDeleteIcon,
  createResetIcon,
  createGeoloniaIcon,
} from './icons'
import { clampPosition } from '../../lib/clamp-position'

export type DrawControlPanelState = {
  drawMode: DrawMode | null
  isDrawingPath: boolean
  canFinalizeDraft: boolean
  hasSelectedFeature: boolean
  selectedCount: number
  canUndo: boolean
  canRedo: boolean
}

export type DrawControlPanelCallbacks = {
  onChangeMode: (mode: DrawMode | null) => void
  onFinalize: () => void
  onDeleteFeature: () => void
  onResetGeoJSON: () => void
  onUndo: () => void
  onRedo: () => void
}

const INITIAL_POSITION = { x: 10, y: 54 }

export class DrawControlPanelElement {
  readonly element: HTMLDivElement
  private modeSelector: DrawModeSelectorElement
  private undoBtn: HTMLButtonElement
  private redoBtn: HTMLButtonElement
  private finalizeBtn: HTMLButtonElement
  private deleteBtn: HTMLButtonElement
  private resetBtn: HTMLButtonElement
  private callbacks: DrawControlPanelCallbacks
  private position = { ...INITIAL_POSITION }
  private isDragging = false
  private dragOffset = { x: 0, y: 0 }

  constructor(callbacks: DrawControlPanelCallbacks) {
    this.callbacks = callbacks
    this.element = document.createElement('div')
    this.element.className = 'draw-control-panel'
    this.element.style.left = `${this.position.x}px`
    this.element.style.top = `${this.position.y}px`

    // Grip
    const grip = document.createElement('div')
    grip.className = 'draw-control-panel__grip'
    grip.title = 'ドラッグで移動'
    grip.setAttribute('role', 'button')
    grip.setAttribute('aria-label', 'ドラッグで移動')
    grip.appendChild(createGripIcon())
    grip.addEventListener('mousedown', this.onGripMouseDown.bind(this))
    this.element.appendChild(grip)

    // Mode selector
    this.modeSelector = new DrawModeSelectorElement(callbacks.onChangeMode)
    this.element.appendChild(this.modeSelector.element)

    // Separator
    this.element.appendChild(this.createSeparator())

    // Undo
    this.undoBtn = this.createActionButton(createUndoIcon(), '元に戻す (Ctrl+Z)', () => callbacks.onUndo())
    this.element.appendChild(this.undoBtn)

    // Redo
    this.redoBtn = this.createActionButton(createRedoIcon(), 'やり直す (Ctrl+Shift+Z)', () => callbacks.onRedo())
    this.element.appendChild(this.redoBtn)

    // Finalize (hidden by default)
    this.finalizeBtn = this.createActionButton(createCheckIcon(), 'ドラフトを確定', () => callbacks.onFinalize())
    this.finalizeBtn.classList.add('draw-control-panel__action-button--confirm')
    this.finalizeBtn.style.display = 'none'
    this.element.appendChild(this.finalizeBtn)

    // Separator
    this.element.appendChild(this.createSeparator())

    // Delete
    this.deleteBtn = this.createActionButton(createDeleteIcon(), '選択した地物を削除', () => callbacks.onDeleteFeature())
    this.deleteBtn.classList.add('draw-control-panel__action-button--delete')
    this.element.appendChild(this.deleteBtn)

    // Reset
    this.resetBtn = this.createActionButton(createResetIcon(), 'GeoJSONを初期化', () => callbacks.onResetGeoJSON())
    this.resetBtn.classList.add('draw-control-panel__action-button--reset')
    this.resetBtn.setAttribute('aria-label', 'GeoJSONを初期化')
    this.element.appendChild(this.resetBtn)

    // Separator
    this.element.appendChild(this.createSeparator())

    // Branding
    const branding = document.createElement('div')
    branding.className = 'draw-control-panel__branding'
    branding.appendChild(createGeoloniaIcon())
    this.element.appendChild(branding)

    // Window mouse events for drag
    this.onWindowMouseMove = this.onWindowMouseMove.bind(this)
    this.onWindowMouseUp = this.onWindowMouseUp.bind(this)
    window.addEventListener('mousemove', this.onWindowMouseMove)
    window.addEventListener('mouseup', this.onWindowMouseUp)
  }

  update(state: DrawControlPanelState): void {
    this.modeSelector.update(state.drawMode)

    this.setDisabled(this.undoBtn, !state.canUndo)
    this.setDisabled(this.redoBtn, !state.canRedo)

    this.finalizeBtn.style.display = state.isDrawingPath ? '' : 'none'
    this.setDisabled(this.finalizeBtn, !state.canFinalizeDraft)

    this.setDisabled(this.deleteBtn, !state.hasSelectedFeature)
    const deleteTitle = state.selectedCount > 1
      ? `選択中の ${state.selectedCount} 件を削除`
      : '選択した地物を削除'
    this.deleteBtn.title = deleteTitle
    this.deleteBtn.setAttribute('aria-label', deleteTitle)
  }

  destroy(): void {
    window.removeEventListener('mousemove', this.onWindowMouseMove)
    window.removeEventListener('mouseup', this.onWindowMouseUp)
    this.element.remove()
  }

  private createActionButton(icon: SVGElement, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.title = title
    btn.setAttribute('aria-label', title)
    btn.className = 'draw-control-panel__action-button'
    btn.appendChild(icon)
    btn.addEventListener('click', onClick)
    return btn
  }

  private createSeparator(): HTMLDivElement {
    const sep = document.createElement('div')
    sep.className = 'draw-control-panel__separator'
    return sep
  }

  private setDisabled(btn: HTMLButtonElement, disabled: boolean): void {
    btn.disabled = disabled
    if (disabled) {
      btn.classList.add('draw-control-panel__action-button--disabled')
    } else {
      btn.classList.remove('draw-control-panel__action-button--disabled')
    }
  }

  private onGripMouseDown(e: MouseEvent): void {
    e.preventDefault()
    this.isDragging = true
    this.dragOffset = {
      x: e.clientX - this.position.x,
      y: e.clientY - this.position.y,
    }
  }

  private onWindowMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return
    const raw = {
      x: e.clientX - this.dragOffset.x,
      y: e.clientY - this.dragOffset.y,
    }
    const rect = this.element.getBoundingClientRect()
    this.position = clampPosition(
      raw,
      { width: rect.width, height: rect.height },
      { width: window.innerWidth, height: window.innerHeight },
    )
    this.element.style.left = `${this.position.x}px`
    this.element.style.top = `${this.position.y}px`
  }

  private onWindowMouseUp(): void {
    this.isDragging = false
  }
}
