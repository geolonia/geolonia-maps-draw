import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VertexEditingController, VERTEX_SOURCE_ID, VERTEX_LAYER_ID } from '../VertexEditingController'

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

describe('VertexEditingController', () => {
  let map: MockMap
  let ctrl: VertexEditingController

  beforeEach(() => {
    map = createMockMap()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctrl = new VertexEditingController(map as any, { mainSourceId: 'main-source' })
  })

  afterEach(() => {
    ctrl.detach()
  })

  describe('attach/detach', () => {
    it('creates source and layer on attach', () => {
      ctrl.attach()
      expect(map.sources[VERTEX_SOURCE_ID]).toBeDefined()
      expect(map.layers.has(VERTEX_LAYER_ID)).toBe(true)
    })

    it('removes source and layer on detach', () => {
      ctrl.attach()
      ctrl.detach()
      expect(map.sources[VERTEX_SOURCE_ID]).toBeUndefined()
      expect(map.layers.has(VERTEX_LAYER_ID)).toBe(false)
    })

    it('registers event handlers on attach', () => {
      ctrl.attach()
      expect(map.handlers['mousemove']?.length).toBeGreaterThan(0)
      expect(map.handlers['mousedown']?.length).toBeGreaterThan(0)
      expect(map.handlers['mouseup']?.length).toBeGreaterThan(0)
      expect(map.handlers['contextmenu']?.length).toBeGreaterThan(0)
    })

    it('removes event handlers on detach', () => {
      ctrl.attach()
      ctrl.detach()
      expect(map.handlers['mousemove']?.length).toBe(0)
      expect(map.handlers['mousedown']?.length).toBe(0)
      expect(map.handlers['mouseup']?.length).toBe(0)
      expect(map.handlers['contextmenu']?.length).toBe(0)
    })

    it('idempotent: multiple attach calls do not duplicate', () => {
      ctrl.attach()
      ctrl.attach()
      expect(map.handlers['mousemove']?.length).toBe(1)
    })

    it('idempotent: detach without attach is safe', () => {
      expect(() => ctrl.detach()).not.toThrow()
    })
  })

  describe('updateHandles', () => {
    it('sets empty data when feature is null', () => {
      ctrl.attach()
      ctrl.updateHandles(null, null)
      const src = map.sources[VERTEX_SOURCE_ID]
      expect(src.setData).toHaveBeenCalledWith({ type: 'FeatureCollection', features: [] })
    })

    it('sets empty data for Point features', () => {
      ctrl.attach()
      const point: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { _id: 'f1' },
      }
      ctrl.updateHandles(point, null)
      const src = map.sources[VERTEX_SOURCE_ID]
      expect(src.setData).toHaveBeenCalledWith({ type: 'FeatureCollection', features: [] })
    })

    it('creates vertex handles for LineString', () => {
      ctrl.attach()
      const line: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1], [2, 2]],
        },
        properties: { _id: 'f1' },
      }
      ctrl.updateHandles(line, null)
      const src = map.sources[VERTEX_SOURCE_ID]
      const call = src.setData.mock.calls[0][0] as GeoJSON.FeatureCollection
      expect(call.features).toHaveLength(3)
      expect(call.features[0].properties?.featureId).toBe('f1')
      expect(call.features[0].properties?.vertexIndex).toBe(0)
      expect(call.features[0].properties?.selected).toBe(false)
    })

    it('marks selected vertex', () => {
      ctrl.attach()
      const line: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1], [2, 2]],
        },
        properties: { _id: 'f1' },
      }
      ctrl.updateHandles(line, { featureId: 'f1', vertexIndex: 1 })
      const src = map.sources[VERTEX_SOURCE_ID]
      const call = src.setData.mock.calls[0][0] as GeoJSON.FeatureCollection
      expect(call.features[1].properties?.selected).toBe(true)
      expect(call.features[0].properties?.selected).toBe(false)
    })

    it('creates vertex handles for Polygon (excluding closing point)', () => {
      ctrl.attach()
      const polygon: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        },
        properties: { _id: 'f1' },
      }
      ctrl.updateHandles(polygon, null)
      const src = map.sources[VERTEX_SOURCE_ID]
      const call = src.setData.mock.calls[0][0] as GeoJSON.FeatureCollection
      expect(call.features).toHaveLength(3)
    })
  })

  describe('mouse interactions', () => {
    const lineFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[0, 0], [1, 1], [2, 2]],
      },
      properties: { _id: 'f1' },
    }

    beforeEach(() => {
      ctrl.attach()
      ctrl.setFeatures({ type: 'FeatureCollection', features: [lineFeature] })
      // Add the main source too
      map.addSource('main-source', {})
    })

    it('changes cursor on hover', () => {
      map.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      map.fire('mousemove', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })
      expect(map.getCanvas().style.cursor).toBe('grab')

      map.queryRenderedFeatures.mockReturnValueOnce([])
      map.fire('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 0, lat: 0 } })
      expect(map.getCanvas().style.cursor).toBe('')
    })

    it('starts drag on mousedown on vertex', () => {
      map.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      expect(map.dragPan.disable).toHaveBeenCalled()
      expect(map.getCanvas().style.cursor).toBe('grabbing')
    })

    it('does not start drag when no vertex hit', () => {
      map.queryRenderedFeatures.mockReturnValueOnce([])
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      expect(map.dragPan.disable).not.toHaveBeenCalled()
    })

    it('emits vertexcommit on drag + mouseup', () => {
      const commitHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)

      // mousedown on vertex
      map.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      map.fire('mousedown', { point: { x: 10, y: 10 } })

      // mousemove (drag)
      map.fire('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })

      // mouseup
      map.fire('mouseup', {})

      expect(commitHandler).toHaveBeenCalledTimes(1)
      expect(map.dragPan.enable).toHaveBeenCalled()
    })

    it('emits vertexselect on click (no drag)', () => {
      const selectHandler = vi.fn()
      ctrl.addEventListener('vertexselect', selectHandler)

      // mousedown on vertex
      map.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 1 } }])
      map.fire('mousedown', { point: { x: 10, y: 10 } })

      // mouseup without moving
      map.fire('mouseup', {})

      expect(selectHandler).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((selectHandler.mock.calls[0][0] as any).detail.vertex).toEqual({
        featureId: 'f1',
        vertexIndex: 1,
      })
    })

    it('sets justDragged flag temporarily after drag', () => {
      vi.useFakeTimers()

      map.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      map.fire('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })
      map.fire('mouseup', {})

      expect(ctrl.justDragged).toBe(true)

      vi.advanceTimersByTime(51)
      expect(ctrl.justDragged).toBe(false)

      vi.useRealTimers()
    })

    it('emits vertexcontextmenu on right-click', () => {
      const menuHandler = vi.fn()
      ctrl.addEventListener('vertexcontextmenu', menuHandler)

      map.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 2 } }])
      map.fire('contextmenu', {
        point: { x: 10, y: 10 },
        originalEvent: { clientX: 100, clientY: 200 },
        preventDefault: vi.fn(),
      })

      expect(menuHandler).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (menuHandler.mock.calls[0][0] as any).detail.event
      expect(detail).toEqual({ featureId: 'f1', vertexIndex: 2, x: 100, y: 200 })
    })

    it('does not fire contextmenu when no vertex hit', () => {
      const menuHandler = vi.fn()
      ctrl.addEventListener('vertexcontextmenu', menuHandler)

      map.queryRenderedFeatures.mockReturnValueOnce([])
      map.fire('contextmenu', {
        point: { x: 10, y: 10 },
        originalEvent: { clientX: 100, clientY: 200 },
        preventDefault: vi.fn(),
      })

      expect(menuHandler).not.toHaveBeenCalled()
    })

    it('updates vertex handles and main source during drag', () => {
      // mousedown on vertex
      map.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      map.fire('mousedown', { point: { x: 10, y: 10 } })

      // mousemove (drag)
      map.fire('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })

      // Verify both sources were updated
      const vertexSrc = map.sources[VERTEX_SOURCE_ID]
      const mainSrc = map.sources['main-source']
      expect(vertexSrc.setData).toHaveBeenCalled()
      expect(mainSrc.setData).toHaveBeenCalled()
    })

    it('updates polygon vertex 0 and closing point during drag', () => {
      const polygonFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        },
        properties: { _id: 'p1' },
      }
      ctrl.setFeatures({ type: 'FeatureCollection', features: [polygonFeature] })

      // mousedown on vertex 0
      map.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'p1', vertexIndex: 0 } }])
      map.fire('mousedown', { point: { x: 10, y: 10 } })

      // drag
      map.fire('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })

      // mouseup
      const commitHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)
      map.fire('mouseup', {})

      expect(commitHandler).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const committed = (commitHandler.mock.calls[0][0] as any).detail.feature as GeoJSON.Feature
      const ring = (committed.geometry as GeoJSON.Polygon).coordinates[0]
      // Vertex 0 and closing point should both be updated
      expect(ring[0]).toEqual([5, 5])
      expect(ring[ring.length - 1]).toEqual([5, 5])
    })
  })

  describe('deleteSelectedVertex', () => {
    it('emits vertexcommit with deleted vertex for LineString', () => {
      ctrl.attach()
      const line: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1], [2, 2]],
        },
        properties: { _id: 'f1' },
      }
      ctrl.setFeatures({ type: 'FeatureCollection', features: [line] })
      ctrl.updateHandles(line, { featureId: 'f1', vertexIndex: 1 })

      const commitHandler = vi.fn()
      const selectHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)
      ctrl.addEventListener('vertexselect', selectHandler)

      ctrl.deleteSelectedVertex()

      expect(commitHandler).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const committed = (commitHandler.mock.calls[0][0] as any).detail.feature as GeoJSON.Feature
      expect((committed.geometry as GeoJSON.LineString).coordinates).toEqual([[0, 0], [2, 2]])

      expect(selectHandler).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((selectHandler.mock.calls[0][0] as any).detail.vertex).toBeNull()
    })

    it('does nothing when no vertex is selected', () => {
      ctrl.attach()
      const commitHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)
      ctrl.deleteSelectedVertex()
      expect(commitHandler).not.toHaveBeenCalled()
    })

    it('does nothing when feature cannot have vertex deleted (min vertices)', () => {
      ctrl.attach()
      const line: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1]],
        },
        properties: { _id: 'f1' },
      }
      ctrl.setFeatures({ type: 'FeatureCollection', features: [line] })
      ctrl.updateHandles(line, { featureId: 'f1', vertexIndex: 0 })

      const commitHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)
      ctrl.deleteSelectedVertex()
      expect(commitHandler).not.toHaveBeenCalled()
    })
  })

  describe('keyboard handler', () => {
    it('deletes vertex on Delete key', () => {
      ctrl.attach()
      const line: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1], [2, 2]],
        },
        properties: { _id: 'f1' },
      }
      ctrl.setFeatures({ type: 'FeatureCollection', features: [line] })
      ctrl.updateHandles(line, { featureId: 'f1', vertexIndex: 1 })

      const commitHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)

      const event = new KeyboardEvent('keydown', { key: 'Delete' })
      Object.defineProperty(event, 'target', { value: document.body })
      window.dispatchEvent(event)

      expect(commitHandler).toHaveBeenCalledTimes(1)
    })

    it('deletes vertex on Backspace key', () => {
      ctrl.attach()
      const line: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1], [2, 2]],
        },
        properties: { _id: 'f1' },
      }
      ctrl.setFeatures({ type: 'FeatureCollection', features: [line] })
      ctrl.updateHandles(line, { featureId: 'f1', vertexIndex: 1 })

      const commitHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)

      const event = new KeyboardEvent('keydown', { key: 'Backspace' })
      Object.defineProperty(event, 'target', { value: document.body })
      window.dispatchEvent(event)

      expect(commitHandler).toHaveBeenCalledTimes(1)
    })

    it('ignores keydown when focused on input elements', () => {
      ctrl.attach()
      const line: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1], [2, 2]],
        },
        properties: { _id: 'f1' },
      }
      ctrl.setFeatures({ type: 'FeatureCollection', features: [line] })
      ctrl.updateHandles(line, { featureId: 'f1', vertexIndex: 1 })

      const commitHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)

      const input = document.createElement('input')
      document.body.appendChild(input)
      const event = new KeyboardEvent('keydown', { key: 'Delete' })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)

      expect(commitHandler).not.toHaveBeenCalled()
      document.body.removeChild(input)
    })

    it('ignores non-delete keys', () => {
      ctrl.attach()
      const line: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1], [2, 2]],
        },
        properties: { _id: 'f1' },
      }
      ctrl.setFeatures({ type: 'FeatureCollection', features: [line] })
      ctrl.updateHandles(line, { featureId: 'f1', vertexIndex: 1 })

      const commitHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)

      const event = new KeyboardEvent('keydown', { key: 'a' })
      Object.defineProperty(event, 'target', { value: document.body })
      window.dispatchEvent(event)

      expect(commitHandler).not.toHaveBeenCalled()
    })

    it('ignores delete key when no vertex is selected', () => {
      ctrl.attach()
      ctrl.updateHandles(null, null)

      const commitHandler = vi.fn()
      ctrl.addEventListener('vertexcommit', commitHandler)

      const event = new KeyboardEvent('keydown', { key: 'Delete' })
      Object.defineProperty(event, 'target', { value: document.body })
      window.dispatchEvent(event)

      expect(commitHandler).not.toHaveBeenCalled()
    })
  })

  describe('mouseup without preceding mousedown', () => {
    it('does nothing on mouseup without drag', () => {
      ctrl.attach()
      expect(() => map.fire('mouseup', {})).not.toThrow()
    })
  })

  describe('mousemove cursor without layer', () => {
    it('does not change cursor if vertex layer is missing', () => {
      ctrl.attach()
      // Remove the layer
      map.removeLayer(VERTEX_LAYER_ID)
      map.getCanvas().style.cursor = 'initial'
      map.fire('mousemove', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })
      expect(map.getCanvas().style.cursor).toBe('initial')
    })
  })

  describe('mousedown without feature match', () => {
    it('does not start drag when vertex hit but feature not in collection', () => {
      ctrl.attach()
      ctrl.setFeatures({ type: 'FeatureCollection', features: [] })
      map.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'nonexistent', vertexIndex: 0 } }])
      map.fire('mousedown', { point: { x: 10, y: 10 } })
      expect(map.dragPan.disable).not.toHaveBeenCalled()
    })
  })
})
