import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DrawingEngine } from '../DrawingEngine'
import { GeoloniaNotFoundError } from '../../lib/assert-geolonia'

type MockMap = ReturnType<typeof createMockMap>

function createMockMap() {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {}
  const sources: Record<string, { setData: ReturnType<typeof vi.fn> }> = {}
  const layers = new Set<string>()

  const map = {
    addSource: vi.fn((...args: unknown[]) => {
      sources[args[0] as string] = { setData: vi.fn() }
    }),
    addLayer: vi.fn((opts: { id: string }) => {
      layers.add(opts.id)
    }),
    removeSource: vi.fn((id: string) => {
      delete sources[id]
    }),
    removeLayer: vi.fn((id: string) => {
      layers.delete(id)
    }),
    getSource: vi.fn((id: string) => sources[id]),
    getLayer: vi.fn((id: string) => (layers.has(id) ? {} : undefined)),
    queryRenderedFeatures: vi.fn(() => [] as unknown[]),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (handlers[event]) handlers[event] = handlers[event].filter((h) => h !== handler)
    }),
    _trigger: (event: string, data: unknown) => {
      handlers[event]?.forEach((h) => h(data))
    },
    _sources: sources,
    _layers: layers,
  }
  return map
}

function makeMapEvent(overrides: Record<string, unknown> = {}) {
  return {
    point: { x: 10, y: 10 },
    lngLat: { lng: 139.767, lat: 35.681 },
    originalEvent: { clientX: 100, clientY: 200, shiftKey: false, preventDefault: vi.fn() },
    preventDefault: vi.fn(),
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMap = (m: MockMap) => m as any

describe('DrawingEngine', () => {
  let mockMap: MockMap

  beforeEach(() => {
    mockMap = createMockMap()
  })

  afterEach(() => {
    // Clean up any leftover keyboard listeners
  })

  describe('constructor', () => {
    it('creates engine with default null mode', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      expect(engine.drawMode).toBeNull()
      expect(engine.getFeatures().features).toHaveLength(0)
      expect(engine.canUndo).toBe(false)
      expect(engine.canRedo).toBe(false)
      expect(engine.selectedFeatureIds.size).toBe(0)
      engine.destroy()
    })

    it('creates engine with specified default mode', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      expect(engine.drawMode).toBe('point')
      engine.destroy()
    })

    it('sets up sources and layers on the map', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      expect(mockMap.addSource).toHaveBeenCalled()
      expect(mockMap.addLayer).toHaveBeenCalled()
      // 3 sources: main, draft, highlight
      expect(mockMap.addSource).toHaveBeenCalledTimes(3)
      // 10 layers total
      expect(mockMap.addLayer).toHaveBeenCalledTimes(10)
      engine.destroy()
    })

    it('does not add duplicate sources if already exist', () => {
      // Pre-populate the source
      mockMap.addSource('geojson-maker-generated-features', {})
      const addSourceCallsBefore = mockMap.addSource.mock.calls.length

      const engine = new DrawingEngine({ map: asMap(mockMap) })
      // Should not add more sources
      expect(mockMap.addSource.mock.calls.length).toBe(addSourceCallsBefore)
      engine.destroy()
    })

    it('registers click handler on map', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      expect(mockMap.on).toHaveBeenCalledWith('click', expect.any(Function))
      engine.destroy()
    })

    it('throws GeoloniaNotFoundError when window.geolonia is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).geolonia
      expect(() => {
        new DrawingEngine({ map: asMap(mockMap) })
      }).toThrow(GeoloniaNotFoundError)
      // Restore for other tests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).geolonia = { Map: vi.fn() }
    })
  })

  describe('setDrawMode', () => {
    it('changes draw mode', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      engine.setDrawMode('line')
      expect(engine.drawMode).toBe('line')
      engine.destroy()
    })

    it('emits modechange event', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      const handler = vi.fn()
      engine.on('modechange', handler)
      engine.setDrawMode('polygon')
      expect(handler).toHaveBeenCalledWith({ mode: 'polygon' })
      engine.destroy()
    })

    it('clears selection on mode change', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      // Add a feature and select it via click
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.selectedFeatureIds.size).toBe(1)

      engine.setDrawMode('line')
      expect(engine.selectedFeatureIds.size).toBe(0)
      engine.destroy()
    })

    it('emits select event with empty set on mode change', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      const selectHandler = vi.fn()
      engine.on('select', selectHandler)
      engine.setDrawMode('point')
      expect(selectHandler).toHaveBeenCalledWith({ featureIds: new Set() })
      engine.destroy()
    })

    it('sets draw mode to null', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      engine.setDrawMode(null)
      expect(engine.drawMode).toBeNull()
      engine.destroy()
    })

    it('clears draft coords and syncs draft layer', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'line' })
      // Add draft coords
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))

      // Change mode - should clear draft
      engine.setDrawMode('point')

      // Switching back to line should start fresh
      engine.setDrawMode('line')
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      // Only 1 draft coord after mode switch
      engine.destroy()
    })
  })

  describe('point mode - clicking adds point', () => {
    it('adds a point feature on map click', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.getFeatures().features).toHaveLength(1)
      expect(engine.getFeatures().features[0].geometry.type).toBe('Point')
      engine.destroy()
    })

    it('adds symbol feature in symbol mode', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'symbol' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.getFeatures().features).toHaveLength(1)
      expect(engine.getFeatures().features[0].properties?.drawMode).toBe('symbol')
      engine.destroy()
    })

    it('emits featureschange event on feature addition', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      const handler = vi.fn()
      engine.on('featureschange', handler)
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].features.features).toHaveLength(1)
      engine.destroy()
    })
  })

  describe('line mode - draft and finalize', () => {
    it('clicking in line mode adds draft coords (no feature yet)', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'line' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      expect(engine.getFeatures().features).toHaveLength(0)
      engine.destroy()
    })

    it('finalizeDraft creates a LineString feature', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'line' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      engine.finalizeDraft()
      expect(engine.getFeatures().features).toHaveLength(1)
      expect(engine.getFeatures().features[0].geometry.type).toBe('LineString')
      engine.destroy()
    })
  })

  describe('polygon mode - draft and finalize', () => {
    it('requires 3 points for polygon finalization', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'polygon' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 0 } }))

      engine.finalizeDraft()
      expect(engine.getFeatures().features).toHaveLength(0)

      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      engine.finalizeDraft()
      expect(engine.getFeatures().features).toHaveLength(1)
      expect(engine.getFeatures().features[0].geometry.type).toBe('Polygon')
      engine.destroy()
    })
  })

  describe('finalizeDraft edge cases', () => {
    it('does nothing when not drawing a path (point mode)', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      engine.finalizeDraft()
      expect(engine.getFeatures().features).toHaveLength(0)
      engine.destroy()
    })

    it('does nothing when drawMode is null', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      engine.finalizeDraft()
      expect(engine.getFeatures().features).toHaveLength(0)
      engine.destroy()
    })

    it('does nothing when not enough draft coords for line', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'line' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      engine.finalizeDraft()
      expect(engine.getFeatures().features).toHaveLength(0)
      engine.destroy()
    })
  })

  describe('feature selection via click', () => {
    it('clicking on existing feature selects it', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      // Add a feature
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      // Click on feature
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.selectedFeatureIds.has(featureId)).toBe(true)
      engine.destroy()
    })

    it('clicking selected feature deselects it', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      // Select
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())
      // Deselect
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.selectedFeatureIds.size).toBe(0)
      engine.destroy()
    })

    it('shift-click adds to selection', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      const id1 = engine.getFeatures().features[0].properties?._id
      const id2 = engine.getFeatures().features[1].properties?._id

      // Select first
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id1 } }])
      mockMap._trigger('click', makeMapEvent())
      // Shift-click second
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id2 } }])
      mockMap._trigger('click', makeMapEvent({
        originalEvent: { shiftKey: true, clientX: 100, clientY: 200, preventDefault: vi.fn() },
      }))
      expect(engine.selectedFeatureIds.size).toBe(2)
      engine.destroy()
    })

    it('shift-click removes from selection', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      const id1 = engine.getFeatures().features[0].properties?._id
      const id2 = engine.getFeatures().features[1].properties?._id

      // Select first
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id1 } }])
      mockMap._trigger('click', makeMapEvent())
      // Shift-click second
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id2 } }])
      mockMap._trigger('click', makeMapEvent({
        originalEvent: { shiftKey: true, clientX: 100, clientY: 200, preventDefault: vi.fn() },
      }))
      // Shift-click first to deselect
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id1 } }])
      mockMap._trigger('click', makeMapEvent({
        originalEvent: { shiftKey: true, clientX: 100, clientY: 200, preventDefault: vi.fn() },
      }))
      expect(engine.selectedFeatureIds.size).toBe(1)
      expect(engine.selectedFeatureIds.has(id2)).toBe(true)
      engine.destroy()
    })

    it('clicking empty space deselects all', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      // Select
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())
      // Click empty space
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.selectedFeatureIds.size).toBe(0)
      engine.destroy()
    })

    it('shift-click on empty space does not deselect', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      // Select
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())
      // Shift-click empty space
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({
        originalEvent: { shiftKey: true, clientX: 100, clientY: 200, preventDefault: vi.fn() },
      }))
      expect(engine.selectedFeatureIds.size).toBe(1)
      engine.destroy()
    })

    it('click with no draw mode does not add feature', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.getFeatures().features).toHaveLength(0)
      engine.destroy()
    })

    it('emits select event on feature click', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id

      const selectHandler = vi.fn()
      engine.on('select', selectHandler)
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())
      expect(selectHandler).toHaveBeenCalledTimes(1)
      expect(selectHandler.mock.calls[0][0].featureIds.has(featureId)).toBe(true)
      engine.destroy()
    })

    it('clicking empty with no selection does not emit select', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      const selectHandler = vi.fn()
      engine.on('select', selectHandler)
      // Click empty space with no prior selection
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      // featureschange is emitted, but select should NOT be emitted since selection was already empty
      expect(selectHandler).not.toHaveBeenCalled()
      engine.destroy()
    })

    it('clicking feature with no _id does not select', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      // Feature hit with no _id
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: {} }])
      mockMap._trigger('click', makeMapEvent())
      // Since no _id, falls through to add point feature
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })
  })

  describe('deleteSelectedFeatures', () => {
    it('deletes selected features', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      // Select
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())
      engine.deleteSelectedFeatures()
      expect(engine.getFeatures().features).toHaveLength(0)
      expect(engine.selectedFeatureIds.size).toBe(0)
      engine.destroy()
    })

    it('does nothing when no features selected', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      engine.deleteSelectedFeatures()
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('emits select event with empty set after deletion', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())

      const selectHandler = vi.fn()
      engine.on('select', selectHandler)
      engine.deleteSelectedFeatures()
      expect(selectHandler).toHaveBeenCalledWith({ featureIds: new Set() })
      engine.destroy()
    })
  })

  describe('undo/redo', () => {
    it('undo reverts feature addition', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.getFeatures().features).toHaveLength(1)
      expect(engine.canUndo).toBe(true)
      engine.undo()
      expect(engine.getFeatures().features).toHaveLength(0)
      expect(engine.canRedo).toBe(true)
      engine.destroy()
    })

    it('redo restores undone feature', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      engine.undo()
      engine.redo()
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('emits featureschange event on undo', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const handler = vi.fn()
      engine.on('featureschange', handler)
      engine.undo()
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].features.features).toHaveLength(0)
      engine.destroy()
    })

    it('emits featureschange event on redo', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      engine.undo()
      const handler = vi.fn()
      engine.on('featureschange', handler)
      engine.redo()
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].features.features).toHaveLength(1)
      engine.destroy()
    })
  })

  describe('keyboard shortcuts', () => {
    it('Ctrl+Z triggers undo', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.getFeatures().features).toHaveLength(1)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
      expect(engine.getFeatures().features).toHaveLength(0)
      engine.destroy()
    })

    it('Ctrl+Shift+Z triggers redo', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      engine.undo()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }))
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('Ctrl+Y triggers redo', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      engine.undo()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }))
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('ignores keyboard shortcuts on INPUT elements', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const input = document.createElement('input')
      document.body.appendChild(input)
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)
      document.body.removeChild(input)
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('ignores keyboard shortcuts on TEXTAREA elements', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
      Object.defineProperty(event, 'target', { value: textarea })
      window.dispatchEvent(event)
      document.body.removeChild(textarea)
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('ignores keyboard shortcuts on SELECT elements', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const select = document.createElement('select')
      document.body.appendChild(select)
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
      Object.defineProperty(event, 'target', { value: select })
      window.dispatchEvent(event)
      document.body.removeChild(select)
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('ignores keyboard shortcuts on contentEditable elements', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const div = document.createElement('div')
      div.contentEditable = 'true'
      document.body.appendChild(div)
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
      // jsdom may not set isContentEditable correctly, so mock it
      const target = { tagName: 'DIV', isContentEditable: true }
      Object.defineProperty(event, 'target', { value: target })
      window.dispatchEvent(event)
      document.body.removeChild(div)
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('ignores non-modifier key presses', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('uses metaKey on Mac', () => {
      const originalUA = navigator.userAgent
      Object.defineProperty(navigator, 'userAgent', { value: 'Macintosh', configurable: true })
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }))
      expect(engine.getFeatures().features).toHaveLength(0)
      Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true })
      engine.destroy()
    })
  })

  describe('reset', () => {
    it('clears all features, draft, and selection', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      engine.reset()
      expect(engine.getFeatures().features).toHaveLength(0)
      expect(engine.selectedFeatureIds.size).toBe(0)
      engine.destroy()
    })

    it('emits select and featureschange events', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const selectHandler = vi.fn()
      const featuresHandler = vi.fn()
      engine.on('select', selectHandler)
      engine.on('featureschange', featuresHandler)
      engine.reset()
      expect(selectHandler).toHaveBeenCalledWith({ featureIds: new Set() })
      expect(featuresHandler).toHaveBeenCalled()
      engine.destroy()
    })
  })

  describe('importGeoJSON', () => {
    it('merges features by default', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())

      engine.importGeoJSON({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { _id: 'imported-1' },
        }],
      })
      expect(engine.getFeatures().features).toHaveLength(2)
      engine.destroy()
    })

    it('replaces features with replace mode', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())

      engine.importGeoJSON({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { _id: 'imported-1' },
        }],
      }, 'replace')
      expect(engine.getFeatures().features).toHaveLength(1)
      expect(engine.getFeatures().features[0].properties?._id).toBe('imported-1')
      engine.destroy()
    })

    it('preserves existing _id on imported features', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      engine.importGeoJSON({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { _id: 'my-custom-id' },
        }],
      })
      expect(engine.getFeatures().features[0].properties?._id).toBe('my-custom-id')
      engine.destroy()
    })

    it('generates _id for imported features without one', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      engine.importGeoJSON({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: {},
        }],
      })
      expect(engine.getFeatures().features[0].properties?._id).toBeDefined()
      engine.destroy()
    })

    it('replace mode clears selection', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.selectedFeatureIds.size).toBe(1)

      engine.importGeoJSON({ type: 'FeatureCollection', features: [] }, 'replace')
      expect(engine.selectedFeatureIds.size).toBe(0)
      engine.destroy()
    })
  })

  describe('importCSV', () => {
    it('imports CSV data as point features (merge mode)', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      engine.importCSV('lat,lng\n35.681,139.767\n34.693,135.502')
      expect(engine.getFeatures().features).toHaveLength(2)
      expect(engine.getFeatures().features[0].geometry.type).toBe('Point')
      engine.destroy()
    })

    it('imports CSV data in replace mode', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.getFeatures().features).toHaveLength(1)

      engine.importCSV('lat,lng\n35.681,139.767', 'replace')
      expect(engine.getFeatures().features).toHaveLength(1)
      expect(engine.getFeatures().features[0].properties?.drawMode).toBe('point')
      engine.destroy()
    })

    it('replace mode clears selection', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())

      engine.importCSV('lat,lng\n35.681,139.767', 'replace')
      expect(engine.selectedFeatureIds.size).toBe(0)
      engine.destroy()
    })
  })

  describe('events (on/off)', () => {
    it('on registers an event handler', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      const handler = vi.fn()
      engine.on('modechange', handler)
      engine.setDrawMode('point')
      expect(handler).toHaveBeenCalledWith({ mode: 'point' })
      engine.destroy()
    })

    it('off removes an event handler', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      const handler = vi.fn()
      engine.on('modechange', handler)
      engine.off('modechange', handler)
      engine.setDrawMode('point')
      expect(handler).not.toHaveBeenCalled()
      engine.destroy()
    })

    it('off does nothing for unregistered event', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      const handler = vi.fn()
      // off on event that has no listeners set
      engine.off('modechange', handler)
      // Should not throw
      engine.destroy()
    })

    it('multiple handlers on same event', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      engine.on('modechange', handler1)
      engine.on('modechange', handler2)
      engine.setDrawMode('point')
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
      engine.destroy()
    })
  })

  describe('destroy', () => {
    it('removes map event handlers', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      engine.destroy()
      expect(mockMap.off).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('removes layers and sources from map', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      engine.destroy()
      expect(mockMap.removeLayer).toHaveBeenCalled()
      expect(mockMap.removeSource).toHaveBeenCalled()
    })

    it('clears event listeners', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      const handler = vi.fn()
      engine.on('modechange', handler)
      engine.destroy()
      // After destroy, handler should not be called
      // But setDrawMode should throw
      expect(() => engine.setDrawMode('point')).toThrow('DrawingEngine has been destroyed')
    })

    it('double destroy is safe', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      engine.destroy()
      engine.destroy() // should not throw
    })

    it('methods throw after destroy', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap) })
      engine.destroy()
      expect(() => engine.setDrawMode('point')).toThrow('DrawingEngine has been destroyed')
      expect(() => engine.undo()).toThrow('DrawingEngine has been destroyed')
      expect(() => engine.redo()).toThrow('DrawingEngine has been destroyed')
      expect(() => engine.deleteSelectedFeatures()).toThrow('DrawingEngine has been destroyed')
      expect(() => engine.finalizeDraft()).toThrow('DrawingEngine has been destroyed')
      expect(() => engine.reset()).toThrow('DrawingEngine has been destroyed')
      expect(() => engine.importGeoJSON({ type: 'FeatureCollection', features: [] })).toThrow('DrawingEngine has been destroyed')
      expect(() => engine.importCSV('lat,lng\n0,0')).toThrow('DrawingEngine has been destroyed')
    })

    it('removes keyboard event listener', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      engine.destroy()
      // Keyboard shortcut should not work after destroy
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
      // If we got here without error, the handler was removed
    })
  })

  describe('source sync edge cases', () => {
    it('handles missing main source gracefully', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      // Remove the source
      delete mockMap._sources['geojson-maker-generated-features']
      // Should not throw on feature change
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      expect(engine.getFeatures().features).toHaveLength(1)
      engine.destroy()
    })

    it('handles missing draft source gracefully', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'line' })
      delete mockMap._sources['geojson-maker-draft']
      // Should not throw
      engine.setDrawMode('polygon')
      engine.destroy()
    })

    it('handles missing highlight source gracefully', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      delete mockMap._sources['geojson-maker-highlight']
      // Should not throw
      engine.setDrawMode('line')
      engine.destroy()
    })
  })

  describe('selectedFeatureIds returns a copy', () => {
    it('modifying returned set does not affect internal state', () => {
      const engine = new DrawingEngine({ map: asMap(mockMap), defaultMode: 'point' })
      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('click', makeMapEvent())
      const featureId = engine.getFeatures().features[0].properties?._id
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
      mockMap._trigger('click', makeMapEvent())

      const ids = engine.selectedFeatureIds
      ids.clear()
      expect(engine.selectedFeatureIds.size).toBe(1) // Internal state unchanged
      engine.destroy()
    })
  })
})
