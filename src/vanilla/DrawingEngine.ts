import type maplibregl from 'maplibre-gl'
import type { DrawMode, DrawingEngineOptions } from '../core/types'
import { DrawingEngineCore } from '../core/DrawingEngineCore'
import { DrawControlPanelElement } from './dom/DrawControlPanelElement'
import { VertexContextMenuElement } from './dom/VertexContextMenuElement'
import { RubberBandElement } from './dom/RubberBandElement'
import { canDeleteVertex } from '../lib/vertex-helpers'
import { assertGeolonia } from '../lib/assert-geolonia'

/**
 * Vanilla JS drawing engine — no React required.
 * Wraps `DrawingEngineCore` with DOM-based UI controls.
 *
 * Events:
 * - 'change'     : Emitted when features change
 * - 'modechange' : Emitted when draw mode changes
 * - 'select'     : Emitted when selection changes
 */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

export class DrawingEngine extends EventTarget {
  private core: DrawingEngineCore
  private map: maplibregl.Map
  private panel: DrawControlPanelElement | null = null
  private vertexMenu: VertexContextMenuElement | null = null
  private rubberBand: RubberBandElement
  private controlsVisible = false
  private prevDrawMode: DrawMode | null = null
  private prevSelectedIds: Set<string> = new Set()

  constructor(map: maplibregl.Map, options?: DrawingEngineOptions) {
    super()
    assertGeolonia()
    this.map = map

    this.core = new DrawingEngineCore(map, {
      initialFeatures: options?.initialFeatures,
    })

    this.rubberBand = new RubberBandElement()
    const container = map.getContainer()
    container.appendChild(this.rubberBand.element)

    this.core.addEventListener('statechange', () => {
      this.syncUI()
      this.dispatchEvent(new Event('change'))

      if (this.core.drawMode !== this.prevDrawMode) {
        this.prevDrawMode = this.core.drawMode
        this.dispatchEvent(new Event('modechange'))
      }

      const currentIds = this.core.selectedFeatureIds
      if (!setsEqual(this.prevSelectedIds, currentIds)) {
        this.prevSelectedIds = new Set(currentIds)
        this.dispatchEvent(new Event('select'))
      }
    })

    if (options?.showControls !== false) {
      this.showControls()
    }
  }

  // === State getters (delegates to Core) ===

  get features(): GeoJSON.FeatureCollection {
    return this.core.features
  }

  get drawMode(): DrawMode | null {
    return this.core.drawMode
  }

  get selectedFeatureIds(): Set<string> {
    return this.core.selectedFeatureIds
  }

  get isDrawingPath(): boolean {
    return this.core.isDrawingPath
  }

  get canFinalizeDraft(): boolean {
    return this.core.canFinalizeDraft
  }

  get canUndo(): boolean {
    return this.core.canUndo
  }

  get canRedo(): boolean {
    return this.core.canRedo
  }

  // === Actions (delegates to Core) ===

  setDrawMode(mode: DrawMode | null): void {
    this.core.setDrawMode(mode)
  }

  setFeatures(fc: GeoJSON.FeatureCollection | ((prev: GeoJSON.FeatureCollection) => GeoJSON.FeatureCollection)): void {
    this.core.setFeatures(fc)
  }

  finalizeDraft(): void {
    this.core.finalizeDraft()
  }

  deleteSelectedFeatures(): void {
    this.core.deleteSelectedFeatures()
  }

  deleteSelectedVertex(): void {
    this.core.deleteSelectedVertex()
  }

  resetGeoJSON(): void {
    this.core.resetGeoJSON()
  }

  undo(): void {
    this.core.undo()
  }

  redo(): void {
    this.core.redo()
  }

  importCSV(text: string): void {
    this.core.importCSV(text)
  }

  importGeoJSON(features: GeoJSON.Feature[], mode: 'replace' | 'merge'): void {
    this.core.importGeoJSON(features, mode)
  }

  // === UI controls ===

  showControls(): void {
    if (this.controlsVisible) return
    this.controlsVisible = true

    this.panel = new DrawControlPanelElement({
      onChangeMode: (mode) => this.core.setDrawMode(mode),
      onFinalize: () => this.core.finalizeDraft(),
      onDeleteFeature: () => this.core.deleteSelectedFeatures(),
      onResetGeoJSON: () => this.core.resetGeoJSON(),
      onUndo: () => this.core.undo(),
      onRedo: () => this.core.redo(),
    })
    this.map.getContainer().appendChild(this.panel.element)
    this.syncUI()
  }

  hideControls(): void {
    if (!this.controlsVisible) return
    this.controlsVisible = false

    if (this.panel) {
      this.panel.destroy()
      this.panel = null
    }
    this.removeVertexMenu()
  }

  destroy(): void {
    this.hideControls()
    this.rubberBand.element.remove()
    this.core.destroy()
  }

  // === Private: UI sync ===

  private syncUI(): void {
    // Panel
    if (this.panel) {
      this.panel.update({
        drawMode: this.core.drawMode,
        isDrawingPath: this.core.isDrawingPath,
        canFinalizeDraft: this.core.canFinalizeDraft,
        hasSelectedFeature: this.core.selectedFeatureIds.size > 0,
        selectedCount: this.core.selectedFeatureIds.size,
        canUndo: this.core.canUndo,
        canRedo: this.core.canRedo,
      })
    }

    // Rubber band
    this.rubberBand.update(this.core.rubberBand)

    // Vertex context menu
    const vcm = this.core.vertexContextMenuEvent
    if (vcm) {
      this.removeVertexMenu()
      const selectedFeature = this.core.features.features.find(
        (f) => f.properties?._id === vcm.featureId,
      )
      this.vertexMenu = new VertexContextMenuElement({
        position: { x: vcm.x, y: vcm.y },
        canDelete: selectedFeature ? canDeleteVertex(selectedFeature) : false,
        onDelete: () => {
          this.core.deleteSelectedVertex()
          this.core.closeVertexContextMenu()
          this.removeVertexMenu()
        },
        onClose: () => {
          this.core.closeVertexContextMenu()
          this.removeVertexMenu()
        },
      })
      document.body.appendChild(this.vertexMenu.element)
    } else {
      this.removeVertexMenu()
    }
  }

  private removeVertexMenu(): void {
    if (this.vertexMenu) {
      this.vertexMenu.destroy()
      this.vertexMenu = null
    }
  }
}
