import { undoableReducer } from './undoable-reducer'
import type { UndoableState } from './undoable-reducer'

/**
 * Framework-agnostic undo/redo store.
 * Wraps `undoableReducer` with an EventTarget so listeners
 * can subscribe to state changes without React.
 */
export class UndoableStore<T> extends EventTarget {
  private state: UndoableState<T>

  constructor(initialValue: T) {
    super()
    this.state = { past: [], current: initialValue, future: [] }
  }

  get current(): T {
    return this.state.current
  }

  get canUndo(): boolean {
    return this.state.past.length > 0
  }

  get canRedo(): boolean {
    return this.state.future.length > 0
  }

  set(value: T | ((prev: T) => T)): void {
    if (typeof value === 'function') {
      this.state = undoableReducer(this.state, { type: 'SET_FN', fn: value as (prev: T) => T })
    } else {
      this.state = undoableReducer(this.state, { type: 'SET', payload: value })
    }
    this.emit()
  }

  undo(): void {
    const prev = this.state
    this.state = undoableReducer(this.state, { type: 'UNDO' })
    if (this.state !== prev) this.emit()
  }

  redo(): void {
    const prev = this.state
    this.state = undoableReducer(this.state, { type: 'REDO' })
    if (this.state !== prev) this.emit()
  }

  private emit(): void {
    this.dispatchEvent(new Event('change'))
  }
}
