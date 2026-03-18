// CSS (side-effect import)
import './drawing-engine.css'

// Components
export { DrawControlPanel } from './components/DrawControlPanel'
export type { DrawControlPanelProps } from './components/DrawControlPanel'
export { DrawModeSelector } from './components/DrawModeSelector'
export { DRAW_MODE_ICONS } from './components/DrawModeIcons'
export { VertexContextMenu } from './components/VertexContextMenu'
export { UndoButton } from './components/UndoButton'
export type { UndoButtonProps } from './components/UndoButton'
export { RedoButton } from './components/RedoButton'
export type { RedoButtonProps } from './components/RedoButton'
export { DeleteButton } from './components/DeleteButton'
export type { DeleteButtonProps } from './components/DeleteButton'
export { ResetButton } from './components/ResetButton'
export type { ResetButtonProps } from './components/ResetButton'
export { FinalizeButton } from './components/FinalizeButton'
export type { FinalizeButtonProps } from './components/FinalizeButton'

// Main hook
export { useDrawingEngine } from './hooks/useDrawingEngine'
export type { DrawingEngineOptions, DrawingEngineResult, ContextMenuEvent, DraftContextMenuEvent } from './hooks/useDrawingEngine'

// Sub hooks
export { useUndoable } from './hooks/useUndoable'
export { useVertexEditing } from './hooks/useVertexEditing'
export type { SelectedVertex, VertexContextMenuEvent } from './hooks/useVertexEditing'

// Utilities
export {
  createPointFeature,
  createPathFeature,
  createDraftFeatureCollection,
  parseGeoJSONImport,
  nextFeatureId,
  closePolygonRing,
} from './lib/geojson-helpers'
export { parseCSV } from './lib/csv-helpers'
export { clampPosition } from './lib/clamp-position'
export { canDeleteVertex, applyVertexDelete } from './lib/vertex-helpers'

// Geolonia integration
export { useGeoloniaMap } from './hooks/useGeoloniaMap'
export type { GeoloniaMapSettings } from './hooks/useGeoloniaMap'
export { assertGeolonia, GeoloniaNotFoundError, GeoloniaEmbedNotDetectedError, hasEmbedScript, assertGeoloniaEmbed, GeoloniaEmbedRequiredError } from './lib/assert-geolonia'
export { GeoloniaIcon } from './components/GeoloniaIcon'

// Core classes (for advanced usage)
export { DrawingEngineCore } from './core/DrawingEngineCore'
export { UndoableStore } from './core/UndoableStore'

// Types
export type { DrawMode, PathMode } from './types'
