import { describe, it, expect } from 'vitest'
import { undoableReducer } from '../../hooks/useUndoable'

type State = { count: number }

const initial = (count = 0): { past: State[]; current: State; future: State[] } => ({
  past: [],
  current: { count },
  future: [],
})

describe('undoableReducer', () => {
  describe('SET', () => {
    it('新しい状態をセットし、過去に現在を積む', () => {
      const state = initial(0)
      const next = undoableReducer(state, { type: 'SET', payload: { count: 1 } })
      expect(next.current).toEqual({ count: 1 })
      expect(next.past).toEqual([{ count: 0 }])
      expect(next.future).toEqual([])
    })

    it('SET すると future がクリアされる', () => {
      const state = { past: [{ count: 0 }], current: { count: 1 }, future: [{ count: 2 }] }
      const next = undoableReducer(state, { type: 'SET', payload: { count: 3 } })
      expect(next.current).toEqual({ count: 3 })
      expect(next.future).toEqual([])
    })
  })

  describe('SET_FN', () => {
    it('updater 関数で状態を更新する', () => {
      const state = initial(5)
      const next = undoableReducer(state, { type: 'SET_FN', fn: (s) => ({ count: s.count + 1 }) })
      expect(next.current).toEqual({ count: 6 })
      expect(next.past).toEqual([{ count: 5 }])
    })
  })

  describe('UNDO', () => {
    it('past が空の場合は何も変わらない', () => {
      const state = initial(1)
      const next = undoableReducer(state, { type: 'UNDO' })
      expect(next).toBe(state)
    })

    it('1つ前の状態に戻り、現在が future に積まれる', () => {
      const state = { past: [{ count: 0 }], current: { count: 1 }, future: [] }
      const next = undoableReducer(state, { type: 'UNDO' })
      expect(next.current).toEqual({ count: 0 })
      expect(next.past).toEqual([])
      expect(next.future).toEqual([{ count: 1 }])
    })

    it('複数の past がある場合、最後の1つだけ戻す', () => {
      const state = {
        past: [{ count: 0 }, { count: 1 }],
        current: { count: 2 },
        future: [],
      }
      const next = undoableReducer(state, { type: 'UNDO' })
      expect(next.current).toEqual({ count: 1 })
      expect(next.past).toEqual([{ count: 0 }])
      expect(next.future).toEqual([{ count: 2 }])
    })
  })

  describe('REDO', () => {
    it('future が空の場合は何も変わらない', () => {
      const state = initial(1)
      const next = undoableReducer(state, { type: 'REDO' })
      expect(next).toBe(state)
    })

    it('future の先頭に進み、現在が past に積まれる', () => {
      const state = { past: [], current: { count: 0 }, future: [{ count: 1 }] }
      const next = undoableReducer(state, { type: 'REDO' })
      expect(next.current).toEqual({ count: 1 })
      expect(next.past).toEqual([{ count: 0 }])
      expect(next.future).toEqual([])
    })
  })

  describe('履歴の往復', () => {
    it('SET → UNDO → REDO で元に戻る', () => {
      let state = initial(0)
      state = undoableReducer(state, { type: 'SET', payload: { count: 1 } })
      state = undoableReducer(state, { type: 'SET', payload: { count: 2 } })
      expect(state.current).toEqual({ count: 2 })

      state = undoableReducer(state, { type: 'UNDO' })
      expect(state.current).toEqual({ count: 1 })

      state = undoableReducer(state, { type: 'UNDO' })
      expect(state.current).toEqual({ count: 0 })

      state = undoableReducer(state, { type: 'REDO' })
      expect(state.current).toEqual({ count: 1 })

      state = undoableReducer(state, { type: 'REDO' })
      expect(state.current).toEqual({ count: 2 })
    })

    it('UNDO 後に SET すると future がクリアされる', () => {
      let state = initial(0)
      state = undoableReducer(state, { type: 'SET', payload: { count: 1 } })
      state = undoableReducer(state, { type: 'UNDO' })
      expect(state.future).toEqual([{ count: 1 }])

      state = undoableReducer(state, { type: 'SET', payload: { count: 99 } })
      expect(state.current).toEqual({ count: 99 })
      expect(state.future).toEqual([])
    })
  })
})
