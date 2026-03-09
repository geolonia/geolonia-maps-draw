import { useEffect, useRef, useCallback } from 'react'
import type maplibregl from 'maplibre-gl'
import { VertexEditingController } from '../core/VertexEditingController'
import type { SelectedVertex, VertexContextMenuEvent } from '../core/types'

export { VERTEX_SOURCE_ID, VERTEX_LAYER_ID } from '../core/VertexEditingController'
export type { SelectedVertex, VertexContextMenuEvent } from '../core/types'

type UseVertexEditingOptions = {
  map: maplibregl.Map | null
  features: GeoJSON.FeatureCollection
  selectedFeatureId: string | null
  mainSourceId: string
  onCommit: (updatedFeature: GeoJSON.Feature) => void
  selectedVertex: SelectedVertex | null
  onVertexSelect: (vertex: SelectedVertex | null) => void
  onVertexContextMenu: (event: VertexContextMenuEvent | null) => void
}

export function useVertexEditing({
  map,
  features,
  selectedFeatureId,
  mainSourceId,
  onCommit,
  selectedVertex,
  onVertexSelect,
  onVertexContextMenu,
}: UseVertexEditingOptions) {
  const justDraggedRef = useRef(false)
  const ctrlRef = useRef<VertexEditingController | null>(null)

  /** Keep latest callbacks in refs (avoid effect deps) */
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const onVertexSelectRef = useRef(onVertexSelect)
  onVertexSelectRef.current = onVertexSelect
  const onVertexContextMenuRef = useRef(onVertexContextMenu)
  onVertexContextMenuRef.current = onVertexContextMenu

  // Setup: create controller and attach
  useEffect(() => {
    if (!map) return

    const ctrl = new VertexEditingController(map, { mainSourceId })
    ctrlRef.current = ctrl

    const syncJustDragged = () => {
      justDraggedRef.current = true
      setTimeout(() => { justDraggedRef.current = false }, 50)
    }

    ctrl.addEventListener('vertexcommit', ((e: CustomEvent) => {
      syncJustDragged()
      onCommitRef.current(e.detail.feature)
    }) as EventListener)

    ctrl.addEventListener('vertexselect', ((e: CustomEvent) => {
      syncJustDragged()
      onVertexSelectRef.current(e.detail.vertex)
    }) as EventListener)

    ctrl.addEventListener('vertexcontextmenu', ((e: CustomEvent) => {
      onVertexContextMenuRef.current(e.detail.event)
    }) as EventListener)

    ctrl.attach()

    return () => {
      ctrl.detach()
      ctrlRef.current = null
    }
  }, [map, mainSourceId])

  // Sync features
  useEffect(() => {
    ctrlRef.current?.setFeatures(features)
  }, [features])

  // Sync vertex handles
  useEffect(() => {
    if (!ctrlRef.current) return
    if (!selectedFeatureId) {
      ctrlRef.current.updateHandles(null, selectedVertex)
      return
    }
    const selected = features.features.find((f) => f.properties?._id === selectedFeatureId)
    if (!selected || (selected.geometry.type !== 'LineString' && selected.geometry.type !== 'Polygon')) {
      ctrlRef.current.updateHandles(null, selectedVertex)
      return
    }
    ctrlRef.current.updateHandles(selected, selectedVertex)
  }, [selectedFeatureId, features, selectedVertex])

  const deleteSelectedVertex = useCallback(() => {
    ctrlRef.current?.deleteSelectedVertex()
  }, [])

  return { justDraggedRef, deleteSelectedVertex }
}
