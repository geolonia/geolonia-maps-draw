import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DrawingEngineCore } from '../DrawingEngineCore'

type Handler = (...args: unknown[]) => void

function createMockMap() {
  const handlers: Record<string, Handler[]> = {}
  const sources: Record<string, { setData: ReturnType<typeof vi.fn> }> = {}
  const layers: Set<string> = new Set()
  const canvas = document.createElement('canvas')

  return {
    on(event: string, handler: Handler) {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    },
    off(event: string, handler: Handler) {
      handlers[event] = (handlers[event] || []).filter((h) => h !== handler)
    },
    fire(event: string, data: unknown) {
      for (const h of handlers[event] || []) h(data)
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addSource(id: string, _opts: unknown) {
      sources[id] = { setData: vi.fn() }
    },
    addLayer(opts: { id: string }) {
      layers.add(opts.id)
    },
    removeLayer(id: string) {
      layers.delete(id)
    },
    removeSource(id: string) {
      delete sources[id]
    },
    getSource(id: string) {
      return sources[id] || undefined
    },
    getLayer(id: string) {
      return layers.has(id) ? {} : undefined
    },
    getCanvas: () => canvas,
    queryRenderedFeatures: vi.fn().mockReturnValue([]),
    dragPan: {
      disable: vi.fn(),
      enable: vi.fn(),
    },
    handlers,
    sources,
    layers,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockMap = ReturnType<typeof createMockMap> & { [key: string]: any }

describe('DrawingEngineCore', () => {
  let map: MockMap
  let engine: DrawingEngineCore

  beforeEach(() => {
    map = createMockMap()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    engine = new DrawingEngineCore(map as any)
  })

  afterEach(() => {
    vi.useRealTimers()
    engine.destroy()
  })

  describe('initialization', () => {
    it('sets up with default state', () => {
      expect(engine.drawMode).toBe('point')
      expect(engine.features.features).toEqual([])
      expect(engine.selectedFeatureIds.size).toBe(0)
      expect(engine.isDrawingPath).toBe(false)
      expect(engine.canFinalizeDraft).toBe(false)
      expect(engine.canUndo).toBe(false)
      expect(engine.canRedo).toBe(false)
      expect(engine.rubberBand).toBeNull()
      expect(engine.contextMenuEvent).toBeNull()
      expect(engine.vertexContextMenuEvent).toBeNull()
      expect(engine.selectedVertex).toBeNull()
      expect(engine.draftContextMenuEvent).toBeNull()
      expect(engine.highlightedPanelFeatureId).toBeNull()
    })

    it('accepts initial features', () => {
      const fc: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { _id: 'f1', drawMode: 'point' },
        }],
      }
      engine.destroy()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      engine = new DrawingEngineCore(map as any, { initialFeatures: fc })
      expect(engine.features.features).toHaveLength(1)
    })

    it('creates all MapLibre sources and layers', () => {
      expect(map.sources['geojson-maker-generated-features']).toBeDefined()
      expect(map.sources['geojson-maker-draft']).toBeDefined()
      expect(map.sources['geojson-maker-highlight']).toBeDefined()
      expect(map.sources['geojson-maker-vertex']).toBeDefined()

      expect(map.layers.has('geojson-maker-polygon-layer')).toBe(true)
      expect(map.layers.has('geojson-maker-line-layer')).toBe(true)
      expect(map.layers.has('geojson-maker-symbol-layer')).toBe(true)
      expect(map.layers.has('geojson-maker-point-layer')).toBe(true)
      expect(map.layers.has('geojson-maker-draft-polygon')).toBe(true)
      expect(map.layers.has('geojson-maker-draft-line')).toBe(true)
      expect(map.layers.has('geojson-maker-draft-point')).toBe(true)
      expect(map.layers.has('geojson-maker-highlight-point')).toBe(true)
      expect(map.layers.has('geojson-maker-highlight-line')).toBe(true)
      expect(map.layers.has('geojson-maker-highlight-polygon')).toBe(true)
      expect(map.layers.has('geojson-maker-vertex-layer')).toBe(true)
    })
  })

  describe('draw mode', () => {
    it('changes draw mode', () => {
      engine.setDrawMode('line')
      expect(engine.drawMode).toBe('line')
      expect(engine.isDrawingPath).toBe(true)
    })

    it('resets state on draw mode change', () => {
      engine.setSelectedFeatureIds(new Set(['f1']))
      engine.setDrawMode('polygon')
      expect(engine.selectedFeatureIds.size).toBe(0)
    })

    it('sets draw mode to null', () => {
      engine.setDrawMode(null)
      expect(engine.drawMode).toBeNull()
      expect(engine.isDrawingPath).toBe(false)
    })

    it('emits statechange on mode change', () => {
      const listener = vi.fn()
      engine.addEventListener('statechange', listener)
      engine.setDrawMode('line')
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('click to add features', () => {
    it('adds point on click in point mode', () => {
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features).toHaveLength(1)
      expect(engine.features.features[0].geometry.type).toBe('Point')
      expect(engine.features.features[0].properties?.drawMode).toBe('point')
    })

    it('adds symbol on click in symbol mode', () => {
      engine.setDrawMode('symbol')
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features).toHaveLength(1)
      expect(engine.features.features[0].properties?.drawMode).toBe('symbol')
    })

    it('adds draft coords in line mode', () => {
      engine.setDrawMode('line')
      map.fire('click', {
        point: { x: 10, y: 10 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })
      map.fire('click', {
        point: { x: 20, y: 20 },
        lngLat: { lng: 1, lat: 1 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.canFinalizeDraft).toBe(true)
    })

    it('adds draft coords in polygon mode (needs 3)', () => {
      engine.setDrawMode('polygon')
      for (let i = 0; i < 2; i++) {
        map.fire('click', {
          point: { x: 10, y: 10 },
          lngLat: { lng: i, lat: i },
          originalEvent: { shiftKey: false },
        })
      }
      expect(engine.canFinalizeDraft).toBe(false)

      map.fire('click', {
        point: { x: 30, y: 30 },
        lngLat: { lng: 2, lat: 2 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.canFinalizeDraft).toBe(true)
    })

    it('does not add features when drawMode is null', () => {
      engine.setDrawMode(null)
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features).toHaveLength(0)
    })
  })

  describe('feature selection', () => {
    it('selects a feature on click', () => {
      // Add a feature first
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: false },
      })
      const featureId = engine.features.features[0].properties?._id as string

      // Now click on that feature
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([
        { properties: { _id: featureId } },
      ])
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.selectedFeatureIds.has(featureId)).toBe(true)
    })

    it('deselects a feature on second click', () => {
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: false },
      })
      const featureId = engine.features.features[0].properties?._id as string

      // Select
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([
        { properties: { _id: featureId } },
      ])
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: false },
      })

      // Deselect
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([
        { properties: { _id: featureId } },
      ])
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.selectedFeatureIds.size).toBe(0)
    })

    it('shift-click adds to selection', () => {
      // Add two features
      map.fire('click', {
        point: { x: 10, y: 10 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })
      map.fire('click', {
        point: { x: 20, y: 20 },
        lngLat: { lng: 1, lat: 1 },
        originalEvent: { shiftKey: false },
      })

      const id1 = engine.features.features[0].properties?._id as string
      const id2 = engine.features.features[1].properties?._id as string

      // Select first
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([
        { properties: { _id: id1 } },
      ])
      map.fire('click', {
        point: { x: 10, y: 10 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })

      // Shift-select second
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([
        { properties: { _id: id2 } },
      ])
      map.fire('click', {
        point: { x: 20, y: 20 },
        lngLat: { lng: 1, lat: 1 },
        originalEvent: { shiftKey: true },
      })

      expect(engine.selectedFeatureIds.size).toBe(2)
    })

    it('clears selection on empty click without shift', () => {
      engine.setSelectedFeatureIds(new Set(['some-id']))
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.selectedFeatureIds.size).toBe(0)
    })

    it('shift-click on empty does not clear selection', () => {
      engine.setDrawMode(null) // need to be in null mode for no-op
      engine.setSelectedFeatureIds(new Set(['some-id']))
      map.fire('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: 139.7, lat: 35.6 },
        originalEvent: { shiftKey: true },
      })
      // Selection should not be cleared (shift was held)
      expect(engine.selectedFeatureIds.size).toBe(1)
    })
  })

  describe('finalizeDraft', () => {
    it('creates a LineString feature', () => {
      engine.setDrawMode('line')
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      map.fire('click', { point: { x: 1, y: 1 }, lngLat: { lng: 1, lat: 1 }, originalEvent: { shiftKey: false } })
      engine.finalizeDraft()
      expect(engine.features.features).toHaveLength(1)
      expect(engine.features.features[0].geometry.type).toBe('LineString')
    })

    it('creates a Polygon feature', () => {
      engine.setDrawMode('polygon')
      for (let i = 0; i < 3; i++) {
        map.fire('click', { point: { x: i, y: i }, lngLat: { lng: i, lat: i }, originalEvent: { shiftKey: false } })
      }
      engine.finalizeDraft()
      expect(engine.features.features).toHaveLength(1)
      expect(engine.features.features[0].geometry.type).toBe('Polygon')
    })

    it('does nothing when not in path mode', () => {
      engine.finalizeDraft()
      expect(engine.features.features).toHaveLength(0)
    })

    it('does nothing when not enough draft coords', () => {
      engine.setDrawMode('line')
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.finalizeDraft()
      expect(engine.features.features).toHaveLength(0)
    })

    it('clears draft coords after finalization', () => {
      engine.setDrawMode('line')
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      map.fire('click', { point: { x: 1, y: 1 }, lngLat: { lng: 1, lat: 1 }, originalEvent: { shiftKey: false } })
      engine.finalizeDraft()
      expect(engine.canFinalizeDraft).toBe(false)
    })
  })

  describe('delete features', () => {
    it('deletes selected features', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      const id = engine.features.features[0].properties?._id as string
      engine.setSelectedFeatureIds(new Set([id]))
      engine.deleteSelectedFeatures()
      expect(engine.features.features).toHaveLength(0)
      expect(engine.selectedFeatureIds.size).toBe(0)
    })

    it('does nothing when no features selected', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.deleteSelectedFeatures()
      expect(engine.features.features).toHaveLength(1)
    })
  })

  describe('undo/redo', () => {
    it('undo reverts feature addition', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(engine.features.features).toHaveLength(1)

      engine.undo()
      expect(engine.features.features).toHaveLength(0)
      expect(engine.canUndo).toBe(false)
      expect(engine.canRedo).toBe(true)
    })

    it('redo restores feature', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.undo()
      engine.redo()
      expect(engine.features.features).toHaveLength(1)
    })

    it('keyboard Ctrl+Z triggers undo', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })

      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
      Object.defineProperty(event, 'target', { value: document.body })
      window.dispatchEvent(event)

      expect(engine.features.features).toHaveLength(0)
    })

    it('keyboard Ctrl+Shift+Z triggers redo', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.undo()

      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true })
      Object.defineProperty(event, 'target', { value: document.body })
      window.dispatchEvent(event)

      expect(engine.features.features).toHaveLength(1)
    })

    it('keyboard Ctrl+Y triggers redo', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.undo()

      const event = new KeyboardEvent('keydown', { key: 'y', ctrlKey: true })
      Object.defineProperty(event, 'target', { value: document.body })
      window.dispatchEvent(event)

      expect(engine.features.features).toHaveLength(1)
    })

    it('ignores keyboard shortcuts when focused on input', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      const input = document.createElement('input')
      document.body.appendChild(input)

      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)

      expect(engine.features.features).toHaveLength(1)
      document.body.removeChild(input)
    })
  })

  describe('resetGeoJSON', () => {
    it('clears all features and resets all transient state', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.resetGeoJSON()
      expect(engine.features.features).toHaveLength(0)
      expect(engine.selectedFeatureIds.size).toBe(0)
      expect(engine.highlightedPanelFeatureId).toBeNull()
      expect(engine.selectedVertex).toBeNull()
      expect(engine.contextMenuEvent).toBeNull()
      expect(engine.vertexContextMenuEvent).toBeNull()
      expect(engine.draftContextMenuEvent).toBeNull()
    })

    it('clears pending highlight timer', () => {
      vi.useFakeTimers()
      // Add feature and select it to trigger highlight
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      const id = engine.features.features[0].properties?._id as string

      // Select to start highlight timer
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([
        { properties: { _id: id } },
      ])
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(engine.highlightedPanelFeatureId).toBe(id)

      // Reset while timer is active
      engine.resetGeoJSON()
      expect(engine.highlightedPanelFeatureId).toBeNull()

      // Advancing timer should not re-set highlight
      vi.advanceTimersByTime(2000)
      expect(engine.highlightedPanelFeatureId).toBeNull()
      vi.useRealTimers()
    })
  })

  describe('importCSV', () => {
    it('imports CSV with lat/lng columns', () => {
      engine.importCSV('lat,lng,name\n35.6,139.7,Tokyo\n34.6,135.5,Osaka')
      expect(engine.features.features).toHaveLength(2)
      expect(engine.features.features[0].geometry.type).toBe('Point')
    })
  })

  describe('importGeoJSON', () => {
    const features: GeoJSON.Feature[] = [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { _id: 'imported-1', drawMode: 'point' },
    }]

    it('replaces features in replace mode and resets transient state', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.importGeoJSON(features, 'replace')
      expect(engine.features.features).toHaveLength(1)
      expect(engine.features.features[0].properties?._id).toBe('imported-1')
      expect(engine.selectedVertex).toBeNull()
      expect(engine.contextMenuEvent).toBeNull()
      expect(engine.vertexContextMenuEvent).toBeNull()
      expect(engine.draftContextMenuEvent).toBeNull()
    })

    it('clears pending highlight timer on replace', () => {
      vi.useFakeTimers()
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      const id = engine.features.features[0].properties?._id as string

      // Select to start highlight timer
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([
        { properties: { _id: id } },
      ])
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(engine.highlightedPanelFeatureId).toBe(id)

      // Replace while timer is active
      engine.importGeoJSON(features, 'replace')
      expect(engine.highlightedPanelFeatureId).toBeNull()

      vi.advanceTimersByTime(2000)
      expect(engine.highlightedPanelFeatureId).toBeNull()
      vi.useRealTimers()
    })

    it('merges features in merge mode', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.importGeoJSON(features, 'merge')
      expect(engine.features.features).toHaveLength(2)
    })
  })

  describe('context menu', () => {
    it('opens context menu on feature right-click', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      const id = engine.features.features[0].properties?._id as string

      map.queryRenderedFeatures
        .mockReturnValueOnce([]) // VertexEditingController.onContextMenu: vertex check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: vertex check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: draft check
        .mockReturnValueOnce([{ properties: { _id: id } }]) // DrawingEngineCore.onContextMenu: clickable check

      map.fire('contextmenu', {
        point: { x: 100, y: 100 },
        originalEvent: { clientX: 200, clientY: 300, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })

      expect(engine.contextMenuEvent).not.toBeNull()
      expect(engine.contextMenuEvent!.feature.properties?._id).toBe(id)
    })

    it('closes context menu', () => {
      engine.closeContextMenu()
      expect(engine.contextMenuEvent).toBeNull()
    })

    it('clears menus on vertex right-click (handled by vertex controller)', () => {
      const vertexHit = { properties: { featureId: 'f1', vertexIndex: 0 } }
      map.queryRenderedFeatures
        .mockReturnValueOnce([vertexHit]) // VertexEditingController.onContextMenu: vertex check
        .mockReturnValueOnce([vertexHit]) // DrawingEngineCore.onContextMenu: vertex check
      map.fire('contextmenu', {
        point: { x: 100, y: 100 },
        originalEvent: { clientX: 200, clientY: 300, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })
      expect(engine.contextMenuEvent).toBeNull()
    })

    it('opens draft context menu on draft point right-click', () => {
      engine.setDrawMode('line')
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })

      map.queryRenderedFeatures
        .mockReturnValueOnce([]) // VertexEditingController.onContextMenu: vertex check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: vertex check
        .mockReturnValueOnce([{ properties: { draftIndex: 0 } }]) // DrawingEngineCore.onContextMenu: draft check

      map.fire('contextmenu', {
        point: { x: 100, y: 100 },
        originalEvent: { clientX: 200, clientY: 300, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })

      expect(engine.draftContextMenuEvent).not.toBeNull()
      expect(engine.draftContextMenuEvent!.draftIndex).toBe(0)
    })

    it('clears all menus on empty right-click', () => {
      map.queryRenderedFeatures
        .mockReturnValueOnce([]) // VertexEditingController.onContextMenu: vertex check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: vertex check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: draft check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: clickable check
      map.fire('contextmenu', {
        point: { x: 100, y: 100 },
        originalEvent: { clientX: 200, clientY: 300, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })
      expect(engine.contextMenuEvent).toBeNull()
      expect(engine.vertexContextMenuEvent).toBeNull()
      expect(engine.draftContextMenuEvent).toBeNull()
    })
  })

  describe('draft point operations', () => {
    it('deletes a draft point', () => {
      engine.setDrawMode('line')
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      map.fire('click', { point: { x: 1, y: 1 }, lngLat: { lng: 1, lat: 1 }, originalEvent: { shiftKey: false } })
      map.fire('click', { point: { x: 2, y: 2 }, lngLat: { lng: 2, lat: 2 }, originalEvent: { shiftKey: false } })

      engine.deleteDraftPoint(1)
      expect(engine.canFinalizeDraft).toBe(true) // still 2 points left
    })

    it('closes draft context menu', () => {
      engine.closeDraftContextMenu()
      expect(engine.draftContextMenuEvent).toBeNull()
    })
  })

  describe('closeVertexContextMenu', () => {
    it('clears vertex context menu', () => {
      engine.closeVertexContextMenu()
      expect(engine.vertexContextMenuEvent).toBeNull()
    })
  })

  describe('onClick clears all menus', () => {
    it('clears vertexContextMenu on left click', () => {
      // Trigger a vertex context menu via vertex controller event
      const lineFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] },
        properties: { _id: 'line1', drawMode: 'line' },
      }
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature] })
      engine.setDrawMode(null)
      engine.setSelectedFeatureIds(new Set(['line1']))

      const vertexHit = { properties: { featureId: 'line1', vertexIndex: 0 } }
      // Open vertex context menu (need 2 mocks: one for VertexEditingController, one for DrawingEngineCore)
      map.queryRenderedFeatures
        .mockReturnValueOnce([vertexHit]) // VertexEditingController.onContextMenu: vertex check
        .mockReturnValueOnce([vertexHit]) // DrawingEngineCore.onContextMenu: vertex check
      map.fire('contextmenu', {
        point: { x: 10, y: 10 },
        originalEvent: { clientX: 100, clientY: 200, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })
      expect(engine.vertexContextMenuEvent).not.toBeNull()

      // Left click should close it
      map.fire('click', {
        point: { x: 50, y: 50 },
        lngLat: { lng: 5, lat: 5 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.vertexContextMenuEvent).toBeNull()
    })
  })

  describe('rubber band selection', () => {
    beforeEach(() => {
      engine.setDrawMode(null)
    })

    it('initiates rubber band on mousedown in empty area', () => {
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      expect(map.dragPan.disable).toHaveBeenCalled()
    })

    it('does not initiate when drawMode is set', () => {
      engine.setDrawMode('point')
      map.dragPan.disable.mockClear()
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      expect(map.dragPan.disable).not.toHaveBeenCalled()
    })

    it('does not initiate when clicking on a feature', () => {
      map.queryRenderedFeatures
        .mockReturnValueOnce([]) // VertexEditingController.onMouseDown: vertex check
        .mockReturnValueOnce([{ properties: { _id: 'f1' } }]) // DrawingEngineCore.onRBMouseDown: clickable check
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      expect(map.dragPan.disable).not.toHaveBeenCalled()
    })

    it('shows rubber band on mousemove (>5px)', () => {
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mousemove', { point: { x: 20, y: 20 } })
      expect(engine.rubberBand).not.toBeNull()
      expect(engine.rubberBand!.width).toBe(10)
      expect(engine.rubberBand!.height).toBe(10)
    })

    it('does not show rubber band for small moves (<5px)', () => {
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mousemove', { point: { x: 12, y: 12 } })
      expect(engine.rubberBand).toBeNull()
    })

    it('selects features in rubber band area on mouseup', () => {
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mousemove', { point: { x: 100, y: 100 } })

      map.queryRenderedFeatures.mockReturnValueOnce([
        { properties: { _id: 'f1' } },
        { properties: { _id: 'f2' } },
      ])
      map.fire('mouseup', { point: { x: 100, y: 100 }, originalEvent: { shiftKey: false } })

      expect(engine.selectedFeatureIds.size).toBe(2)
      expect(engine.rubberBand).toBeNull()
    })

    it('shift+rubber band adds to existing selection', () => {
      engine.setSelectedFeatureIds(new Set(['existing']))
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mousemove', { point: { x: 100, y: 100 } })

      map.queryRenderedFeatures.mockReturnValueOnce([
        { properties: { _id: 'new1' } },
      ])
      map.fire('mouseup', { point: { x: 100, y: 100 }, originalEvent: { shiftKey: true } })

      expect(engine.selectedFeatureIds.size).toBe(2)
      expect(engine.selectedFeatureIds.has('existing')).toBe(true)
      expect(engine.selectedFeatureIds.has('new1')).toBe(true)
    })

    it('non-active mouseup does not select', () => {
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      // No move, just release
      map.fire('mouseup', { point: { x: 10, y: 10 }, originalEvent: { shiftKey: false } })
      expect(engine.selectedFeatureIds.size).toBe(0)
    })

    it('mousemove without preceding mousedown is ignored', () => {
      map.fire('mousemove', { point: { x: 20, y: 20 } })
      expect(engine.rubberBand).toBeNull()
    })

    it('mouseup without preceding mousedown is ignored', () => {
      map.fire('mouseup', { point: { x: 20, y: 20 }, originalEvent: { shiftKey: false } })
      expect(engine.selectedFeatureIds.size).toBe(0)
    })
  })

  describe('highlight', () => {
    it('sets highlighted feature temporarily on selection', () => {
      vi.useFakeTimers()

      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      const id = engine.features.features[0].properties?._id as string

      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([
        { properties: { _id: id } },
      ])
      map.fire('click', {
        point: { x: 0, y: 0 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })

      expect(engine.highlightedPanelFeatureId).toBe(id)

      vi.advanceTimersByTime(1501)
      expect(engine.highlightedPanelFeatureId).toBeNull()

      vi.useRealTimers()
    })
  })

  describe('getState', () => {
    it('returns a full state snapshot', () => {
      const state = engine.getState()
      expect(state).toHaveProperty('features')
      expect(state).toHaveProperty('drawMode')
      expect(state).toHaveProperty('selectedFeatureIds')
      expect(state).toHaveProperty('draftCoords')
      expect(state).toHaveProperty('isDrawingPath')
      expect(state).toHaveProperty('canFinalizeDraft')
      expect(state).toHaveProperty('canUndo')
      expect(state).toHaveProperty('canRedo')
    })
  })

  describe('setFeatures', () => {
    it('sets features directly', () => {
      const fc: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { _id: 'direct-set', drawMode: 'point' },
        }],
      }
      engine.setFeatures(fc)
      expect(engine.features.features).toHaveLength(1)
    })

    it('sets features with updater function', () => {
      engine.setFeatures((prev) => ({
        ...prev,
        features: [...prev.features, {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [5, 5] },
          properties: { _id: 'fn-set', drawMode: 'point' },
        }],
      }))
      expect(engine.features.features).toHaveLength(1)
    })
  })

  describe('setSelectedFeatureIds', () => {
    it('accepts updater function', () => {
      engine.setSelectedFeatureIds(new Set(['a']))
      engine.setSelectedFeatureIds((prev) => {
        const next = new Set(prev)
        next.add('b')
        return next
      })
      expect(engine.selectedFeatureIds.size).toBe(2)
    })

    it('stores a defensive copy so external mutation does not affect internal state', () => {
      const externalSet = new Set(['a', 'b'])
      engine.setSelectedFeatureIds(externalSet)
      // Mutate the external set
      externalSet.add('c')
      // Internal state should not be affected
      expect(engine.selectedFeatureIds.size).toBe(2)
      expect(engine.selectedFeatureIds.has('c')).toBe(false)
    })

    it('stores a defensive copy from updater function return value', () => {
      engine.setSelectedFeatureIds(new Set(['a']))
      const returnedSet = new Set(['x', 'y'])
      engine.setSelectedFeatureIds(() => returnedSet)
      // Mutate the returned set
      returnedSet.add('z')
      // Internal state should not be affected
      expect(engine.selectedFeatureIds.size).toBe(2)
      expect(engine.selectedFeatureIds.has('z')).toBe(false)
    })

    it('passes a defensive copy of prev to updater function', () => {
      engine.setSelectedFeatureIds(new Set(['a']))
      engine.setSelectedFeatureIds((prev) => {
        // Mutating prev should not affect internal state
        prev.add('mutated')
        return new Set(['b'])
      })
      expect(engine.selectedFeatureIds.has('mutated')).toBe(false)
      expect(engine.selectedFeatureIds.has('b')).toBe(true)
    })
  })

  describe('destroy', () => {
    it('removes all layers and sources', () => {
      engine.destroy()
      expect(map.layers.size).toBe(0)
      expect(Object.keys(map.sources)).toHaveLength(0)
    })

    it('is idempotent', () => {
      engine.destroy()
      expect(() => engine.destroy()).not.toThrow()
    })

    it('removes event listeners', () => {
      engine.destroy()
      // Map handlers should be empty
      expect(map.handlers['click']?.length).toBe(0)
    })

    it('restores dragPan when destroyed during rubber-band drag', () => {
      engine.setDrawMode(null)
      // Start rubber-band drag
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      expect(map.dragPan.disable).toHaveBeenCalled()

      // Move to activate rubber-band
      map.fire('mousemove', { point: { x: 100, y: 100 } })
      expect(engine.rubberBand).not.toBeNull()

      map.dragPan.enable.mockClear()
      // Destroy while rubber-band is active
      engine.destroy()
      expect(map.dragPan.enable).toHaveBeenCalled()
    })
  })

  describe('click ignores vertex hit', () => {
    it('returns early when clicking on a vertex handle', () => {
      map.queryRenderedFeatures.mockReturnValueOnce([
        { properties: { featureId: 'f1', vertexIndex: 0 } },
      ])
      const prevCount = engine.features.features.length
      map.fire('click', {
        point: { x: 10, y: 10 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features.length).toBe(prevCount)
    })
  })

  describe('click ignores after rubber band', () => {
    it('ignores click immediately after rubber band selection', () => {
      vi.useFakeTimers()
      engine.setDrawMode(null)

      // Simulate rubber band
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mousemove', { point: { x: 100, y: 100 } })
      map.queryRenderedFeatures.mockReturnValueOnce([])
      map.fire('mouseup', { point: { x: 100, y: 100 }, originalEvent: { shiftKey: false } })

      // Immediate click should be ignored
      engine.setDrawMode('point')
      map.fire('click', {
        point: { x: 50, y: 50 },
        lngLat: { lng: 5, lat: 5 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features).toHaveLength(0)

      vi.advanceTimersByTime(51)

      // Now click should work
      map.fire('click', {
        point: { x: 50, y: 50 },
        lngLat: { lng: 5, lat: 5 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features).toHaveLength(1)

      vi.useRealTimers()
    })
  })

  describe('click ignores after vertex drag', () => {
    it('ignores click when justDragged is true', () => {
      vi.useFakeTimers()

      // Set up a line feature with vertex handles
      const lineFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] },
        properties: { _id: 'line1', drawMode: 'line' },
      }
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature] })
      engine.setDrawMode(null)
      engine.setSelectedFeatureIds(new Set(['line1']))

      // Simulate vertex drag: mousedown → mousemove → mouseup
      map.queryRenderedFeatures
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 0 } }]) // vertex hit
        .mockReturnValueOnce([{ properties: { _id: 'line1' } }]) // clickable hit
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mousemove', { point: { x: 30, y: 30 }, lngLat: { lng: 3, lat: 3 } })
      map.fire('mouseup', { point: { x: 30, y: 30 }, originalEvent: { shiftKey: false } })

      // Immediately click → should be ignored because justDragged is true
      engine.setDrawMode('point')
      map.fire('click', {
        point: { x: 50, y: 50 },
        lngLat: { lng: 5, lat: 5 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features).toHaveLength(1) // only the original line, no new point

      vi.advanceTimersByTime(51)

      // After timeout, click should work
      map.fire('click', {
        point: { x: 50, y: 50 },
        lngLat: { lng: 5, lat: 5 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features).toHaveLength(2)

      vi.useRealTimers()
    })
  })

  describe('shift-click toggle selection', () => {
    it('shift-click on already selected feature deselects it', () => {
      // Add a point
      map.fire('click', {
        point: { x: 0, y: 0 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })
      const id = engine.features.features[0].properties?._id as string

      // Select the feature
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([{ properties: { _id: id } }])
      map.fire('click', {
        point: { x: 0, y: 0 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.selectedFeatureIds.has(id)).toBe(true)

      // Shift-click same feature → deselect
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([{ properties: { _id: id } }])
      map.fire('click', {
        point: { x: 0, y: 0 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: true },
      })
      expect(engine.selectedFeatureIds.has(id)).toBe(false)
    })
  })

  describe('keyboard shortcuts on mac', () => {
    it('uses metaKey for undo on mac', () => {
      const originalUA = navigator.userAgent
      Object.defineProperty(navigator, 'userAgent', { value: 'Macintosh', configurable: true })

      // Add a feature so undo has something to undo
      map.fire('click', {
        point: { x: 0, y: 0 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features).toHaveLength(1)

      // metaKey+z should trigger undo on mac
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }))
      expect(engine.features.features).toHaveLength(0)

      Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true })
    })

    it('uses metaKey for redo on mac', () => {
      const originalUA = navigator.userAgent
      Object.defineProperty(navigator, 'userAgent', { value: 'Macintosh', configurable: true })

      map.fire('click', {
        point: { x: 0, y: 0 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }))
      expect(engine.features.features).toHaveLength(0)

      // metaKey+shift+z should trigger redo on mac
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true }))
      expect(engine.features.features).toHaveLength(1)

      Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true })
    })

    it('ignores key without metaKey on mac', () => {
      const originalUA = navigator.userAgent
      Object.defineProperty(navigator, 'userAgent', { value: 'Macintosh', configurable: true })

      map.fire('click', {
        point: { x: 0, y: 0 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })
      expect(engine.features.features).toHaveLength(1)

      // z without metaKey on mac → should be ignored
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
      expect(engine.features.features).toHaveLength(1) // not undone

      Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true })
    })
  })

  describe('sync with missing sources', () => {
    it('handles missing draft source gracefully', () => {
      // Remove the draft source
      delete map.sources['geojson-maker-draft']
      // setDrawMode triggers syncDraftSource, which should handle missing source
      expect(() => engine.setDrawMode('line')).not.toThrow()
    })

    it('handles missing highlight source gracefully', () => {
      // Remove the highlight source
      delete map.sources['geojson-maker-highlight']
      // setSelectedFeatureIds triggers syncHighlightSource, which should handle missing source
      expect(() => engine.setSelectedFeatureIds(new Set(['x']))).not.toThrow()
    })
  })

  describe('contextmenu with draft point string draftIndex', () => {
    it('handles string draftIndex correctly', () => {
      engine.setDrawMode('line')
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })

      map.queryRenderedFeatures
        .mockReturnValueOnce([]) // VertexEditingController.onContextMenu: vertex check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: vertex check
        .mockReturnValueOnce([{ properties: { draftIndex: '0' } }]) // DrawingEngineCore.onContextMenu: draft check (string)

      map.fire('contextmenu', {
        point: { x: 100, y: 100 },
        originalEvent: { clientX: 200, clientY: 300, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })

      expect(engine.draftContextMenuEvent).not.toBeNull()
      expect(engine.draftContextMenuEvent!.draftIndex).toBe(0)
    })

    it('ignores invalid draftIndex', () => {
      engine.setDrawMode('line')
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })

      map.queryRenderedFeatures
        .mockReturnValueOnce([]) // VertexEditingController.onContextMenu: vertex check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: vertex check
        .mockReturnValueOnce([{ properties: { draftIndex: -1 } }]) // DrawingEngineCore.onContextMenu: invalid draft index

      map.fire('contextmenu', {
        point: { x: 100, y: 100 },
        originalEvent: { clientX: 200, clientY: 300, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })

      expect(engine.draftContextMenuEvent).toBeNull()
    })
  })

  describe('vertex editing integration', () => {
    const lineFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] },
      properties: { _id: 'line1', drawMode: 'line' },
    }

    function setupLineWithSelection() {
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature] })
      engine.setDrawMode(null)
      engine.setSelectedFeatureIds(new Set(['line1']))
    }

    it('updates features when vertex is dragged (vertexcommit)', () => {
      // Add a second feature so the map() in vertexcommit handler has both match and non-match branches
      const pointFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [5, 5] },
        properties: { _id: 'point1', drawMode: 'point' },
      }
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature, pointFeature] })
      engine.setDrawMode(null)
      engine.setSelectedFeatureIds(new Set(['line1']))

      // mousedown: VertexEditingController queries vertex layer, DrawingEngineCore queries clickable layers
      map.queryRenderedFeatures
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 1 } }]) // vertex hit
        .mockReturnValueOnce([{ properties: { _id: 'line1' } }]) // clickable hit (prevents RB)
      map.fire('mousedown', { point: { x: 10, y: 10 } })

      // mousemove with new coordinate
      map.fire('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })

      // mouseup triggers vertexcommit because hasMoved=true
      map.fire('mouseup', { point: { x: 20, y: 20 }, originalEvent: { shiftKey: false } })

      // The line feature should be updated, the point feature should be unchanged
      const updated = engine.features.features.find((f) => f.properties?._id === 'line1')!
      expect(updated.geometry.type).toBe('LineString')
      const coords = (updated.geometry as GeoJSON.LineString).coordinates
      expect(coords[1]).toEqual([5, 5])

      const unchanged = engine.features.features.find((f) => f.properties?._id === 'point1')!
      expect(unchanged).toEqual(pointFeature)
    })

    it('deleteSelectedVertex removes a vertex via vertexcommit', () => {
      setupLineWithSelection()

      // mousedown on vertex (no move) → mouseup → triggers vertexselect
      map.queryRenderedFeatures
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 1 } }]) // vertex hit
        .mockReturnValueOnce([{ properties: { _id: 'line1' } }]) // clickable hit
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mouseup', { point: { x: 10, y: 10 }, originalEvent: { shiftKey: false } })

      // Vertex should be selected
      expect(engine.selectedVertex).toEqual({ featureId: 'line1', vertexIndex: 1 })

      // Delete the vertex
      engine.deleteSelectedVertex()

      // Feature should have one fewer vertex (3 → 2)
      const updated = engine.features.features[0]
      expect((updated.geometry as GeoJSON.LineString).coordinates).toHaveLength(2)
      // The middle vertex [1,1] was removed
      expect((updated.geometry as GeoJSON.LineString).coordinates).toEqual([[0, 0], [2, 2]])
    })
  })

  describe('syncVertexHandles invalidates selectedVertex', () => {
    it('clears selectedVertex when selection changes to different feature', () => {
      const lineFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] },
        properties: { _id: 'line1', drawMode: 'line' },
      }
      const lineFeature2: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[3, 3], [4, 4], [5, 5]] },
        properties: { _id: 'line2', drawMode: 'line' },
      }
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature, lineFeature2] })
      engine.setDrawMode(null)
      engine.setSelectedFeatureIds(new Set(['line1']))

      // Select a vertex on line1
      map.queryRenderedFeatures
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 1 } }])
        .mockReturnValueOnce([{ properties: { _id: 'line1' } }])
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mouseup', { point: { x: 10, y: 10 }, originalEvent: { shiftKey: false } })
      expect(engine.selectedVertex).toEqual({ featureId: 'line1', vertexIndex: 1 })

      // Change selection to a different feature
      engine.setSelectedFeatureIds(new Set(['line2']))
      // selectedVertex should be invalidated since it belongs to line1
      expect(engine.selectedVertex).toBeNull()
    })

    it('clears selectedVertex when selection is cleared', () => {
      const lineFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] },
        properties: { _id: 'line1', drawMode: 'line' },
      }
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature] })
      engine.setDrawMode(null)
      engine.setSelectedFeatureIds(new Set(['line1']))

      // Select a vertex
      map.queryRenderedFeatures
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 0 } }])
        .mockReturnValueOnce([{ properties: { _id: 'line1' } }])
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mouseup', { point: { x: 10, y: 10 }, originalEvent: { shiftKey: false } })
      expect(engine.selectedVertex).not.toBeNull()

      // Clear selection
      engine.setSelectedFeatureIds(new Set())
      expect(engine.selectedVertex).toBeNull()
    })
  })

  describe('contextmenu for nonexistent feature', () => {
    it('falls through when feature not found in store', () => {
      map.queryRenderedFeatures
        .mockReturnValueOnce([]) // VertexEditingController.onContextMenu: vertex check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: vertex check
        .mockReturnValueOnce([]) // DrawingEngineCore.onContextMenu: draft check
        .mockReturnValueOnce([{ properties: { _id: 'nonexistent' } }]) // DrawingEngineCore.onContextMenu: feature check

      map.fire('contextmenu', {
        point: { x: 100, y: 100 },
        originalEvent: { clientX: 200, clientY: 300, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })

      expect(engine.contextMenuEvent).toBeNull()
    })
  })
})
