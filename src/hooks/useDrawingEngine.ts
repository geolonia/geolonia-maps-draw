import { useEffect, useRef, useState, useCallback } from 'react'
import type maplibregl from 'maplibre-gl'
import type { DrawMode, PathMode } from '../types'
import type { DrawControlPanelProps } from '../components/DrawControlPanel'
import { useUndoable } from './useUndoable'
import { useVertexEditing, VERTEX_LAYER_ID } from './useVertexEditing'
import type { SelectedVertex, VertexContextMenuEvent } from './useVertexEditing'
import { createPointFeature, createPathFeature, createDraftFeatureCollection, nextFeatureId } from '../lib/geojson-helpers'
import { parseCSV } from '../lib/csv-helpers'

const SOURCE_ID = 'geojson-maker-generated-features'
const POINT_LAYER_ID = 'geojson-maker-point-layer'
const SYMBOL_LAYER_ID = 'geojson-maker-symbol-layer'
const LINE_LAYER_ID = 'geojson-maker-line-layer'
const POLYGON_LAYER_ID = 'geojson-maker-polygon-layer'
const DRAFT_SOURCE_ID = 'geojson-maker-draft'
const DRAFT_LINE_LAYER_ID = 'geojson-maker-draft-line'
const DRAFT_POINT_LAYER_ID = 'geojson-maker-draft-point'
const DRAFT_POLYGON_LAYER_ID = 'geojson-maker-draft-polygon'
const HIGHLIGHT_SOURCE_ID = 'geojson-maker-highlight'
const HIGHLIGHT_POINT_LAYER_ID = 'geojson-maker-highlight-point'
const HIGHLIGHT_LINE_LAYER_ID = 'geojson-maker-highlight-line'
const HIGHLIGHT_POLYGON_LAYER_ID = 'geojson-maker-highlight-polygon'

const CLICKABLE_LAYERS = [POINT_LAYER_ID, SYMBOL_LAYER_ID, LINE_LAYER_ID, POLYGON_LAYER_ID]
const HIGHLIGHT_DURATION_MS = 1500

export type DrawingEngineOptions = {
  initialFeatures?: GeoJSON.FeatureCollection
}

export type ContextMenuEvent = {
  feature: GeoJSON.Feature
  x: number
  y: number
}

export type DraftContextMenuEvent = {
  draftIndex: number
  x: number
  y: number
}

export type DrawingEngineResult = {
  // 状態
  features: GeoJSON.FeatureCollection
  drawMode: DrawMode | null
  selectedFeatureIds: Set<string>
  isDrawingPath: boolean
  canFinalizeDraft: boolean
  canUndo: boolean
  canRedo: boolean
  rubberBand: { x: number; y: number; width: number; height: number } | null
  highlightedPanelFeatureId: string | null
  contextMenuEvent: ContextMenuEvent | null
  vertexContextMenuEvent: VertexContextMenuEvent | null
  selectedVertex: SelectedVertex | null
  draftContextMenuEvent: DraftContextMenuEvent | null

  // アクション
  setDrawMode: (mode: DrawMode | null) => void
  setFeatures: (fc: GeoJSON.FeatureCollection | ((prev: GeoJSON.FeatureCollection) => GeoJSON.FeatureCollection)) => void
  setSelectedFeatureIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  finalizeDraft: () => void
  deleteSelectedFeatures: () => void
  deleteSelectedVertex: () => void
  resetGeoJSON: () => void
  undo: () => void
  redo: () => void
  importCSV: (text: string) => void
  importGeoJSON: (features: GeoJSON.Feature[], mode: 'replace' | 'merge') => void
  closeContextMenu: () => void
  closeVertexContextMenu: () => void
  deleteDraftPoint: (index: number) => void
  closeDraftContextMenu: () => void

  // DrawControlPanel に渡す props（onShareURL は含まない）
  controlPanelProps: Omit<DrawControlPanelProps, 'onShareURL'>
}

