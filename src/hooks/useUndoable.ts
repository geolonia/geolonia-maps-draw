import { useReducer, useCallback } from 'react'

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

const MAX_HISTORY = 50

export function undoableReducer<T>(state: UndoableState<T>, action: UndoableAction<T>): UndoableState<T> {
  switch (action.type) {
    case 'SET': {
      const past = [...state.past, state.current]
      if (past.length > MAX_HISTORY) past.shift()
      return { past, current: action.payload, future: [] }
    }
    case 'SET_FN': {
      const newCurrent = action.fn(state.current)
      const past = [...state.past, state.current]
      if (past.length > MAX_HISTORY) past.shift()
      return { past, current: newCurrent, future: [] }
    }
    case 'UNDO':
      if (state.past.length === 0) return state
      return {
        past: state.past.slice(0, -1),
        current: state.past[state.past.length - 1],
        future: [state.current, ...state.future],
      }
    case 'REDO':
      if (state.future.length === 0) return state
      return {
        past: [...state.past, state.current],
        current: state.future[0],
        future: state.future.slice(1),
      }
  }
}

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
