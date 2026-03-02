import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUndoable } from '../useUndoable'

describe('useUndoable hook', () => {
  describe('initial state', () => {
    it('returns the initial value as current', () => {
      const { result } = renderHook(() => useUndoable(0))
      expect(result.current.current).toBe(0)
    })

    it('canUndo is false initially', () => {
      const { result } = renderHook(() => useUndoable('hello'))
      expect(result.current.canUndo).toBe(false)
    })

    it('canRedo is false initially', () => {
      const { result } = renderHook(() => useUndoable('hello'))
      expect(result.current.canRedo).toBe(false)
    })

    it('works with complex initial values', () => {
      const init = { a: 1, b: [2, 3] }
      const { result } = renderHook(() => useUndoable(init))
      expect(result.current.current).toEqual({ a: 1, b: [2, 3] })
    })
  })

  describe('set with a value', () => {
    it('updates current to the new value', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => {
        result.current.set(42)
      })
      expect(result.current.current).toBe(42)
    })

    it('enables canUndo after set', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => {
        result.current.set(1)
      })
      expect(result.current.canUndo).toBe(true)
    })

    it('clears future when set is called', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => {
        result.current.set(1)
      })
      act(() => {
        result.current.undo()
      })
      expect(result.current.canRedo).toBe(true)
      act(() => {
        result.current.set(99)
      })
      expect(result.current.canRedo).toBe(false)
    })
  })

  describe('set with an updater function', () => {
    it('applies the updater function to current value', () => {
      const { result } = renderHook(() => useUndoable(10))
      act(() => {
        result.current.set((prev) => prev + 5)
      })
      expect(result.current.current).toBe(15)
    })

    it('enables canUndo after updater set', () => {
      const { result } = renderHook(() => useUndoable(10))
      act(() => {
        result.current.set((prev) => prev * 2)
      })
      expect(result.current.canUndo).toBe(true)
    })

    it('clears future when updater set is called', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.undo() })
      expect(result.current.canRedo).toBe(true)
      act(() => { result.current.set((prev) => prev + 100) })
      expect(result.current.canRedo).toBe(false)
      expect(result.current.current).toBe(100)
    })
  })

  describe('undo', () => {
    it('reverts to the previous value', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.set(2) })
      act(() => { result.current.undo() })
      expect(result.current.current).toBe(1)
    })

    it('does nothing when past is empty', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.undo() })
      expect(result.current.current).toBe(0)
      expect(result.current.canUndo).toBe(false)
    })

    it('enables canRedo after undo', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.undo() })
      expect(result.current.canRedo).toBe(true)
    })

    it('disables canUndo when all past entries are exhausted', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.undo() })
      expect(result.current.canUndo).toBe(false)
    })

    it('can undo multiple steps', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.set(2) })
      act(() => { result.current.set(3) })
      act(() => { result.current.undo() })
      expect(result.current.current).toBe(2)
      act(() => { result.current.undo() })
      expect(result.current.current).toBe(1)
      act(() => { result.current.undo() })
      expect(result.current.current).toBe(0)
    })
  })

  describe('redo', () => {
    it('restores the undone value', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.undo() })
      act(() => { result.current.redo() })
      expect(result.current.current).toBe(1)
    })

    it('does nothing when future is empty', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.redo() })
      expect(result.current.current).toBe(0)
      expect(result.current.canRedo).toBe(false)
    })

    it('enables canUndo after redo', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.undo() })
      act(() => { result.current.redo() })
      expect(result.current.canUndo).toBe(true)
    })

    it('can redo multiple steps', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.set(2) })
      act(() => { result.current.set(3) })
      act(() => { result.current.undo() })
      act(() => { result.current.undo() })
      act(() => { result.current.undo() })
      expect(result.current.current).toBe(0)
      act(() => { result.current.redo() })
      expect(result.current.current).toBe(1)
      act(() => { result.current.redo() })
      expect(result.current.current).toBe(2)
      act(() => { result.current.redo() })
      expect(result.current.current).toBe(3)
    })
  })

  describe('canUndo / canRedo flags', () => {
    it('canUndo and canRedo are correct throughout a sequence', () => {
      const { result } = renderHook(() => useUndoable('a'))
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)

      act(() => { result.current.set('b') })
      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)

      act(() => { result.current.undo() })
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)

      act(() => { result.current.redo() })
      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)
    })
  })

  describe('MAX_HISTORY (50)', () => {
    it('trims past when it exceeds 50 entries via SET', () => {
      const { result } = renderHook(() => useUndoable(0))
      // Set 51 times: past will grow to 51, then shift
      for (let i = 1; i <= 51; i++) {
        act(() => { result.current.set(i) })
      }
      expect(result.current.current).toBe(51)
      // The oldest entry (0) should have been shifted out.
      // Undo 50 times should go back to 1 (not 0)
      for (let i = 0; i < 50; i++) {
        act(() => { result.current.undo() })
      }
      expect(result.current.current).toBe(1)
      // Cannot undo further
      expect(result.current.canUndo).toBe(false)
    })

    it('trims past when it exceeds 50 entries via SET_FN', () => {
      const { result } = renderHook(() => useUndoable(0))
      for (let i = 1; i <= 51; i++) {
        act(() => { result.current.set((prev) => prev + 1) })
      }
      expect(result.current.current).toBe(51)
      for (let i = 0; i < 50; i++) {
        act(() => { result.current.undo() })
      }
      expect(result.current.current).toBe(1)
      expect(result.current.canUndo).toBe(false)
    })

    it('does not trim when past is exactly 50', () => {
      const { result } = renderHook(() => useUndoable(0))
      for (let i = 1; i <= 50; i++) {
        act(() => { result.current.set(i) })
      }
      expect(result.current.current).toBe(50)
      for (let i = 0; i < 50; i++) {
        act(() => { result.current.undo() })
      }
      expect(result.current.current).toBe(0)
      expect(result.current.canUndo).toBe(false)
    })
  })

  describe('undo/redo round-trip', () => {
    it('SET -> UNDO -> REDO restores state exactly', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.set(2) })
      act(() => { result.current.undo() })
      expect(result.current.current).toBe(1)
      act(() => { result.current.undo() })
      expect(result.current.current).toBe(0)
      act(() => { result.current.redo() })
      expect(result.current.current).toBe(1)
      act(() => { result.current.redo() })
      expect(result.current.current).toBe(2)
    })

    it('UNDO after SET clears future on new SET', () => {
      const { result } = renderHook(() => useUndoable(0))
      act(() => { result.current.set(1) })
      act(() => { result.current.undo() })
      expect(result.current.canRedo).toBe(true)
      act(() => { result.current.set(99) })
      expect(result.current.canRedo).toBe(false)
      expect(result.current.current).toBe(99)
    })
  })
})
