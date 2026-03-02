import { useCallback, useEffect, useRef, useState } from 'react'
import type { DrawMode } from '../types'
import { DrawModeSelector } from './DrawModeSelector'
import { clampPosition } from '../lib/clamp-position'
import './DrawControlPanel.css'

export type DrawControlPanelProps = {
  drawMode: DrawMode | null
  isDrawingPath: boolean
  canFinalizeDraft: boolean
  hasSelectedFeature: boolean
  selectedCount: number
  canUndo: boolean
  canRedo: boolean
  onChangeMode: (mode: DrawMode | null) => void
  onFinalize: () => void
  onDeleteFeature: () => void
  onResetGeoJSON: () => void
  onUndo: () => void
  onRedo: () => void
}

const INITIAL_POSITION = { x: 10, y: 54 }

export function DrawControlPanel({
  drawMode,
  isDrawingPath,
  canFinalizeDraft,
  hasSelectedFeature,
  selectedCount,
  canUndo,
  canRedo,
  onChangeMode,
  onFinalize,
  onDeleteFeature,
  onResetGeoJSON,
  onUndo,
  onRedo,
}: DrawControlPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(INITIAL_POSITION)
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  const onGripMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }, [position])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !panelRef.current) return
      const raw = {
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      }
      const rect = panelRef.current.getBoundingClientRect()
      const clamped = clampPosition(
        raw,
        { width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
      )
      setPosition(clamped)
    }

    const onMouseUp = () => {
      isDraggingRef.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div
      ref={panelRef}
      className='draw-control-panel'
      style={{ left: position.x, top: position.y }}
    >
      <div
        className='draw-control-panel__grip'
        onMouseDown={onGripMouseDown}
        title='ドラッグで移動'
      >
        <svg viewBox="0 0 24 8" fill="currentColor">
          <circle cx="6" cy="2" r="1.5" />
          <circle cx="12" cy="2" r="1.5" />
          <circle cx="18" cy="2" r="1.5" />
          <circle cx="6" cy="6" r="1.5" />
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="18" cy="6" r="1.5" />
        </svg>
      </div>
      <DrawModeSelector selectedMode={drawMode} onChange={onChangeMode} />
      <div className='draw-control-panel__separator' />
      <button
        type='button'
        onClick={onUndo}
        disabled={!canUndo}
        title='元に戻す (Ctrl+Z)'
        className={`draw-control-panel__action-button${!canUndo ? ' draw-control-panel__action-button--disabled' : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 14 4 9 9 4" />
          <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        </svg>
      </button>
      <button
        type='button'
        onClick={onRedo}
        disabled={!canRedo}
        title='やり直す (Ctrl+Shift+Z)'
        className={`draw-control-panel__action-button${!canRedo ? ' draw-control-panel__action-button--disabled' : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 14 20 9 15 4" />
          <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
        </svg>
      </button>
      {isDrawingPath && (
        <button
          type='button'
          onClick={onFinalize}
          disabled={!canFinalizeDraft}
          title='ドラフトを確定'
          className={`draw-control-panel__action-button draw-control-panel__action-button--confirm${canFinalizeDraft ? '' : ' draw-control-panel__action-button--disabled'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      )}
      <div className='draw-control-panel__separator' />
      <button
        type='button'
        onClick={onDeleteFeature}
        disabled={!hasSelectedFeature}
        title={selectedCount > 1 ? `選択中の ${selectedCount} 件を削除` : '選択した地物を削除'}
        className={`draw-control-panel__action-button draw-control-panel__action-button--delete${hasSelectedFeature ? '' : ' draw-control-panel__action-button--disabled'}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
      <button
        type='button'
        onClick={onResetGeoJSON}
        title='GeoJSONを初期化'
        aria-label='GeoJSONを初期化'
        className='draw-control-panel__action-button draw-control-panel__action-button--reset'
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
    </div>
  )
}
