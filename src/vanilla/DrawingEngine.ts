import type maplibregl from 'maplibre-gl'
import type { DrawMode, PathMode } from '../types'
import { createPointFeature, createPathFeature, createDraftFeatureCollection, nextFeatureId } from '../lib/geojson-helpers'
import { parseCSV } from '../lib/csv-helpers'
import { assertGeolonia } from '../lib/assert-geolonia'
import { undoableReducer } from '../lib/undoable'

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

const ALL_LAYER_IDS = [
  HIGHLIGHT_POINT_LAYER_ID, HIGHLIGHT_LINE_LAYER_ID, HIGHLIGHT_POLYGON_LAYER_ID,
  DRAFT_POINT_LAYER_ID, DRAFT_LINE_LAYER_ID, DRAFT_POLYGON_LAYER_ID,
  SYMBOL_LAYER_ID, POINT_LAYER_ID, LINE_LAYER_ID, POLYGON_LAYER_ID,
]
const ALL_SOURCE_IDS = [HIGHLIGHT_SOURCE_ID, DRAFT_SOURCE_ID, SOURCE_ID]

export interface DrawingEngineOptions {
  map: maplibregl.Map
  defaultMode?: DrawMode
}

export interface DrawingEngineEventMap {
  'modechange': { mode: DrawMode | null }
  'featureschange': { features: GeoJSON.FeatureCollection }
  'select': { featureIds: Set<string> }
}

type UndoableState = {
  past: GeoJSON.FeatureCollection[]
  current: GeoJSON.FeatureCollection
  future: GeoJSON.FeatureCollection[]
}

function createEmptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

export class DrawingEngine {
  private _map: maplibregl.Map
  private _drawMode: DrawMode | null
  private _undoState: UndoableState
  private _draftCoords: [number, number][] = []
  private _selectedFeatureIds: Set<string> = new Set()
  private _destroyed = false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _listeners: Map<string, Set<(e: any) => void>> = new Map()

  // Bound event handlers (for removal)
  private _handleClick: (e: maplibregl.MapMouseEvent) => void
  private _handleKeyDown: (e: KeyboardEvent) => void

  constructor(options: DrawingEngineOptions) {
    assertGeolonia()

    this._map = options.map
    this._drawMode = options.defaultMode ?? null
    this._undoState = { past: [], current: createEmptyFC(), future: [] }

    this._setupSourcesAndLayers()

    this._handleClick = this._onClick.bind(this)
    this._handleKeyDown = this._onKeyDown.bind(this)

    this._map.on('click', this._handleClick)
    window.addEventListener('keydown', this._handleKeyDown)
  }

  // --- Public getters ---

  get drawMode(): DrawMode | null {
    return this._drawMode
  }

  get canUndo(): boolean {
    return this._undoState.past.length > 0
  }

  get canRedo(): boolean {
    return this._undoState.future.length > 0
  }

  get selectedFeatureIds(): Set<string> {
    return new Set(this._selectedFeatureIds)
  }

  // --- Public methods ---

  setDrawMode(mode: DrawMode | null): void {
    this._assertNotDestroyed()
    this._drawMode = mode
    this._draftCoords = []
    this._selectedFeatureIds = new Set()
    this._syncDraftLayer()
    this._syncHighlightLayer()
    this._emit('modechange', { mode })
    this._emit('select', { featureIds: new Set() })
  }

  getFeatures(): GeoJSON.FeatureCollection {
    return structuredClone(this._undoState.current)
  }

  undo(): void {
    this._assertNotDestroyed()
    this._undoState = undoableReducer(this._undoState, { type: 'UNDO' })
    this._syncMainSource()
    this._syncHighlightLayer()
    this._emit('featureschange', { features: structuredClone(this._undoState.current) })
  }

  redo(): void {
    this._assertNotDestroyed()
    this._undoState = undoableReducer(this._undoState, { type: 'REDO' })
    this._syncMainSource()
    this._syncHighlightLayer()
    this._emit('featureschange', { features: structuredClone(this._undoState.current) })
  }

  deleteSelectedFeatures(): void {
    this._assertNotDestroyed()
    if (this._selectedFeatureIds.size === 0) return
    const ids = this._selectedFeatureIds
    this._setFeatures((prev) => ({
      ...prev,
      features: prev.features.filter((f) => !ids.has(f.properties?._id as string)),
    }))
    this._selectedFeatureIds = new Set()
    this._syncHighlightLayer()
    this._emit('select', { featureIds: new Set() })
  }

