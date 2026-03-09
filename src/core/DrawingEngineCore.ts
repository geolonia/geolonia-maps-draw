import type maplibregl from 'maplibre-gl'
import type { DrawMode, PathMode } from '../types'
import type {
  DrawingEngineCoreOptions,
  SelectedVertex,
  ContextMenuEvent,
  VertexContextMenuEvent,
  DraftContextMenuEvent,
  DrawingEngineState,
} from './types'
import { UndoableStore } from './UndoableStore'
import { VertexEditingController, VERTEX_LAYER_ID } from './VertexEditingController'
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

/**
 * Framework-agnostic drawing engine core.
 * Manages all state, MapLibre sources/layers, and user interactions.
 *
 * Events:
 * - 'statechange' : Emitted whenever any state changes. UI layers should re-render.
 */
export class DrawingEngineCore extends EventTarget {
  private map: maplibregl.Map
  private store: UndoableStore<GeoJSON.FeatureCollection>
  private vertexCtrl: VertexEditingController

  private _drawMode: DrawMode | null = 'point'
  private _draftCoords: [number, number][] = []
  private _selectedFeatureIds = new Set<string>()
  private _selectedVertex: SelectedVertex | null = null
  private _contextMenu: ContextMenuEvent | null = null
  private _vertexContextMenu: VertexContextMenuEvent | null = null
  private _draftContextMenu: DraftContextMenuEvent | null = null
  private _rubberBand: { x: number; y: number; width: number; height: number } | null = null
  private _highlightedPanelFeatureId: string | null = null

  private highlightTimer: ReturnType<typeof setTimeout> | null = null
  private wasRubberBanding = false
  private rbDrag: { startPoint: { x: number; y: number }; isActive: boolean } | null = null
  private destroyed = false

  // Bound handlers
  private handleClick: (e: maplibregl.MapMouseEvent) => void
  private handleContextMenu: (e: maplibregl.MapMouseEvent) => void
  private handleRBMouseDown: (e: maplibregl.MapMouseEvent) => void
  private handleRBMouseMove: (e: maplibregl.MapMouseEvent) => void
  private handleRBMouseUp: (e: maplibregl.MapMouseEvent) => void
  private handleKeyDown: (e: KeyboardEvent) => void

  constructor(map: maplibregl.Map, options?: DrawingEngineCoreOptions) {
    super()
    this.map = map

    const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
    const initialFC = options?.initialFeatures ?? emptyFC

    this.store = new UndoableStore<GeoJSON.FeatureCollection>(initialFC)
    this.vertexCtrl = new VertexEditingController(map, { mainSourceId: SOURCE_ID })

    // Bind handlers
    this.handleClick = this.onClick.bind(this)
    this.handleContextMenu = this.onContextMenu.bind(this)
    this.handleRBMouseDown = this.onRBMouseDown.bind(this)
    this.handleRBMouseMove = this.onRBMouseMove.bind(this)
    this.handleRBMouseUp = this.onRBMouseUp.bind(this)
    this.handleKeyDown = this.onKeyDown.bind(this)

    // Wire vertex editing events
    this.vertexCtrl.addEventListener('vertexcommit', ((e: CustomEvent) => {
      this.store.set((prev) => ({
        ...prev,
        features: prev.features.map((f) =>
          f.properties?._id === e.detail.feature.properties?._id ? e.detail.feature : f,
        ),
      }))
    }) as EventListener)

    this.vertexCtrl.addEventListener('vertexselect', ((e: CustomEvent) => {
      this._selectedVertex = e.detail.vertex
      this.syncVertexHandles()
      this.emit()
    }) as EventListener)

    this.vertexCtrl.addEventListener('vertexcontextmenu', ((e: CustomEvent) => {
      this._vertexContextMenu = e.detail.event
      this.emit()
    }) as EventListener)

    // Listen to store changes for source sync
    this.store.addEventListener('change', () => {
      this.syncMainSource()
      this.syncHighlightSource()
      this.syncVertexHandles()
      this.vertexCtrl.setFeatures(this.store.current)
      this.emit()
    })

    this.setupMapLayers()
    this.vertexCtrl.attach()

    // Register interaction handlers
    map.on('click', this.handleClick)
    map.on('contextmenu', this.handleContextMenu)
    map.on('mousedown', this.handleRBMouseDown)
    map.on('mousemove', this.handleRBMouseMove)
    map.on('mouseup', this.handleRBMouseUp)
    window.addEventListener('keydown', this.handleKeyDown)

    // Initial sync
    this.syncMainSource()
    this.syncDraftSource()
    this.vertexCtrl.setFeatures(this.store.current)
  }

