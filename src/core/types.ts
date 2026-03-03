import type maplibregl from 'maplibre-gl'
import type { DrawMode, PathMode } from '../types'

export type { DrawMode, PathMode }

export type SelectedVertex = {
  featureId: string
  vertexIndex: number
}

export type VertexContextMenuEvent = {
  featureId: string
  vertexIndex: number
  x: number
  y: number
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

export type DrawingEngineCoreOptions = {
  initialFeatures?: GeoJSON.FeatureCollection
}

export type VertexEditingOptions = {
  mainSourceId: string
}

export type VertexCommitEvent = CustomEvent<{ feature: GeoJSON.Feature }>
export type VertexSelectEvent = CustomEvent<{ vertex: SelectedVertex | null }>
export type VertexContextMenuCustomEvent = CustomEvent<{ event: VertexContextMenuEvent | null }>

export type DrawingEngineState = {
  features: GeoJSON.FeatureCollection
  drawMode: DrawMode | null
  selectedFeatureIds: Set<string>
  draftCoords: [number, number][]
  selectedVertex: SelectedVertex | null
  contextMenuEvent: ContextMenuEvent | null
  vertexContextMenuEvent: VertexContextMenuEvent | null
  draftContextMenuEvent: DraftContextMenuEvent | null
  rubberBand: { x: number; y: number; width: number; height: number } | null
  highlightedPanelFeatureId: string | null
  isDrawingPath: boolean
  canFinalizeDraft: boolean
  canUndo: boolean
  canRedo: boolean
}

/** Options for the Vanilla DrawingEngine wrapper */
export type DrawingEngineOptions = {
  initialFeatures?: GeoJSON.FeatureCollection
  showControls?: boolean
}

/** Map instance type from Geolonia Embed */
export type GeoloniaMap = maplibregl.Map
