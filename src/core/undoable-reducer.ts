export type UndoableState<T> = {
  past: T[]
  current: T
  future: T[]
}

export type UndoableAction<T> =
  | { type: 'SET'; payload: T }
  | { type: 'SET_FN'; fn: (prev: T) => T }
  | { type: 'UNDO' }
  | { type: 'REDO' }

export const MAX_HISTORY = 50

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