  // === State getters ===

  get features(): GeoJSON.FeatureCollection {
    return this.store.current
  }

  get drawMode(): DrawMode | null {
    return this._drawMode
  }

  get selectedFeatureIds(): Set<string> {
    return new Set(this._selectedFeatureIds)
  }

  get isDrawingPath(): boolean {
    return this._drawMode === 'line' || this._drawMode === 'polygon'
  }

  get canFinalizeDraft(): boolean {
    const required = this._drawMode === 'polygon' ? 3 : 2
    return this.isDrawingPath && this._draftCoords.length >= required
  }

  get canUndo(): boolean {
    return this.store.canUndo
  }

  get canRedo(): boolean {
    return this.store.canRedo
  }

  get rubberBand(): { x: number; y: number; width: number; height: number } | null {
    return this._rubberBand
  }

  get highlightedPanelFeatureId(): string | null {
    return this._highlightedPanelFeatureId
  }

  get contextMenuEvent(): ContextMenuEvent | null {
    return this._contextMenu
  }

  get vertexContextMenuEvent(): VertexContextMenuEvent | null {
    return this._vertexContextMenu
  }

  get selectedVertex(): SelectedVertex | null {
    return this._selectedVertex
  }

  get draftContextMenuEvent(): DraftContextMenuEvent | null {
    return this._draftContextMenu
  }

  /** Get a snapshot of all current state */
  getState(): DrawingEngineState {
    return {
      features: this.features,
      drawMode: this.drawMode,
      selectedFeatureIds: this.selectedFeatureIds,
      draftCoords: this._draftCoords,
      selectedVertex: this._selectedVertex,
      contextMenuEvent: this._contextMenu,
      vertexContextMenuEvent: this._vertexContextMenu,
      draftContextMenuEvent: this._draftContextMenu,
      rubberBand: this._rubberBand,
      highlightedPanelFeatureId: this._highlightedPanelFeatureId,
      isDrawingPath: this.isDrawingPath,
      canFinalizeDraft: this.canFinalizeDraft,
      canUndo: this.canUndo,
      canRedo: this.canRedo,
    }
  }

  // === Actions ===

  setDrawMode(mode: DrawMode | null): void {
    this._drawMode = mode
    this._draftCoords = []
    this._selectedFeatureIds = new Set()
    this._contextMenu = null
    this._vertexContextMenu = null
    this._selectedVertex = null
    this._draftContextMenu = null
    this.syncDraftSource()
    this.syncHighlightSource()
    this.syncVertexHandles()
    this.emit()
  }

  setFeatures(fc: GeoJSON.FeatureCollection | ((prev: GeoJSON.FeatureCollection) => GeoJSON.FeatureCollection)): void {
    this.store.set(fc)
  }

  setSelectedFeatureIds(ids: Set<string> | ((prev: Set<string>) => Set<string>)): void {
    if (typeof ids === 'function') {
      this._selectedFeatureIds = ids(this._selectedFeatureIds)
    } else {
      this._selectedFeatureIds = ids
    }
    this.syncHighlightSource()
    this.syncVertexHandles()
    this.emit()
  }

  finalizeDraft(): void {
    if (!this.isDrawingPath || !this.canFinalizeDraft) return
    const newFeature = createPathFeature(this._draftCoords, this._drawMode as PathMode)
    this.store.set((prev) => ({ ...prev, features: [...prev.features, newFeature] }))
    this._draftCoords = []
    this.syncDraftSource()
    this.emit()
  }

  deleteSelectedFeatures(): void {
    if (this._selectedFeatureIds.size === 0) return
    const ids = this._selectedFeatureIds
    this.store.set((prev) => ({
      ...prev,
      features: prev.features.filter((f) => !ids.has(f.properties?._id as string)),
    }))
    this._selectedFeatureIds = new Set()
    this.emit()
  }

  deleteSelectedVertex(): void {
    this.vertexCtrl.deleteSelectedVertex()
  }

