import { useCallback, useEffect, useRef, useState } from 'react'
import type { DrawMode } from '../types'
import { DrawModeSelector } from './DrawModeSelector'
import { GeoloniaIcon } from './GeoloniaIcon'
import { UndoButton } from './UndoButton'
import { RedoButton } from './RedoButton'
import { DeleteButton } from './DeleteButton'
import { ResetButton } from './ResetButton'
import { FinalizeButton } from './FinalizeButton'
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
      <UndoButton
        disabled={!canUndo}
        onClick={onUndo}
      />
      <RedoButton
        disabled={!canRedo}
        onClick={onRedo}
      />
      {isDrawingPath && (
        <FinalizeButton
          disabled={!canFinalizeDraft}
          onClick={onFinalize}
          title='ドラフトを確定'
        />
      )}
      <div className='draw-control-panel__separator' />
      <DeleteButton
        disabled={!hasSelectedFeature}
        onClick={onDeleteFeature}
        title={selectedCount > 1 ? `選択中の ${selectedCount} 件を削除` : '選択した地物を削除'}
      />
      <ResetButton
        disabled={false}
        onClick={onResetGeoJSON}
        title='GeoJSONを初期化'
        showConfirm={false}
      />
      <div className='draw-control-panel__separator' />
      <div className='draw-control-panel__branding'>
        <GeoloniaIcon />
      </div>
    </div>
  )
}
