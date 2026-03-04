import { useReducer, useCallback } from 'react'
import { undoableReducer } from '../lib/undoable'

export { undoableReducer } from '../lib/undoable'

type UndoableState<T> = {
  past: T[]
  current: T
  future: T[]
}

type UndoableAction<T> =
  | { type: 'SET'; payload: T }
  | { type: 'SET_FN'; fn: (prev: T) => T }
  | { type: 'UNDO' }
  | { type: 'REDO' }

export function useUndoable<T>(initialState: T) {
  const [state, dispatch] = useReducer(
    undoableReducer as (state: UndoableState<T>, action: UndoableAction<T>) => UndoableState<T>,
    { past: [], current: initialState, future: [] }
  )

  const set = useCallback((newStateOrUpdater: T | ((prev: T) => T)) => {
    if (typeof newStateOrUpdater === 'function') {
      dispatch({ type: 'SET_FN', fn: newStateOrUpdater as (prev: T) => T })
    } else {
      dispatch({ type: 'SET', payload: newStateOrUpdater })
    }
  }, [])

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [])

  return {
    current: state.current,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}