export function useDrawingEngine(
  map: maplibregl.Map | null,
  options?: DrawingEngineOptions,
): DrawingEngineResult {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  const initialFC = options?.initialFeatures ?? emptyFC

  const [drawMode, setDrawMode] = useState<DrawMode | null>('point')
  const {
    current: features,
    set: setFeatures,
    undo: undoFeatures,
    redo: redoFeatures,
    canUndo,
    canRedo,
  } = useUndoable<GeoJSON.FeatureCollection>(initialFC)
  const [draftCoords, setDraftCoords] = useState<[number, number][]>([])
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set())
  const [highlightedPanelFeatureId, setHighlightedPanelFeatureId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuEvent | null>(null)
  const [vertexContextMenu, setVertexContextMenu] = useState<VertexContextMenuEvent | null>(null)
  const [selectedVertex, setSelectedVertex] = useState<SelectedVertex | null>(null)
  const [draftContextMenu, setDraftContextMenu] = useState<DraftContextMenuEvent | null>(null)
  const [rubberBand, setRubberBand] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const featuresRef = useRef(features)
  featuresRef.current = features
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasRubberBandingRef = useRef(false)
  const rbDragRef = useRef<{ startPoint: { x: number; y: number }; isActive: boolean } | null>(null)
  const drawModeRef = useRef(drawMode)
  drawModeRef.current = drawMode

  const isDrawingPath = drawMode === 'line' || drawMode === 'polygon'
  const requiredVertices = drawMode === 'polygon' ? 3 : 2
  const canFinalizeDraft = isDrawingPath && draftCoords.length >= requiredVertices

  // 一時ハイライトを設定するヘルパー
  const flashHighlight = useCallback((featureId: string, setter: (id: string | null) => void) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    setter(featureId)
    highlightTimerRef.current = setTimeout(() => {
      setter(null)
      highlightTimerRef.current = null
    }, HIGHLIGHT_DURATION_MS)
  }, [])

  // 頂点移動をコミット
  const updateFeatureVertex = useCallback((updatedFeature: GeoJSON.Feature) => {
    setFeatures((prev) => ({
      ...prev,
      features: prev.features.map((f) =>
        f.properties?._id === updatedFeature.properties?._id ? updatedFeature : f
      ),
    }))
  }, [])

  // 単一選択時のみ頂点編集を有効にする
  const selectedFeatureId = selectedFeatureIds.size === 1 ? [...selectedFeatureIds][0] : null

  const { justDraggedRef, deleteSelectedVertex } = useVertexEditing({
    map,
    features,
    selectedFeatureId,
    mainSourceId: SOURCE_ID,
    onCommit: updateFeatureVertex,
    selectedVertex,
    onVertexSelect: setSelectedVertex,
    onVertexContextMenu: setVertexContextMenu,
  })

  // drawMode 変更時にリセット
  useEffect(() => {
    setDraftCoords([])
    setSelectedFeatureIds(new Set())
    setContextMenu(null)
    setVertexContextMenu(null)
    setSelectedVertex(null)
    setDraftContextMenu(null)
  }, [drawMode])

  // MapLibre ソース・レイヤーのセットアップ
  useEffect(() => {
    if (!map) return
    if (map.getSource(SOURCE_ID)) return

    map.addSource(SOURCE_ID, { type: 'geojson', data: features })

    map.addLayer({
      id: POLYGON_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'Polygon']],
      paint: { 'fill-color': '#e86a4a', 'fill-opacity': 0.2 }
    })
    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'LineString']],
      paint: { 'line-color': '#e86a4a', 'line-width': 3 }
    })
    map.addLayer({
      id: SYMBOL_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'drawMode'], 'symbol']],
      paint: { 'circle-radius': 7, 'circle-color': '#ffb400', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 }
    })
    map.addLayer({
      id: POINT_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['!', ['==', ['get', 'drawMode'], 'symbol']]],
      paint: { 'circle-radius': 5, 'circle-color': '#1a73e8', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 }
    })

    map.addSource(DRAFT_SOURCE_ID, { type: 'geojson', data: emptyFC })
    map.addLayer({
      id: DRAFT_POLYGON_LAYER_ID,
      type: 'fill',
      source: DRAFT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#e86a4a', 'fill-opacity': 0.1 }
    })
    map.addLayer({
      id: DRAFT_LINE_LAYER_ID,
      type: 'line',
      source: DRAFT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#e86a4a', 'line-width': 2, 'line-dasharray': [4, 4] }
    })
    map.addLayer({
      id: DRAFT_POINT_LAYER_ID,
      type: 'circle',
      source: DRAFT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 4, 'circle-color': '#e86a4a', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 }
    })

    map.addSource(HIGHLIGHT_SOURCE_ID, { type: 'geojson', data: emptyFC })
    map.addLayer({
      id: HIGHLIGHT_POLYGON_LAYER_ID,
      type: 'line',
      source: HIGHLIGHT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'line-color': '#ff0000', 'line-width': 3, 'line-dasharray': [3, 2] }
    })
    map.addLayer({
      id: HIGHLIGHT_LINE_LAYER_ID,
      type: 'line',
      source: HIGHLIGHT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#ff0000', 'line-width': 5 }
    })
    map.addLayer({
      id: HIGHLIGHT_POINT_LAYER_ID,
      type: 'circle',
      source: HIGHLIGHT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 10, 'circle-color': 'rgba(255, 0, 0, 0.3)', 'circle-stroke-color': '#ff0000', 'circle-stroke-width': 2 }
    })

    return () => {
      ;[HIGHLIGHT_POINT_LAYER_ID, HIGHLIGHT_LINE_LAYER_ID, HIGHLIGHT_POLYGON_LAYER_ID,
        DRAFT_POINT_LAYER_ID, DRAFT_LINE_LAYER_ID, DRAFT_POLYGON_LAYER_ID,
        SYMBOL_LAYER_ID, POINT_LAYER_ID, LINE_LAYER_ID, POLYGON_LAYER_ID].forEach((layerId) => {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
      })
      for (const srcId of [HIGHLIGHT_SOURCE_ID, DRAFT_SOURCE_ID, SOURCE_ID]) {
        if (map.getSource(srcId)) map.removeSource(srcId)
      }
    }
  }, [map])

  // クリック・コンテキストメニュー
  useEffect(() => {
    if (!map) return

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      if (wasRubberBandingRef.current) return
      if (justDraggedRef.current) return

      setContextMenu(null)
      setDraftContextMenu(null)

      if (map.getLayer(VERTEX_LAYER_ID)) {
        const vertexHit = map.queryRenderedFeatures(event.point, { layers: [VERTEX_LAYER_ID] })
        if (vertexHit.length > 0) return
      }

      const hit = map.queryRenderedFeatures(event.point, { layers: CLICKABLE_LAYERS })
      if (hit.length > 0) {
        const clickedId = hit[0].properties?._id as string | undefined
        if (clickedId) {
          const isShift = event.originalEvent.shiftKey
          setSelectedFeatureIds((prev) => {
            if (isShift) {
              const next = new Set(prev)
              if (next.has(clickedId)) next.delete(clickedId)
              else next.add(clickedId)
              return next
            }
            if (prev.size === 1 && prev.has(clickedId)) return new Set()
            return new Set([clickedId])
          })
          flashHighlight(clickedId, setHighlightedPanelFeatureId)
          return
        }
      }

      if (!event.originalEvent.shiftKey) {
        setSelectedFeatureIds(new Set())
      }

      if (!drawMode) return
      const coordinate: [number, number] = [event.lngLat.lng, event.lngLat.lat]
      if (drawMode === 'point' || drawMode === 'symbol') {
        setFeatures((prev) => ({
          ...prev,
          features: [...prev.features, createPointFeature(coordinate, drawMode)]
        }))
        return
      }
      setDraftCoords((prev) => [...prev, coordinate])
    }

    const handleContextMenu = (event: maplibregl.MapMouseEvent) => {
      // 頂点の右クリックは useVertexEditing 側で処理するのでスキップ
      if (map.getLayer(VERTEX_LAYER_ID)) {
        const vertexHit = map.queryRenderedFeatures(event.point, { layers: [VERTEX_LAYER_ID] })
        if (vertexHit.length > 0) {
          setContextMenu(null)
          setDraftContextMenu(null)
          return
        }
      }

      // ドラフトポイントの右クリック
      if (map.getLayer(DRAFT_POINT_LAYER_ID)) {
        const draftHit = map.queryRenderedFeatures(event.point, { layers: [DRAFT_POINT_LAYER_ID] })
        if (draftHit.length > 0) {
          const rawDraftIndex = draftHit[0].properties?.draftIndex
          const draftIndex = typeof rawDraftIndex === 'number' ? rawDraftIndex : Number(rawDraftIndex)
          if (Number.isInteger(draftIndex) && draftIndex >= 0) {
            event.preventDefault()
            setContextMenu(null)
            setVertexContextMenu(null)
            setDraftContextMenu({ draftIndex, x: event.originalEvent.clientX, y: event.originalEvent.clientY })
            return
          }
        }
      }

      const hit = map.queryRenderedFeatures(event.point, { layers: CLICKABLE_LAYERS })
      if (hit.length > 0) {
        const clickedId = hit[0].properties?._id as string | undefined
        if (clickedId) {
          const found = featuresRef.current.features.find((f) => f.properties?._id === clickedId)
          if (found) {
            event.preventDefault()
            setVertexContextMenu(null)
            setDraftContextMenu(null)
            setContextMenu({ feature: found, x: event.originalEvent.clientX, y: event.originalEvent.clientY })
            return
          }
        }
      }
      setContextMenu(null)
      setVertexContextMenu(null)
      setDraftContextMenu(null)
    }

    map.on('click', handleClick)
    map.on('contextmenu', handleContextMenu)
    return () => {
      map.off('click', handleClick)
      map.off('contextmenu', handleContextMenu)
    }
  }, [map, drawMode, flashHighlight, justDraggedRef])

  // ラバーバンド選択（描画モードなしの時のみ有効）
  useEffect(() => {
    if (!map) return

    const onMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (drawModeRef.current) return
      const hit = map.queryRenderedFeatures(e.point, { layers: CLICKABLE_LAYERS })
      if (hit.length > 0) return
      rbDragRef.current = { startPoint: { x: e.point.x, y: e.point.y }, isActive: false }
      map.dragPan.disable()
    }

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!rbDragRef.current) return
      const { startPoint } = rbDragRef.current
      const dx = e.point.x - startPoint.x
      const dy = e.point.y - startPoint.y
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      rbDragRef.current.isActive = true
      setRubberBand({
        x: Math.min(startPoint.x, e.point.x),
        y: Math.min(startPoint.y, e.point.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      })
    }

    const onMouseUp = (e: maplibregl.MapMouseEvent) => {
      if (!rbDragRef.current) return
      const { startPoint, isActive } = rbDragRef.current
      rbDragRef.current = null
      map.dragPan.enable()
      setRubberBand(null)
      if (!isActive) return

      wasRubberBandingRef.current = true
      setTimeout(() => { wasRubberBandingRef.current = false }, 50)

      const topLeft: [number, number] = [Math.min(startPoint.x, e.point.x), Math.min(startPoint.y, e.point.y)]
      const bottomRight: [number, number] = [Math.max(startPoint.x, e.point.x), Math.max(startPoint.y, e.point.y)]
      const hits = map.queryRenderedFeatures([topLeft, bottomRight], { layers: CLICKABLE_LAYERS })
      const ids = new Set(hits.map((f) => f.properties?._id as string).filter(Boolean))
      setSelectedFeatureIds((prev) => {
        if (e.originalEvent.shiftKey) {
          const next = new Set(prev)
          ids.forEach((id) => next.add(id))
          return next
        }
        return ids
      })
    }

    map.on('mousedown', onMouseDown)
    map.on('mousemove', onMouseMove)
    map.on('mouseup', onMouseUp)
    return () => {
      map.off('mousedown', onMouseDown)
      map.off('mousemove', onMouseMove)
      map.off('mouseup', onMouseUp)
    }
  }, [map])

  // features → MapLibre ソース同期
  useEffect(() => {
    if (!map) return
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || typeof source.setData !== 'function') return
    source.setData(features)
  }, [map, features])

  // draftCoords → ドラフトレイヤー同期
  useEffect(() => {
    if (!map) return
    const source = map.getSource(DRAFT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || typeof source.setData !== 'function') return
    if (isDrawingPath && draftCoords.length >= 1) {
      source.setData(createDraftFeatureCollection(draftCoords, drawMode as PathMode))
    } else {
      source.setData(emptyFC)
    }
  }, [map, draftCoords, drawMode, isDrawingPath])

  // ハイライト表示更新（全選択フィーチャを表示）
  useEffect(() => {
    if (!map) return
    const source = map.getSource(HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || typeof source.setData !== 'function') return
    const selected = features.features.filter((f) => selectedFeatureIds.has(f.properties?._id as string))
    source.setData({ type: 'FeatureCollection', features: selected })
  }, [map, selectedFeatureIds, features])

  // Undo/Redo キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return
      const isMac = /mac/i.test(navigator.userAgent)
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey
      if (!ctrlOrCmd) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoFeatures()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redoFeatures()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoFeatures, redoFeatures])

  // アクション
  const finalizeDraft = useCallback(() => {
    if (!isDrawingPath || !canFinalizeDraft) return
    const newFeature = createPathFeature(draftCoords, drawMode as PathMode)
    setFeatures((prev) => ({ ...prev, features: [...prev.features, newFeature] }))
    setDraftCoords([])
  }, [isDrawingPath, canFinalizeDraft, draftCoords, drawMode])

  const deleteSelectedFeatures = useCallback(() => {
    if (selectedFeatureIds.size === 0) return
    setFeatures((prev) => ({
      ...prev,
      features: prev.features.filter((f) => !selectedFeatureIds.has(f.properties?._id as string)),
    }))
    setSelectedFeatureIds(new Set())
  }, [selectedFeatureIds])

  const resetGeoJSON = useCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = null
    }
    setFeatures({ type: 'FeatureCollection', features: [] })
    setDraftCoords([])
    setSelectedFeatureIds(new Set())
    setHighlightedPanelFeatureId(null)
  }, [])

  const importCSV = useCallback((text: string) => {
    const rows = parseCSV(text)
    const newFeatures: GeoJSON.Feature[] = rows.map((row) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [row.lng, row.lat] },
      properties: { _id: nextFeatureId(), drawMode: 'point', ...row.properties },
    }))
    setFeatures((prev) => ({ ...prev, features: [...prev.features, ...newFeatures] }))
  }, [])

  const importGeoJSON = useCallback((importedFeatures: GeoJSON.Feature[], mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = null
      }
      setFeatures({ type: 'FeatureCollection', features: importedFeatures })
      setDraftCoords([])
      setSelectedFeatureIds(new Set())
      setHighlightedPanelFeatureId(null)
    } else {
      setFeatures((prev) => ({ ...prev, features: [...prev.features, ...importedFeatures] }))
    }
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const closeVertexContextMenu = useCallback(() => {
    setVertexContextMenu(null)
  }, [])

  const deleteDraftPoint = useCallback((index: number) => {
    setDraftCoords((prev) => prev.filter((_, i) => i !== index))
    setDraftContextMenu(null)
  }, [])

  const closeDraftContextMenu = useCallback(() => {
    setDraftContextMenu(null)
  }, [])

  const controlPanelProps: DrawControlPanelProps = {
    drawMode,
    isDrawingPath,
    canFinalizeDraft,
    hasSelectedFeature: selectedFeatureIds.size > 0,
    selectedCount: selectedFeatureIds.size,
    canUndo,
    canRedo,
    onChangeMode: setDrawMode,
    onFinalize: finalizeDraft,
    onDeleteFeature: deleteSelectedFeatures,
    onResetGeoJSON: resetGeoJSON,
    onUndo: undoFeatures,
    onRedo: redoFeatures,
  }

  return {
    features,
    drawMode,
    selectedFeatureIds,
    isDrawingPath,
    canFinalizeDraft,
    canUndo,
    canRedo,
    rubberBand,
    highlightedPanelFeatureId,
    contextMenuEvent: contextMenu,
    vertexContextMenuEvent: vertexContextMenu,
    selectedVertex,
    draftContextMenuEvent: draftContextMenu,
    setDrawMode,
    setFeatures,
    setSelectedFeatureIds,
    finalizeDraft,
    deleteSelectedFeatures,
    deleteSelectedVertex,
    resetGeoJSON,
    undo: undoFeatures,
    redo: redoFeatures,
    importCSV,
    importGeoJSON,
    closeContextMenu,
    closeVertexContextMenu,
    deleteDraftPoint,
    closeDraftContextMenu,
    controlPanelProps,
  }
}
