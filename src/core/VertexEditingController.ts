import type maplibregl from 'maplibre-gl'
import type { SelectedVertex, VertexEditingOptions } from './types'
import { canDeleteVertex, applyVertexDelete } from '../lib/vertex-helpers'

export const VERTEX_SOURCE_ID = 'geojson-maker-vertex'
export const VERTEX_LAYER_ID = 'geojson-maker-vertex-layer'

/** Compute vertex handle points for a LineString or Polygon feature */
function getVertexHandles(
  feature: GeoJSON.Feature,
  selectedVertex: SelectedVertex | null,
): GeoJSON.FeatureCollection {
  const handles: GeoJSON.Feature[] = []
  const geom = feature.geometry
  const featureId = feature.properties?._id as string

  if (geom.type === 'LineString') {
    geom.coordinates.forEach((coord, i) => {
      handles.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coord },
        properties: {
          featureId,
          vertexIndex: i,
          selected: selectedVertex?.featureId === featureId && selectedVertex?.vertexIndex === i,
        },
      })
    })
  } else if (geom.type === 'Polygon') {
    geom.coordinates[0].slice(0, -1).forEach((coord, i) => {
      handles.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coord },
        properties: {
          featureId,
          vertexIndex: i,
          selected: selectedVertex?.featureId === featureId && selectedVertex?.vertexIndex === i,
        },
      })
    })
  }

  return { type: 'FeatureCollection', features: handles }
}

/** Move a specific vertex to a new coordinate */
function applyVertexMove(
  feature: GeoJSON.Feature,
  vertexIndex: number,
  newCoord: [number, number],
): GeoJSON.Feature {
  const geom = feature.geometry
  if (geom.type === 'LineString') {
    const coords = geom.coordinates.map((c, i) =>
      i === vertexIndex ? newCoord : c,
    ) as [number, number][]
    return { ...feature, geometry: { ...geom, coordinates: coords } }
  }
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0].map((c, i) => {
      if (i === vertexIndex) return newCoord
      if (vertexIndex === 0 && i === geom.coordinates[0].length - 1) return newCoord
      return c
    }) as [number, number][]
    return { ...feature, geometry: { ...geom, coordinates: [ring, ...geom.coordinates.slice(1)] } }
  }
  return feature
}

/**
 * Framework-agnostic vertex editing controller.
 * Manages MapLibre vertex handles, drag, selection and context menu events.
 *
 * Events:
 * - 'vertexcommit'      : CustomEvent<{ feature: GeoJSON.Feature }>
 * - 'vertexselect'       : CustomEvent<{ vertex: SelectedVertex | null }>
 * - 'vertexcontextmenu'  : CustomEvent<{ event: VertexContextMenuEvent | null }>
 */
export class VertexEditingController extends EventTarget {
  private map: maplibregl.Map
  private mainSourceId: string
  private features: GeoJSON.FeatureCollection
  private selectedVertex: SelectedVertex | null = null
  private justDraggedFlag = false
  private attached = false

  private dragState: {
    featureId: string
    vertexIndex: number
    feature: GeoJSON.Feature
    hasMoved: boolean
  } | null = null

  // Bound handlers for attach/detach
  private handleMouseMove: (e: maplibregl.MapMouseEvent) => void
  private handleMouseDown: (e: maplibregl.MapMouseEvent) => void
  private handleMouseUp: () => void
  private handleContextMenu: (e: maplibregl.MapMouseEvent) => void
  private handleKeyDown: (e: KeyboardEvent) => void

  constructor(map: maplibregl.Map, options: VertexEditingOptions) {
    super()
    this.map = map
    this.mainSourceId = options.mainSourceId
    this.features = { type: 'FeatureCollection', features: [] }

    // Pre-bind handlers
    this.handleMouseMove = this.onMouseMove.bind(this)
    this.handleMouseDown = this.onMouseDown.bind(this)
    this.handleMouseUp = this.onMouseUp.bind(this)
    this.handleContextMenu = this.onContextMenu.bind(this)
    this.handleKeyDown = this.onKeyDown.bind(this)
  }

  get justDragged(): boolean {
    return this.justDraggedFlag
  }

  /** Update internal state. Call this whenever features or selection changes. */
  updateHandles(feature: GeoJSON.Feature | null, selectedVertex: SelectedVertex | null): void {
    this.selectedVertex = selectedVertex
    const source = this.map.getSource(VERTEX_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || typeof source.setData !== 'function') return

    const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
    if (!feature || (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'Polygon')) {
      source.setData(emptyFC)
      return
    }
    source.setData(getVertexHandles(feature, selectedVertex))
  }

  /** Update the features collection reference */
  setFeatures(fc: GeoJSON.FeatureCollection): void {
    this.features = fc
  }

  /** Delete the currently selected vertex */
  deleteSelectedVertex(): void {
    const sv = this.selectedVertex
    if (!sv) return
    const feature = this.features.features.find((f) => f.properties?._id === sv.featureId)
    if (!feature || !canDeleteVertex(feature)) return
    const updated = applyVertexDelete(feature, sv.vertexIndex)
    this.selectedVertex = null
    this.dispatchEvent(new CustomEvent('vertexcommit', { detail: { feature: updated } }))
    this.dispatchEvent(new CustomEvent('vertexselect', { detail: { vertex: null } }))
  }

