import { describe, it, expect, vi } from 'vitest'
import { UndoableStore } from '../UndoableStore'

describe('UndoableStore', () => {
  it('initializes with the given value', () => {
    const store = new UndoableStore(42)
    expect(store.current).toBe(42)
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
  })

  it('set() updates current and emits change', () => {
    const store = new UndoableStore(0)
    const listener = vi.fn()
    store.addEventListener('change', listener)

    store.set(1)
    expect(store.current).toBe(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('set() with updater function', () => {
    const store = new UndoableStore(5)
    store.set((prev) => prev + 10)
    expect(store.current).toBe(15)
  })

  it('undo() restores previous state', () => {
    const store = new UndoableStore(0)
    store.set(1)
    store.set(2)
    expect(store.current).toBe(2)

    store.undo()
    expect(store.current).toBe(1)
    expect(store.canUndo).toBe(true)
    expect(store.canRedo).toBe(true)

    store.undo()
    expect(store.current).toBe(0)
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(true)
  })

  it('redo() restores next state', () => {
    const store = new UndoableStore(0)
    store.set(1)
    store.set(2)
    store.undo()
    store.undo()
    expect(store.current).toBe(0)

    store.redo()
    expect(store.current).toBe(1)
    store.redo()
    expect(store.current).toBe(2)
    expect(store.canRedo).toBe(false)
  })

  it('set() after undo clears future', () => {
    const store = new UndoableStore(0)
    store.set(1)
    store.undo()
    expect(store.canRedo).toBe(true)

    store.set(99)
    expect(store.current).toBe(99)
    expect(store.canRedo).toBe(false)
  })

  it('undo on empty past does not emit', () => {
    const store = new UndoableStore(0)
    const listener = vi.fn()
    store.addEventListener('change', listener)

    store.undo()
    expect(listener).not.toHaveBeenCalled()
    expect(store.current).toBe(0)
  })

  it('redo on empty future does not emit', () => {
    const store = new UndoableStore(0)
    const listener = vi.fn()
    store.addEventListener('change', listener)

    store.redo()
    expect(listener).not.toHaveBeenCalled()
    expect(store.current).toBe(0)
  })

  it('works with object values', () => {
    const store = new UndoableStore({ count: 0 })
    store.set({ count: 1 })
    store.set((prev) => ({ count: prev.count + 1 }))
    expect(store.current).toEqual({ count: 2 })

    store.undo()
    expect(store.current).toEqual({ count: 1 })
  })

  it('emits change on undo and redo', () => {
    const store = new UndoableStore(0)
    store.set(1)
    const listener = vi.fn()
    store.addEventListener('change', listener)

    store.undo()
    expect(listener).toHaveBeenCalledTimes(1)

    store.redo()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('respects max history (50)', () => {
    const store = new UndoableStore(0)
    for (let i = 1; i <= 55; i++) {
      store.set(i)
    }
    expect(store.current).toBe(55)

    // Should be able to undo 50 times (max history)
    let undoCount = 0
    while (store.canUndo) {
      store.undo()
      undoCount++
    }
    expect(undoCount).toBe(50)
    expect(store.current).toBe(5)
  })
})