  finalizeDraft(): void {
    this._assertNotDestroyed()
    const isDrawingPath = this._drawMode === 'line' || this._drawMode === 'polygon'
    const requiredVertices = this._drawMode === 'polygon' ? 3 : 2
    if (!isDrawingPath || this._draftCoords.length < requiredVertices) return

    const newFeature = createPathFeature(this._draftCoords, this._drawMode as PathMode)
    this._setFeatures((prev) => ({ ...prev, features: [...prev.features, newFeature] }))
    this._draftCoords = []
    this._syncDraftLayer()
  }

  reset(): void {
    this._assertNotDestroyed()
    this._setFeatures({ type: 'FeatureCollection', features: [] })
    this._draftCoords = []
    this._selectedFeatureIds = new Set()
    this._syncDraftLayer()
    this._syncHighlightLayer()
    this._emit('select', { featureIds: new Set() })
  }

  importGeoJSON(geojson: GeoJSON.FeatureCollection, mode: 'replace' | 'merge' = 'merge'): void {
    this._assertNotDestroyed()
    const importedFeatures = geojson.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        _id: f.properties?._id ?? nextFeatureId(),
      },
    }))

    if (mode === 'replace') {
      this._setFeatures({ type: 'FeatureCollection', features: importedFeatures })
      this._draftCoords = []
      this._selectedFeatureIds = new Set()
      this._syncDraftLayer()
      this._syncHighlightLayer()
      this._emit('select', { featureIds: new Set() })
    } else {
      this._setFeatures((prev) => ({ ...prev, features: [...prev.features, ...importedFeatures] }))
    }
  }

  importCSV(csvText: string, mode: 'replace' | 'merge' = 'merge'): void {
    this._assertNotDestroyed()
    const rows = parseCSV(csvText)
    const newFeatures: GeoJSON.Feature[] = rows.map((row) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [row.lng, row.lat] },
      properties: { _id: nextFeatureId(), drawMode: 'point', ...row.properties },
    }))

    if (mode === 'replace') {
      this._setFeatures({ type: 'FeatureCollection', features: newFeatures })
      this._draftCoords = []
      this._selectedFeatureIds = new Set()
      this._syncDraftLayer()
      this._syncHighlightLayer()
      this._emit('select', { featureIds: new Set() })
    } else {
      this._setFeatures((prev) => ({ ...prev, features: [...prev.features, ...newFeatures] }))
    }
  }

  on<K extends keyof DrawingEngineEventMap>(event: K, handler: (e: DrawingEngineEventMap[K]) => void): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)!.add(handler)
  }

  off<K extends keyof DrawingEngineEventMap>(event: K, handler: (e: DrawingEngineEventMap[K]) => void): void {
    const set = this._listeners.get(event)
    if (set) {
      set.delete(handler)
    }
  }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true

    this._map.off('click', this._handleClick)
    window.removeEventListener('keydown', this._handleKeyDown)

    ALL_LAYER_IDS.forEach((layerId) => {
      if (this._map.getLayer(layerId)) this._map.removeLayer(layerId)
    })
    ALL_SOURCE_IDS.forEach((srcId) => {
      if (this._map.getSource(srcId)) this._map.removeSource(srcId)
    })

    this._listeners.clear()
  }

  // --- Private methods ---

  private _assertNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error('DrawingEngine has been destroyed')
    }
  }

  private _emit<K extends keyof DrawingEngineEventMap>(event: K, data: DrawingEngineEventMap[K]): void {
    const set = this._listeners.get(event)
    if (set) {
      set.forEach((handler) => { handler(data) })
    }
  }

  private _setFeatures(newStateOrUpdater: GeoJSON.FeatureCollection | ((prev: GeoJSON.FeatureCollection) => GeoJSON.FeatureCollection)): void {
    if (typeof newStateOrUpdater === 'function') {
      this._undoState = undoableReducer(this._undoState, { type: 'SET_FN', fn: newStateOrUpdater })
    } else {
      this._undoState = undoableReducer(this._undoState, { type: 'SET', payload: newStateOrUpdater })
    }
    this._syncMainSource()
    this._emit('featureschange', { features: structuredClone(this._undoState.current) })
  }

  private _setupSourcesAndLayers(): void {
    const map = this._map

    if (map.getSource(SOURCE_ID)) return

    map.addSource(SOURCE_ID, { type: 'geojson', data: createEmptyFC() })

    map.addLayer({
      id: POLYGON_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'Polygon']],
      paint: { 'fill-color': '#e86a4a', 'fill-opacity': 0.2 },
    })
    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'LineString']],
      paint: { 'line-color': '#e86a4a', 'line-width': 3 },
    })
    map.addLayer({
      id: SYMBOL_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'drawMode'], 'symbol']],
      paint: { 'circle-radius': 7, 'circle-color': '#ffb400', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
    })
    map.addLayer({
      id: POINT_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['!', ['==', ['get', 'drawMode'], 'symbol']]],
      paint: { 'circle-radius': 5, 'circle-color': '#1a73e8', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
    })

    map.addSource(DRAFT_SOURCE_ID, { type: 'geojson', data: createEmptyFC() })
    map.addLayer({
      id: DRAFT_POLYGON_LAYER_ID,
      type: 'fill',
      source: DRAFT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#e86a4a', 'fill-opacity': 0.1 },
    })
    map.addLayer({
      id: DRAFT_LINE_LAYER_ID,
      type: 'line',
      source: DRAFT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#e86a4a', 'line-width': 2, 'line-dasharray': [4, 4] },
    })
    map.addLayer({
      id: DRAFT_POINT_LAYER_ID,
      type: 'circle',
      source: DRAFT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 4, 'circle-color': '#e86a4a', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
    })

    map.addSource(HIGHLIGHT_SOURCE_ID, { type: 'geojson', data: createEmptyFC() })
    map.addLayer({
      id: HIGHLIGHT_POLYGON_LAYER_ID,
      type: 'line',
      source: HIGHLIGHT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'line-color': '#ff0000', 'line-width': 3, 'line-dasharray': [3, 2] },
    })
    map.addLayer({
      id: HIGHLIGHT_LINE_LAYER_ID,
      type: 'line',
      source: HIGHLIGHT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#ff0000', 'line-width': 5 },
    })
    map.addLayer({
      id: HIGHLIGHT_POINT_LAYER_ID,
      type: 'circle',
      source: HIGHLIGHT_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 10, 'circle-color': 'rgba(255, 0, 0, 0.3)', 'circle-stroke-color': '#ff0000', 'circle-stroke-width': 2 },
    })
  }

  private _syncMainSource(): void {
    const source = this._map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (source && typeof source.setData === 'function') {
      source.setData(this._undoState.current)
    }
  }

  private _syncDraftLayer(): void {
    const source = this._map.getSource(DRAFT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || typeof source.setData !== 'function') return
    const isDrawingPath = this._drawMode === 'line' || this._drawMode === 'polygon'
    if (isDrawingPath && this._draftCoords.length >= 1) {
      source.setData(createDraftFeatureCollection(this._draftCoords, this._drawMode as PathMode))
    } else {
      source.setData(createEmptyFC())
    }
  }

  private _syncHighlightLayer(): void {
    const source = this._map.getSource(HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || typeof source.setData !== 'function') return
    const selected = this._undoState.current.features.filter(
      (f) => this._selectedFeatureIds.has(f.properties?._id as string),
    )
    source.setData({ type: 'FeatureCollection', features: selected })
  }

  private _onClick(event: maplibregl.MapMouseEvent): void {
    const hit = this._map.queryRenderedFeatures(event.point, { layers: CLICKABLE_LAYERS })
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
        this._syncHighlightLayer()
        this._emit('select', { featureIds: new Set(this._selectedFeatureIds) })
        return
      }
    }

    if (!event.originalEvent.shiftKey) {
      if (this._selectedFeatureIds.size > 0) {
        this._selectedFeatureIds = new Set()
        this._syncHighlightLayer()
        this._emit('select', { featureIds: new Set() })
      }
    }

    if (!this._drawMode) return
    const coordinate: [number, number] = [event.lngLat.lng, event.lngLat.lat]
    if (this._drawMode === 'point' || this._drawMode === 'symbol') {
      this._setFeatures((prev) => ({
        ...prev,
        features: [...prev.features, createPointFeature(coordinate, this._drawMode!)],
      }))
      return
    }
    // line or polygon mode
    this._draftCoords = [...this._draftCoords, coordinate]
    this._syncDraftLayer()
  }

  private _onKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return
    const isMac = /mac/i.test(navigator.userAgent)
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey
    if (!ctrlOrCmd) return
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      this.undo()
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault()
      this.redo()
    }
  }
}
