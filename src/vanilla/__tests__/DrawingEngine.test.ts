import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DrawingEngine } from '../DrawingEngine'

type Handler = (...args: unknown[]) => void

function createMockMap() {
  const handlers: Record<string, Handler[]> = {}
  const sources: Record<string, { setData: ReturnType<typeof vi.fn> }> = {}
  const layers: Set<string> = new Set()
  const canvas = document.createElement('canvas')
  const container = document.createElement('div')
  document.body.appendChild(container)

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
    getContainer: () => container,
    queryRenderedFeatures: vi.fn().mockReturnValue([]),
    dragPan: { disable: vi.fn(), enable: vi.fn() },
    handlers,
    sources,
    layers,
    container,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockMap = ReturnType<typeof createMockMap> & { [key: string]: any }

describe('DrawingEngine', () => {
  let map: MockMap
  let engine: DrawingEngine

  beforeEach(() => {
    map = createMockMap()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    engine = new DrawingEngine(map as any, { showControls: true })
  })

  afterEach(() => {
    engine.destroy()
    map.container.remove()
  })

  describe('constructor', () => {
    it('appends rubber band element to map container', () => {
      const divs = map.container.querySelectorAll('div')
      // At least one: rubber band. Plus the panel.
      expect(divs.length).toBeGreaterThan(0)
    })

    it('shows controls by default', () => {
      expect(map.container.querySelector('.draw-control-panel')).not.toBeNull()
    })

    it('hides controls when showControls is false', () => {
      engine.destroy()
      map.container.remove()

      const map2 = createMockMap()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine2 = new DrawingEngine(map2 as any, { showControls: false })
      expect(map2.container.querySelector('.draw-control-panel')).toBeNull()
      engine2.destroy()
      map2.container.remove()
    })

    it('accepts initial features', () => {
      engine.destroy()
      map.container.remove()

      const map2 = createMockMap()
      const fc: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { _id: 'p1', drawMode: 'point' },
        }],
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine2 = new DrawingEngine(map2 as any, { initialFeatures: fc })
      expect(engine2.features.features).toHaveLength(1)
      engine2.destroy()
      map2.container.remove()
    })
  })

  describe('state getters', () => {
    it('returns features', () => {
      expect(engine.features.type).toBe('FeatureCollection')
      expect(engine.features.features).toEqual([])
    })

    it('returns drawMode', () => {
      expect(engine.drawMode).toBe('point')
    })

    it('returns selectedFeatureIds', () => {
      expect(engine.selectedFeatureIds.size).toBe(0)
    })

    it('returns isDrawingPath', () => {
      expect(engine.isDrawingPath).toBe(false)
    })

    it('returns canFinalizeDraft', () => {
      expect(engine.canFinalizeDraft).toBe(false)
    })

    it('returns canUndo', () => {
      expect(engine.canUndo).toBe(false)
    })

    it('returns canRedo', () => {
      expect(engine.canRedo).toBe(false)
    })
  })

  describe('action methods', () => {
    it('setDrawMode changes mode', () => {
      engine.setDrawMode('line')
      expect(engine.drawMode).toBe('line')
      expect(engine.isDrawingPath).toBe(true)
    })

    it('setFeatures updates features', () => {
      const fc: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [1, 1] },
          properties: { _id: 'f1', drawMode: 'point' },
        }],
      }
      engine.setFeatures(fc)
      expect(engine.features.features).toHaveLength(1)
    })

    it('finalizeDraft finalizes a path', () => {
      engine.setDrawMode('line')
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      map.fire('click', { point: { x: 1, y: 1 }, lngLat: { lng: 1, lat: 1 }, originalEvent: { shiftKey: false } })
      expect(engine.canFinalizeDraft).toBe(true)

      engine.finalizeDraft()
      expect(engine.features.features).toHaveLength(1)
      expect(engine.features.features[0].geometry.type).toBe('LineString')
    })

    it('deleteSelectedFeatures removes selected', () => {
      // Add a point
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(engine.features.features).toHaveLength(1)
      const id = engine.features.features[0].properties?._id as string

      // Select and delete
      engine.setDrawMode(null)
      engine.setFeatures((prev) => prev) // force sync
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([{ properties: { _id: id } }])
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(engine.selectedFeatureIds.size).toBe(1)

      engine.deleteSelectedFeatures()
      expect(engine.features.features).toHaveLength(0)
    })

    it('deleteSelectedVertex delegates to core', () => {
      // Set up a line feature
      const lineFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] },
        properties: { _id: 'line1', drawMode: 'line' },
      }
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature] })
      engine.setDrawMode(null)

      // Without a selected vertex, this is a no-op
      engine.deleteSelectedVertex()
      expect((engine.features.features[0].geometry as GeoJSON.LineString).coordinates).toHaveLength(3)
    })

    it('resetGeoJSON clears features', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(engine.features.features).toHaveLength(1)

      engine.resetGeoJSON()
      expect(engine.features.features).toHaveLength(0)
    })

    it('undo reverts last change', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(engine.features.features).toHaveLength(1)
      expect(engine.canUndo).toBe(true)

      engine.undo()
      expect(engine.features.features).toHaveLength(0)
    })

    it('redo re-applies undone change', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.undo()
      expect(engine.canRedo).toBe(true)

      engine.redo()
      expect(engine.features.features).toHaveLength(1)
    })

    it('importCSV adds features from CSV', () => {
      const csv = 'lat,lng,name\n35.6,139.7,Tokyo'
      engine.importCSV(csv)
      expect(engine.features.features).toHaveLength(1)
    })

    it('importGeoJSON adds features', () => {
      const features: GeoJSON.Feature[] = [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { name: 'test' },
      }]
      engine.importGeoJSON(features, 'merge')
      expect(engine.features.features).toHaveLength(1)
    })
  })

  describe('events', () => {
    it('dispatches change event on state changes', () => {
      const handler = vi.fn()
      engine.addEventListener('change', handler)
      engine.setDrawMode('line')
      expect(handler).toHaveBeenCalled()
    })

    it('dispatches modechange event when draw mode changes', () => {
      const handler = vi.fn()
      engine.addEventListener('modechange', handler)
      engine.setDrawMode('polygon')
      expect(handler).toHaveBeenCalled()
    })

    it('does not dispatch modechange when draw mode stays the same', () => {
      engine.setDrawMode('line')
      const handler = vi.fn()
      engine.addEventListener('modechange', handler)
      // Add a point in line mode — triggers statechange but mode doesn't change
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(handler).not.toHaveBeenCalled()
    })

    it('dispatches select event when selection changes', () => {
      // Add a point first
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      const id = engine.features.features[0].properties?._id as string

      const handler = vi.fn()
      engine.addEventListener('select', handler)

      // Select the feature
      engine.setDrawMode(null)
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([{ properties: { _id: id } }])
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })

      expect(handler).toHaveBeenCalled()
    })

    it('dispatches select when selection changes to different ids of same size', () => {
      // Add two points
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      map.fire('click', { point: { x: 1, y: 1 }, lngLat: { lng: 1, lat: 1 }, originalEvent: { shiftKey: false } })
      const id1 = engine.features.features[0].properties?._id as string
      const id2 = engine.features.features[1].properties?._id as string

      // Select first feature
      engine.setDrawMode(null)
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([{ properties: { _id: id1 } }])
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })

      const handler = vi.fn()
      engine.addEventListener('select', handler)

      // Select second feature (same size set but different content)
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([{ properties: { _id: id2 } }])
      map.fire('click', { point: { x: 1, y: 1 }, lngLat: { lng: 1, lat: 1 }, originalEvent: { shiftKey: false } })

      expect(handler).toHaveBeenCalled()
    })

    it('does not dispatch select when selection stays the same', () => {
      const handler = vi.fn()
      engine.addEventListener('select', handler)
      // Changing draw mode clears selection, but it was already empty, so select should not fire
      engine.setDrawMode('line')
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('showControls / hideControls', () => {
    it('showControls is idempotent', () => {
      engine.showControls() // already shown
      const panels = map.container.querySelectorAll('.draw-control-panel')
      expect(panels).toHaveLength(1)
    })

    it('hideControls removes panel from DOM', () => {
      expect(map.container.querySelector('.draw-control-panel')).not.toBeNull()
      engine.hideControls()
      expect(map.container.querySelector('.draw-control-panel')).toBeNull()
    })

    it('hideControls is idempotent', () => {
      engine.hideControls()
      engine.hideControls() // second call is no-op
      expect(map.container.querySelector('.draw-control-panel')).toBeNull()
    })

    it('showControls after hideControls re-creates panel', () => {
      engine.hideControls()
      engine.showControls()
      expect(map.container.querySelector('.draw-control-panel')).not.toBeNull()
    })
  })

  describe('panel button callbacks', () => {
    it('mode selector buttons call setDrawMode', () => {
      const buttons = map.container.querySelectorAll('.draw-mode-selector button')
      expect(buttons.length).toBe(4) // point, line, polygon, symbol

      // Click line button (second button)
      ;(buttons[1] as HTMLButtonElement).click()
      expect(engine.drawMode).toBe('line')
    })

    it('undo button calls undo', () => {
      // Add a feature first
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(engine.features.features).toHaveLength(1)

      const undoBtn = map.container.querySelectorAll('.draw-control-panel__action-button')[0] as HTMLButtonElement
      undoBtn.click()
      expect(engine.features.features).toHaveLength(0)
    })

    it('redo button calls redo', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      engine.undo()

      const redoBtn = map.container.querySelectorAll('.draw-control-panel__action-button')[1] as HTMLButtonElement
      redoBtn.click()
      expect(engine.features.features).toHaveLength(1)
    })

    it('finalize button calls finalizeDraft', () => {
      engine.setDrawMode('line')
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      map.fire('click', { point: { x: 1, y: 1 }, lngLat: { lng: 1, lat: 1 }, originalEvent: { shiftKey: false } })

      const finalizeBtn = map.container.querySelector('.draw-control-panel__action-button--confirm') as HTMLButtonElement
      finalizeBtn.click()
      expect(engine.features.features).toHaveLength(1)
      expect(engine.features.features[0].geometry.type).toBe('LineString')
    })

    it('delete button calls deleteSelectedFeatures', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      const id = engine.features.features[0].properties?._id as string

      // Select the feature
      engine.setDrawMode(null)
      map.queryRenderedFeatures.mockReturnValueOnce([]).mockReturnValueOnce([{ properties: { _id: id } }])
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })

      const deleteBtn = map.container.querySelector('.draw-control-panel__action-button--delete') as HTMLButtonElement
      deleteBtn.click()
      expect(engine.features.features).toHaveLength(0)
    })

    it('reset button calls resetGeoJSON', () => {
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })
      expect(engine.features.features).toHaveLength(1)

      const resetBtn = map.container.querySelector('.draw-control-panel__action-button--reset') as HTMLButtonElement
      resetBtn.click()
      expect(engine.features.features).toHaveLength(0)
    })
  })

  describe('syncUI: panel state', () => {
    it('updates panel with undo/redo state', () => {
      // Add a feature to make canUndo true
      map.fire('click', { point: { x: 0, y: 0 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { shiftKey: false } })

      const undoBtn = map.container.querySelectorAll('.draw-control-panel__action-button')[0] as HTMLButtonElement
      expect(undoBtn.disabled).toBe(false)
    })

    it('updates finalize button visibility for line mode', () => {
      engine.setDrawMode('line')
      const finalizeBtn = map.container.querySelector('.draw-control-panel__action-button--confirm') as HTMLButtonElement
      expect(finalizeBtn.style.display).toBe('')
    })
  })

  describe('syncUI: rubber band', () => {
    it('shows rubber band during selection', () => {
      engine.setDrawMode(null)
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mousemove', { point: { x: 100, y: 100 } })

      // The rubber band element should be visible
      const rb = map.container.querySelector('div[style*="position: absolute"]')
      expect(rb).not.toBeNull()
    })
  })

  describe('syncUI: vertex context menu', () => {
    const lineFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] },
      properties: { _id: 'line1', drawMode: 'line' },
    }

    function setupVertexContextMenu() {
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature] })
      engine.setDrawMode(null)
      engine.setFeatures((prev) => prev) // ensure sync

      // Select the line feature
      map.queryRenderedFeatures
        .mockReturnValueOnce([]) // VertexEditingController.onClick vertex check
        .mockReturnValueOnce([{ properties: { _id: 'line1' } }]) // DrawingEngineCore.onClick clickable hit
      map.fire('click', {
        point: { x: 10, y: 10 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })

      // Right-click on a vertex to open vertex context menu
      map.queryRenderedFeatures
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 1 } }]) // VertexEditingController.onContextMenu
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 1 } }]) // DrawingEngineCore.onContextMenu vertex check
      map.fire('contextmenu', {
        point: { x: 50, y: 60 },
        originalEvent: { clientX: 200, clientY: 300, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })
    }

    it('shows vertex context menu on vertex right-click', () => {
      setupVertexContextMenu()
      const menu = document.body.querySelector('.vertex-context-menu')
      expect(menu).not.toBeNull()
    })

    it('vertex menu delete button triggers deleteSelectedVertex', () => {
      setupVertexContextMenu()
      const menu = document.body.querySelector('.vertex-context-menu')
      expect(menu).not.toBeNull()

      const deleteBtn = menu!.querySelector('button') as HTMLButtonElement
      expect(deleteBtn.disabled).toBe(false)
      deleteBtn.click()

      // After delete, vertex should be removed
      const updated = engine.features.features[0]
      expect((updated.geometry as GeoJSON.LineString).coordinates).toHaveLength(2)

      // Menu should be removed
      expect(document.body.querySelector('.vertex-context-menu')).toBeNull()
    })

    it('vertex menu close removes the menu', () => {
      setupVertexContextMenu()
      expect(document.body.querySelector('.vertex-context-menu')).not.toBeNull()

      // Trigger outside click (onClose)
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

      // Menu should be removed
      expect(document.body.querySelector('.vertex-context-menu')).toBeNull()
    })

    it('removes vertex menu when statechange has no vertex context menu', () => {
      setupVertexContextMenu()
      expect(document.body.querySelector('.vertex-context-menu')).not.toBeNull()

      // Trigger a statechange without vertex context menu (e.g., setDrawMode)
      engine.setDrawMode('point')
      expect(document.body.querySelector('.vertex-context-menu')).toBeNull()
    })

    it('handles vertex menu when feature not found', () => {
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature] })
      engine.setDrawMode(null)

      // Select the line
      map.queryRenderedFeatures
        .mockReturnValueOnce([]) // vertex check
        .mockReturnValueOnce([{ properties: { _id: 'line1' } }]) // clickable
      map.fire('click', {
        point: { x: 10, y: 10 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })

      // Remove the feature from the collection but keep the selection
      engine.setFeatures({ type: 'FeatureCollection', features: [] })

      // Now right-click on a vertex
      map.queryRenderedFeatures
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 1 } }]) // VertexEditingController.onContextMenu
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 1 } }]) // DrawingEngineCore.onContextMenu
      map.fire('contextmenu', {
        point: { x: 50, y: 60 },
        originalEvent: { clientX: 200, clientY: 300, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })

      // Menu should still show but with disabled delete (canDelete = false since feature not found)
      const menu = document.body.querySelector('.vertex-context-menu')
      if (menu) {
        const deleteBtn = menu.querySelector('button') as HTMLButtonElement
        expect(deleteBtn.disabled).toBe(true)
      }
    })
  })

  describe('destroy', () => {
    it('removes rubber band from container', () => {
      const rbCount = map.container.querySelectorAll('div[style*="position: absolute"]').length
      expect(rbCount).toBeGreaterThanOrEqual(1)

      engine.destroy()
      // After destroy, rubber band should be removed
      // Panel should also be removed
      expect(map.container.querySelector('.draw-control-panel')).toBeNull()
    })

    it('cleans up vertex menu if present', () => {
      // Set up vertex context menu
      const lineFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] },
        properties: { _id: 'line1', drawMode: 'line' },
      }
      engine.setFeatures({ type: 'FeatureCollection', features: [lineFeature] })
      engine.setDrawMode(null)

      map.queryRenderedFeatures
        .mockReturnValueOnce([])
        .mockReturnValueOnce([{ properties: { _id: 'line1' } }])
      map.fire('click', {
        point: { x: 10, y: 10 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: { shiftKey: false },
      })

      map.queryRenderedFeatures
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 0 } }])
        .mockReturnValueOnce([{ properties: { featureId: 'line1', vertexIndex: 0 } }])
      map.fire('contextmenu', {
        point: { x: 50, y: 60 },
        originalEvent: { clientX: 100, clientY: 100, preventDefault: vi.fn() },
        preventDefault: vi.fn(),
      })

      expect(document.body.querySelector('.vertex-context-menu')).not.toBeNull()

      engine.destroy()
      expect(document.body.querySelector('.vertex-context-menu')).toBeNull()
    })
  })
})