  /** Register map event listeners and create source/layer */
  attach(): void {
    if (this.attached) return
    this.attached = true

    const map = this.map
    const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

    map.addSource(VERTEX_SOURCE_ID, { type: 'geojson', data: emptyFC })
    map.addLayer({
      id: VERTEX_LAYER_ID,
      type: 'circle',
      source: VERTEX_SOURCE_ID,
      paint: {
        'circle-radius': ['case', ['==', ['get', 'selected'], true], 8, 6],
        'circle-color': ['case', ['==', ['get', 'selected'], true], '#ef4444', '#ffffff'],
        'circle-stroke-color': ['case', ['==', ['get', 'selected'], true], '#ef4444', '#1a73e8'],
        'circle-stroke-width': 2.5,
      },
    })

    map.on('mousemove', this.handleMouseMove)
    map.on('mousedown', this.handleMouseDown)
    map.on('mouseup', this.handleMouseUp)
    map.on('contextmenu', this.handleContextMenu)
    window.addEventListener('keydown', this.handleKeyDown)
  }

  /** Remove map event listeners and clean up source/layer */
  detach(): void {
    if (!this.attached) return
    this.attached = false

    const map = this.map
    map.off('mousemove', this.handleMouseMove)
    map.off('mousedown', this.handleMouseDown)
    map.off('mouseup', this.handleMouseUp)
    map.off('contextmenu', this.handleContextMenu)
    window.removeEventListener('keydown', this.handleKeyDown)

    if (map.getLayer(VERTEX_LAYER_ID)) map.removeLayer(VERTEX_LAYER_ID)
    if (map.getSource(VERTEX_SOURCE_ID)) map.removeSource(VERTEX_SOURCE_ID)
  }

  private onMouseMove(e: maplibregl.MapMouseEvent): void {
    const map = this.map
    if (this.dragState) {
      const { featureId, vertexIndex } = this.dragState
      const newCoord: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      const updatedFeature = applyVertexMove(this.dragState.feature, vertexIndex, newCoord)
      this.dragState.feature = updatedFeature
      this.dragState.hasMoved = true

      const vertexSrc = map.getSource(VERTEX_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
      if (vertexSrc) vertexSrc.setData(getVertexHandles(updatedFeature, this.selectedVertex))

      const mainSrc = map.getSource(this.mainSourceId) as maplibregl.GeoJSONSource | undefined
      if (mainSrc) {
        mainSrc.setData({
          type: 'FeatureCollection',
          features: this.features.features.map((f) =>
            f.properties?._id === featureId ? updatedFeature : f,
          ),
        })
      }
      return
    }

    if (!map.getLayer(VERTEX_LAYER_ID)) return
    const hits = map.queryRenderedFeatures(e.point, { layers: [VERTEX_LAYER_ID] })
    const canvas = map.getCanvas()
    canvas.style.cursor = hits.length > 0 ? 'grab' : ''
  }

  private onMouseDown(e: maplibregl.MapMouseEvent): void {
    const map = this.map
    if (!map.getLayer(VERTEX_LAYER_ID)) return
    const hits = map.queryRenderedFeatures(e.point, { layers: [VERTEX_LAYER_ID] })
    if (hits.length === 0) return

    const hit = hits[0]
    const featureId = hit.properties?.featureId as string
    const vertexIndex = hit.properties?.vertexIndex as number
    const feature = this.features.features.find((f) => f.properties?._id === featureId)
    if (!feature) return

    this.dragState = { featureId, vertexIndex, feature, hasMoved: false }
    map.getCanvas().style.cursor = 'grabbing'
    map.dragPan.disable()
  }

  private onMouseUp(): void {
    if (!this.dragState) return
    const { featureId, vertexIndex, feature, hasMoved } = this.dragState
    this.dragState = null
    this.map.dragPan.enable()
    this.map.getCanvas().style.cursor = ''

    this.justDraggedFlag = true
    setTimeout(() => { this.justDraggedFlag = false }, 50)

    if (hasMoved) {
      this.dispatchEvent(new CustomEvent('vertexcommit', { detail: { feature } }))
    } else {
      this.dispatchEvent(new CustomEvent('vertexselect', { detail: { vertex: { featureId, vertexIndex } } }))
    }
  }

  private onContextMenu(e: maplibregl.MapMouseEvent): void {
    const map = this.map
    if (!map.getLayer(VERTEX_LAYER_ID)) return
    const hits = map.queryRenderedFeatures(e.point, { layers: [VERTEX_LAYER_ID] })
    if (hits.length === 0) return

    const hit = hits[0]
    const featureId = hit.properties?.featureId as string
    const vertexIndex = hit.properties?.vertexIndex as number
    e.preventDefault()
    this.dispatchEvent(new CustomEvent('vertexselect', { detail: { vertex: { featureId, vertexIndex } } }))
    this.dispatchEvent(new CustomEvent('vertexcontextmenu', {
      detail: {
        event: {
          featureId,
          vertexIndex,
          x: e.originalEvent.clientX,
          y: e.originalEvent.clientY,
        },
      },
    }))
  }

  private onKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return
    if (e.key !== 'Delete' && e.key !== 'Backspace') return
    if (!this.selectedVertex) return
    e.preventDefault()
    this.deleteSelectedVertex()
  }
}