  resetGeoJSON(): void {
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer)
      this.highlightTimer = null
    }
    this.store.set({ type: 'FeatureCollection', features: [] })
    this._draftCoords = []
    this._selectedFeatureIds = new Set()
    this._selectedVertex = null
    this._contextMenu = null
    this._vertexContextMenu = null
    this._draftContextMenu = null
    this._highlightedPanelFeatureId = null
    this.syncDraftSource()
    this.emit()
  }

  undo(): void {
    this.store.undo()
  }

  redo(): void {
    this.store.redo()
  }

  importCSV(text: string): void {
    const rows = parseCSV(text)
    const newFeatures: GeoJSON.Feature[] = rows.map((row) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [row.lng, row.lat] },
      properties: { _id: nextFeatureId(), drawMode: 'point', ...row.properties },
    }))
    this.store.set((prev) => ({ ...prev, features: [...prev.features, ...newFeatures] }))
  }

  importGeoJSON(importedFeatures: GeoJSON.Feature[], mode: 'replace' | 'merge'): void {
    if (mode === 'replace') {
      if (this.highlightTimer) {
        clearTimeout(this.highlightTimer)
        this.highlightTimer = null
      }
      this.store.set({ type: 'FeatureCollection', features: importedFeatures })
      this._draftCoords = []
      this._selectedFeatureIds = new Set()
      this._selectedVertex = null
      this._contextMenu = null
      this._vertexContextMenu = null
      this._draftContextMenu = null
      this._highlightedPanelFeatureId = null
      this.syncDraftSource()
      this.emit()
    } else {
      this.store.set((prev) => ({ ...prev, features: [...prev.features, ...importedFeatures] }))
    }
  }

  closeContextMenu(): void {
    this._contextMenu = null
    this.emit()
  }

  closeVertexContextMenu(): void {
    this._vertexContextMenu = null
    this.emit()
  }

  deleteDraftPoint(index: number): void {
    this._draftCoords = this._draftCoords.filter((_, i) => i !== index)
    this._draftContextMenu = null
    this.syncDraftSource()
    this.emit()
  }

  closeDraftContextMenu(): void {
    this._draftContextMenu = null
    this.emit()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true

    const map = this.map

    map.off('click', this.handleClick)
    map.off('contextmenu', this.handleContextMenu)
    map.off('mousedown', this.handleRBMouseDown)
    map.off('mousemove', this.handleRBMouseMove)
    map.off('mouseup', this.handleRBMouseUp)
    window.removeEventListener('keydown', this.handleKeyDown)

    this.vertexCtrl.detach()

    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer)
      this.highlightTimer = null
    }

    // Remove layers and sources
    const layers = [
      HIGHLIGHT_POINT_LAYER_ID, HIGHLIGHT_LINE_LAYER_ID, HIGHLIGHT_POLYGON_LAYER_ID,
      DRAFT_POINT_LAYER_ID, DRAFT_LINE_LAYER_ID, DRAFT_POLYGON_LAYER_ID,
      SYMBOL_LAYER_ID, POINT_LAYER_ID, LINE_LAYER_ID, POLYGON_LAYER_ID,
    ]
    for (const layerId of layers) {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
    }
    for (const srcId of [HIGHLIGHT_SOURCE_ID, DRAFT_SOURCE_ID, SOURCE_ID]) {
      if (map.getSource(srcId)) map.removeSource(srcId)
    }
  }

  // === Private: MapLibre setup ===

  private setupMapLayers(): void {
    const map = this.map
    const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

    map.addSource(SOURCE_ID, { type: 'geojson', data: this.store.current })

    map.addLayer({
      id: POLYGON_LAYER_ID, type: 'fill', source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'Polygon']],
      paint: { 'fill-color': '#e86a4a', 'fill-opacity': 0.2 },
    })
    map.addLayer({
      id: LINE_LAYER_ID, type: 'line', source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'LineString']],
      paint: { 'line-color': '#e86a4a', 'line-width': 3 },
    })
    map.addLayer({
      id: SYMBOL_LAYER_ID, type: 'circle', source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'drawMode'], 'symbol']],
      paint: { 'circle-radius': 7, 'circle-color': '#ffb400', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
    })
    map.addLayer({
      id: POINT_LAYER_ID, type: 'circle', source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['!', ['==', ['get', 'drawMode'], 'symbol']]],
      paint: { 'circle-radius': 5, 'circle-color': '#1a73e8', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
    })

    map.addSource(DRAFT_SOURCE_ID, { type: 'geojson', data: emptyFC })
    map.addLayer({
      id: DRAFT_POLYGON_LAYER_ID, type: 'fill', source: DRAFT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#e86a4a', 'fill-opacity': 0.1 },
    })
    map.addLayer({
      id: DRAFT_LINE_LAYER_ID, type: 'line', source: DRAFT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#e86a4a', 'line-width': 2, 'line-dasharray': [4, 4] },
    })
    map.addLayer({
      id: DRAFT_POINT_LAYER_ID, type: 'circle', source: DRAFT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 4, 'circle-color': '#e86a4a', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
    })

    map.addSource(HIGHLIGHT_SOURCE_ID, { type: 'geojson', data: emptyFC })
    map.addLayer({
      id: HIGHLIGHT_POLYGON_LAYER_ID, type: 'line', source: HIGHLIGHT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'line-color': '#ff0000', 'line-width': 3, 'line-dasharray': [3, 2] },
    })
    map.addLayer({
      id: HIGHLIGHT_LINE_LAYER_ID, type: 'line', source: HIGHLIGHT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#ff0000', 'line-width': 5 },
    })
    map.addLayer({
      id: HIGHLIGHT_POINT_LAYER_ID, type: 'circle', source: HIGHLIGHT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 10, 'circle-color': 'rgba(255, 0, 0, 0.3)', 'circle-stroke-color': '#ff0000', 'circle-stroke-width': 2 },
    })
  }

  // === Private: Source sync ===

  private syncMainSource(): void {
    const source = this.map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (source && typeof source.setData === 'function') {
      source.setData(this.store.current)
    }
  }

  private syncDraftSource(): void {
    const source = this.map.getSource(DRAFT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || typeof source.setData !== 'function') return
    const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
    if (this.isDrawingPath && this._draftCoords.length >= 1) {
      source.setData(createDraftFeatureCollection(this._draftCoords, this._drawMode as PathMode))
    } else {
      source.setData(emptyFC)
    }
  }

  private syncHighlightSource(): void {
    const source = this.map.getSource(HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || typeof source.setData !== 'function') return
    const selected = this.store.current.features.filter((f) =>
      this._selectedFeatureIds.has(f.properties?._id as string),
    )
    source.setData({ type: 'FeatureCollection', features: selected })
  }

  private syncVertexHandles(): void {
    const selectedId = this._selectedFeatureIds.size === 1
      ? [...this._selectedFeatureIds][0]
      : null
    const feature = selectedId
      ? this.store.current.features.find((f) => f.properties?._id === selectedId) ?? null
      : null
    this.vertexCtrl.updateHandles(feature, this._selectedVertex)
  }

  // === Private: Event handlers ===

  private flashHighlight(featureId: string): void {
    if (this.highlightTimer) clearTimeout(this.highlightTimer)
    this._highlightedPanelFeatureId = featureId
    this.highlightTimer = setTimeout(() => {
      this._highlightedPanelFeatureId = null
      this.highlightTimer = null
      this.emit()
    }, HIGHLIGHT_DURATION_MS)
  }

  private onClick(event: maplibregl.MapMouseEvent): void {
    if (this.wasRubberBanding) return
    if (this.vertexCtrl.justDragged) return

    this._contextMenu = null
    this._draftContextMenu = null

    const map = this.map

    if (map.getLayer(VERTEX_LAYER_ID)) {
      const vertexHit = map.queryRenderedFeatures(event.point, { layers: [VERTEX_LAYER_ID] })
      if (vertexHit.length > 0) { this.emit(); return }
    }

    const hit = map.queryRenderedFeatures(event.point, { layers: CLICKABLE_LAYERS })
    if (hit.length > 0) {
      const clickedId = hit[0].properties?._id as string | undefined
      if (clickedId) {
        const isShift = event.originalEvent.shiftKey
        if (isShift) {
          const next = new Set(this._selectedFeatureIds)
          if (next.has(clickedId)) next.delete(clickedId)
          else next.add(clickedId)
          this._selectedFeatureIds = next
        } else {
          if (this._selectedFeatureIds.size === 1 && this._selectedFeatureIds.has(clickedId)) {
            this._selectedFeatureIds = new Set()
          } else {
            this._selectedFeatureIds = new Set([clickedId])
          }
        }
        this.flashHighlight(clickedId)
        this.syncHighlightSource()
        this.syncVertexHandles()
        this.emit()
        return
      }
    }

    if (!event.originalEvent.shiftKey) {
      this._selectedFeatureIds = new Set()
      this.syncHighlightSource()
      this.syncVertexHandles()
    }

    if (!this._drawMode) { this.emit(); return }

    const coordinate: [number, number] = [event.lngLat.lng, event.lngLat.lat]
    if (this._drawMode === 'point' || this._drawMode === 'symbol') {
      this.store.set((prev) => ({
        ...prev,
        features: [...prev.features, createPointFeature(coordinate, this._drawMode!)],
      }))
      return
    }

    this._draftCoords = [...this._draftCoords, coordinate]
    this.syncDraftSource()
    this.emit()
  }

  private onContextMenu(event: maplibregl.MapMouseEvent): void {
    const map = this.map

    if (map.getLayer(VERTEX_LAYER_ID)) {
      const vertexHit = map.queryRenderedFeatures(event.point, { layers: [VERTEX_LAYER_ID] })
      if (vertexHit.length > 0) {
        this._contextMenu = null
        this._draftContextMenu = null
        this.emit()
        return
      }
    }

    if (map.getLayer(DRAFT_POINT_LAYER_ID)) {
      const draftHit = map.queryRenderedFeatures(event.point, { layers: [DRAFT_POINT_LAYER_ID] })
      if (draftHit.length > 0) {
        const rawDraftIndex = draftHit[0].properties?.draftIndex
        const draftIndex = typeof rawDraftIndex === 'number' ? rawDraftIndex : Number(rawDraftIndex)
        if (Number.isInteger(draftIndex) && draftIndex >= 0) {
          event.preventDefault()
          this._contextMenu = null
          this._vertexContextMenu = null
          this._draftContextMenu = { draftIndex, x: event.originalEvent.clientX, y: event.originalEvent.clientY }
          this.emit()
          return
        }
      }
    }

    const hit = map.queryRenderedFeatures(event.point, { layers: CLICKABLE_LAYERS })
    if (hit.length > 0) {
      const clickedId = hit[0].properties?._id as string | undefined
      if (clickedId) {
        const found = this.store.current.features.find((f) => f.properties?._id === clickedId)
        if (found) {
          event.preventDefault()
          this._vertexContextMenu = null
          this._draftContextMenu = null
          this._contextMenu = { feature: found, x: event.originalEvent.clientX, y: event.originalEvent.clientY }
          this.emit()
          return
        }
      }
    }

    this._contextMenu = null
    this._vertexContextMenu = null
    this._draftContextMenu = null
    this.emit()
  }

  // Rubber band selection
  private onRBMouseDown(e: maplibregl.MapMouseEvent): void {
    if (this._drawMode) return
    const hit = this.map.queryRenderedFeatures(e.point, { layers: CLICKABLE_LAYERS })
    if (hit.length > 0) return
    this.rbDrag = { startPoint: { x: e.point.x, y: e.point.y }, isActive: false }
    this.map.dragPan.disable()
  }

  private onRBMouseMove(e: maplibregl.MapMouseEvent): void {
    if (!this.rbDrag) return
    const { startPoint } = this.rbDrag
    const dx = e.point.x - startPoint.x
    const dy = e.point.y - startPoint.y
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    this.rbDrag.isActive = true
    this._rubberBand = {
      x: Math.min(startPoint.x, e.point.x),
      y: Math.min(startPoint.y, e.point.y),
      width: Math.abs(dx),
      height: Math.abs(dy),
    }
    this.emit()
  }

  private onRBMouseUp(e: maplibregl.MapMouseEvent): void {
    if (!this.rbDrag) return
    const { startPoint, isActive } = this.rbDrag
    this.rbDrag = null
    this.map.dragPan.enable()
    this._rubberBand = null

    if (!isActive) { this.emit(); return }

    this.wasRubberBanding = true
    setTimeout(() => { this.wasRubberBanding = false }, 50)

    const topLeft: [number, number] = [Math.min(startPoint.x, e.point.x), Math.min(startPoint.y, e.point.y)]
    const bottomRight: [number, number] = [Math.max(startPoint.x, e.point.x), Math.max(startPoint.y, e.point.y)]
    const hits = this.map.queryRenderedFeatures([topLeft, bottomRight], { layers: CLICKABLE_LAYERS })
    const ids = new Set(hits.map((f) => f.properties?._id as string).filter(Boolean))

    if (e.originalEvent.shiftKey) {
      const next = new Set(this._selectedFeatureIds)
      for (const id of ids) next.add(id)
      this._selectedFeatureIds = next
    } else {
      this._selectedFeatureIds = ids
    }

    this.syncHighlightSource()
    this.syncVertexHandles()
    this.emit()
  }

  private onKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return
    const isMac = /mac/i.test(navigator.userAgent)
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey
    if (!ctrlOrCmd) return
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      this.store.undo()
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault()
      this.store.redo()
    }
  }

  private emit(): void {
    if (!this.destroyed) {
      this.dispatchEvent(new Event('statechange'))
    }
  }
}
