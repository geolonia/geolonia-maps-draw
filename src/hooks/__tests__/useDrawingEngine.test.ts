import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDrawingEngine } from '../useDrawingEngine'

type MockMap = ReturnType<typeof createMockMap>

function createMockMap() {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {}
  const sources: Record<string, { setData: ReturnType<typeof vi.fn> }> = {}
  const layers = new Set<string>()
  const canvas = document.createElement('canvas')

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
    getCanvas: vi.fn(() => canvas),
    queryRenderedFeatures: vi.fn(() => [] as unknown[]),
    dragPan: { enable: vi.fn(), disable: vi.fn() },
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
    _canvas: canvas,
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

describe('useDrawingEngine', () => {
  let mockMap: MockMap

  beforeEach(() => {
    mockMap = createMockMap()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getMap = () => mockMap as any

  describe('initial state', () => {
    it('has correct initial values', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      expect(result.current.drawMode).toBe('point')
      expect(result.current.features.features).toHaveLength(0)
      expect(result.current.selectedFeatureIds.size).toBe(0)
      expect(result.current.isDrawingPath).toBe(false)
      expect(result.current.canFinalizeDraft).toBe(false)
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
      expect(result.current.rubberBand).toBeNull()
      expect(result.current.highlightedPanelFeatureId).toBeNull()
      expect(result.current.contextMenuEvent).toBeNull()
      expect(result.current.vertexContextMenuEvent).toBeNull()
      expect(result.current.selectedVertex).toBeNull()
      expect(result.current.draftContextMenuEvent).toBeNull()
    })

    it('uses initialFeatures from options', () => {
      const initialFC: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { _id: 'init-1' },
        }],
      }
      const { result } = renderHook(() =>
        useDrawingEngine(getMap(), { initialFeatures: initialFC }),
      )
      expect(result.current.features.features).toHaveLength(1)
    })

    it('handles null map', () => {
      const { result } = renderHook(() => useDrawingEngine(null))
      expect(result.current.drawMode).toBe('point')
    })
  })

  describe('map sources and layers setup', () => {
    it('adds sources and layers on mount', () => {
      renderHook(() => useDrawingEngine(getMap()))

      expect(mockMap.addSource).toHaveBeenCalled()
      expect(mockMap.addLayer).toHaveBeenCalled()
    })

    it('does not add duplicate sources', () => {
      // Pre-populate the source
      mockMap.addSource('geojson-maker-generated-features', {})

      renderHook(() => useDrawingEngine(getMap()))

      // addSource is called by useVertexEditing for vertex source, but not again for main source
      const mainSourceCalls = mockMap.addSource.mock.calls.filter(
        (c: unknown[]) => c[0] === 'geojson-maker-generated-features',
      )
      expect(mainSourceCalls.length).toBe(1) // only the pre-populated one
    })

    it('removes sources and layers on unmount', () => {
      const { unmount } = renderHook(() => useDrawingEngine(getMap()))
      unmount()

      expect(mockMap.removeLayer).toHaveBeenCalled()
      expect(mockMap.removeSource).toHaveBeenCalled()
    })
  })

  describe('setDrawMode', () => {
    it('changes draw mode', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('line')
      })

      expect(result.current.drawMode).toBe('line')
      expect(result.current.isDrawingPath).toBe(true)
    })

    it('sets isDrawingPath for polygon mode', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('polygon')
      })

      expect(result.current.isDrawingPath).toBe(true)
    })

    it('sets isDrawingPath to false for point mode', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('point')
      })

      expect(result.current.isDrawingPath).toBe(false)
    })

    it('sets draw mode to null', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode(null)
      })

      expect(result.current.drawMode).toBeNull()
    })
  })

  describe('point mode - clicking adds point', () => {
    it('adds a point feature on map click', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].geometry.type).toBe('Point')
    })

    it('adds symbol feature in symbol mode', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('symbol')
      })

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].properties?.drawMode).toBe('symbol')
    })
  })

  describe('line mode - draft and finalize', () => {
    it('clicking in line mode adds draft coords', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('line')
      })

      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })

      // canFinalizeDraft should be false with 1 point
      expect(result.current.canFinalizeDraft).toBe(false)
    })

    it('finalizeDraft creates a LineString feature', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('line')
      })

      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      expect(result.current.canFinalizeDraft).toBe(true)

      act(() => {
        result.current.finalizeDraft()
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].geometry.type).toBe('LineString')
    })
  })

  describe('polygon mode - draft and finalize', () => {
    it('requires 3 points for polygon finalization', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('polygon')
      })

      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 0 } }))
      })

      expect(result.current.canFinalizeDraft).toBe(false)

      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      expect(result.current.canFinalizeDraft).toBe(true)

      act(() => {
        result.current.finalizeDraft()
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].geometry.type).toBe('Polygon')
    })
  })

  describe('finalizeDraft edge cases', () => {
    it('does nothing when not drawing a path', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.finalizeDraft()
      })

      expect(result.current.features.features).toHaveLength(0)
    })

    it('does nothing when cannot finalize', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('line')
      })

      // Only 1 point, need 2
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })

      act(() => {
        result.current.finalizeDraft()
      })

      expect(result.current.features.features).toHaveLength(0)
    })
  })

  describe('feature selection', () => {
    it('clicking on existing feature selects it', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add a feature
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featureId = result.current.features.features[0].properties?._id

      // Simulate click on the feature
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])  // vertex layer check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.selectedFeatureIds.has(featureId)).toBe(true)
    })

    it('clicking selected feature deselects it', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add a feature
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featureId = result.current.features.features[0].properties?._id

      // Select
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('click', makeMapEvent())
      })

      // Deselect (click same feature again)
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.selectedFeatureIds.size).toBe(0)
    })

    it('shift-click adds to selection', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add two features
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      const id1 = result.current.features.features[0].properties?._id
      const id2 = result.current.features.features[1].properties?._id

      // Select first
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id1 } }])
        mockMap._trigger('click', makeMapEvent())
      })

      // Shift-click second
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id2 } }])
        mockMap._trigger('click', makeMapEvent({
          originalEvent: { shiftKey: true, clientX: 100, clientY: 200, preventDefault: vi.fn() },
        }))
      })

      expect(result.current.selectedFeatureIds.size).toBe(2)
    })

    it('shift-click removes from selection', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      const id1 = result.current.features.features[0].properties?._id
      const id2 = result.current.features.features[1].properties?._id

      // Select first
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id1 } }])
        mockMap._trigger('click', makeMapEvent())
      })

      // Shift-click second
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id2 } }])
        mockMap._trigger('click', makeMapEvent({
          originalEvent: { shiftKey: true, clientX: 100, clientY: 200, preventDefault: vi.fn() },
        }))
      })

      // Shift-click first again to deselect
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id1 } }])
        mockMap._trigger('click', makeMapEvent({
          originalEvent: { shiftKey: true, clientX: 100, clientY: 200, preventDefault: vi.fn() },
        }))
      })

      expect(result.current.selectedFeatureIds.size).toBe(1)
      expect(result.current.selectedFeatureIds.has(id2)).toBe(true)
    })

    it('clicking empty space deselects all', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featureId = result.current.features.features[0].properties?._id

      // Select feature
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('click', makeMapEvent())
      })

      // Click empty space
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.selectedFeatureIds.size).toBe(0)
    })

    it('clicking empty space with shift does not deselect', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featureId = result.current.features.features[0].properties?._id

      // Select
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('click', makeMapEvent())
      })

      // Shift-click empty
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('click', makeMapEvent({
          originalEvent: { shiftKey: true, clientX: 100, clientY: 200, preventDefault: vi.fn() },
        }))
      })

      expect(result.current.selectedFeatureIds.size).toBe(1)
    })

    it('click on vertex layer hit is ignored', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featuresBefore = result.current.features.features.length

      // Simulate vertex layer hit
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: {} }]) // vertex hit
        mockMap._trigger('click', makeMapEvent())
      })

      // Should not add a new feature
      expect(result.current.features.features.length).toBe(featuresBefore)
    })

    it('click with no draw mode does not add feature', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode(null)
      })

      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.features.features).toHaveLength(0)
    })
  })

  describe('deleteSelectedFeatures', () => {
    it('deletes selected features', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add a feature
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featureId = result.current.features.features[0].properties?._id

      // Select it
      act(() => {
        result.current.setSelectedFeatureIds(new Set([featureId]))
      })

      // Delete
      act(() => {
        result.current.deleteSelectedFeatures()
      })

      expect(result.current.features.features).toHaveLength(0)
      expect(result.current.selectedFeatureIds.size).toBe(0)
    })

    it('does nothing when no features selected', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      act(() => {
        result.current.deleteSelectedFeatures()
      })

      expect(result.current.features.features).toHaveLength(1)
    })
  })

  describe('resetGeoJSON', () => {
    it('clears all features and state', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add features
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      act(() => {
        result.current.resetGeoJSON()
      })

      expect(result.current.features.features).toHaveLength(0)
      expect(result.current.selectedFeatureIds.size).toBe(0)
      expect(result.current.highlightedPanelFeatureId).toBeNull()
    })
  })

  describe('undo/redo', () => {
    it('undo reverts feature addition', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.canUndo).toBe(true)

      act(() => {
        result.current.undo()
      })

      expect(result.current.features.features).toHaveLength(0)
      expect(result.current.canRedo).toBe(true)
    })

    it('redo restores undone feature', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      act(() => {
        result.current.undo()
      })

      act(() => {
        result.current.redo()
      })

      expect(result.current.features.features).toHaveLength(1)
    })
  })

  describe('keyboard shortcuts', () => {
    it('Ctrl+Z triggers undo', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.features.features).toHaveLength(1)

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
      })

      expect(result.current.features.features).toHaveLength(0)
    })

    it('Ctrl+Shift+Z triggers redo', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      act(() => {
        result.current.undo()
      })

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }))
      })

      expect(result.current.features.features).toHaveLength(1)
    })

    it('Ctrl+Y triggers redo', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      act(() => {
        result.current.undo()
      })

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }))
      })

      expect(result.current.features.features).toHaveLength(1)
    })

    it('ignores keyboard shortcuts on INPUT elements', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const input = document.createElement('input')
      document.body.appendChild(input)
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
      Object.defineProperty(event, 'target', { value: input })
      act(() => {
        window.dispatchEvent(event)
      })
      document.body.removeChild(input)

      expect(result.current.features.features).toHaveLength(1)
    })

    it('ignores non-modifier key presses', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
      })

      expect(result.current.features.features).toHaveLength(1)
    })
  })

  describe('importCSV', () => {
    it('imports CSV data as point features', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.importCSV('lat,lng\n35.681,139.767\n34.693,135.502')
      })

      expect(result.current.features.features).toHaveLength(2)
      expect(result.current.features.features[0].geometry.type).toBe('Point')
    })
  })

  describe('importGeoJSON', () => {
    it('replaces features with replace mode', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add a feature first
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const imported: GeoJSON.Feature[] = [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { _id: 'imported-1' },
      }]

      act(() => {
        result.current.importGeoJSON(imported, 'replace')
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].properties?._id).toBe('imported-1')
    })

    it('merges features with merge mode', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add a feature first
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const imported: GeoJSON.Feature[] = [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { _id: 'imported-1' },
      }]

      act(() => {
        result.current.importGeoJSON(imported, 'merge')
      })

      expect(result.current.features.features).toHaveLength(2)
    })
  })

  describe('context menus', () => {
    it('right-click on feature shows context menu', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add a feature
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featureId = result.current.features.features[0].properties?._id

      // Right-click on feature
      // useVertexEditing also registers a contextmenu handler that calls queryRenderedFeatures
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useVertexEditing contextmenu vertex check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useDrawingEngine contextmenu vertex check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useDrawingEngine contextmenu draft check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }]) // useDrawingEngine contextmenu feature check
        mockMap._trigger('contextmenu', makeMapEvent())
      })

      expect(result.current.contextMenuEvent).not.toBeNull()
      expect(result.current.contextMenuEvent?.feature.properties?._id).toBe(featureId)
    })

    it('closeContextMenu clears context menu', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featureId = result.current.features.features[0].properties?._id

      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useVertexEditing contextmenu
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useDrawingEngine vertex check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useDrawingEngine draft check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('contextmenu', makeMapEvent())
      })

      act(() => {
        result.current.closeContextMenu()
      })

      expect(result.current.contextMenuEvent).toBeNull()
    })

    it('closeVertexContextMenu clears vertex context menu', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.closeVertexContextMenu()
      })

      expect(result.current.vertexContextMenuEvent).toBeNull()
    })

    it('right-click on vertex skips feature context menu', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: {} }]) // vertex hit
        mockMap._trigger('contextmenu', makeMapEvent())
      })

      expect(result.current.contextMenuEvent).toBeNull()
    })

    it('right-click on empty space clears all menus', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // vertex
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // draft
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // feature
        mockMap._trigger('contextmenu', makeMapEvent())
      })

      expect(result.current.contextMenuEvent).toBeNull()
    })

    it('right-click on draft point shows draft context menu', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('line')
      })

      // Add a draft point
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })

      // Right-click on draft point
      // useVertexEditing also registers a contextmenu handler
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useVertexEditing contextmenu vertex check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useDrawingEngine contextmenu vertex check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { draftIndex: 0 } }]) // useDrawingEngine contextmenu draft check
        mockMap._trigger('contextmenu', makeMapEvent())
      })

      expect(result.current.draftContextMenuEvent).not.toBeNull()
      expect(result.current.draftContextMenuEvent?.draftIndex).toBe(0)
    })

    it('deleteDraftPoint removes a draft point', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('line')
      })

      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      act(() => {
        result.current.deleteDraftPoint(0)
      })

      // Draft context menu should be closed
      expect(result.current.draftContextMenuEvent).toBeNull()
    })

    it('closeDraftContextMenu clears draft context menu', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.closeDraftContextMenu()
      })

      expect(result.current.draftContextMenuEvent).toBeNull()
    })
  })

  describe('rubber band selection', () => {
    it('rubber band selects features in area when drawMode is null', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add a feature first
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featureId = result.current.features.features[0].properties?._id

      // Set draw mode to null for rubber band
      act(() => {
        result.current.setDrawMode(null)
      })

      // Start rubber band (no feature hit)
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // no feature at start point
        mockMap._trigger('mousedown', makeMapEvent({ point: { x: 0, y: 0 } }))
      })

      // Move enough to activate rubber band
      act(() => {
        mockMap._trigger('mousemove', makeMapEvent({ point: { x: 100, y: 100 } }))
      })

      expect(result.current.rubberBand).not.toBeNull()

      // Release - should query features in area
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('mouseup', makeMapEvent({ point: { x: 100, y: 100 }, originalEvent: { shiftKey: false, clientX: 100, clientY: 100, preventDefault: vi.fn() } }))
      })

      expect(result.current.rubberBand).toBeNull()
      expect(result.current.selectedFeatureIds.has(featureId)).toBe(true)

      // wasRubberBanding flag prevents next click
      act(() => {
        vi.advanceTimersByTime(60)
      })
    })

    it('does not start rubber band when drawMode is set', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Draw mode is point by default
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('mousedown', makeMapEvent({ point: { x: 0, y: 0 } }))
      })

      act(() => {
        mockMap._trigger('mousemove', makeMapEvent({ point: { x: 100, y: 100 } }))
      })

      expect(result.current.rubberBand).toBeNull()
    })

    it('does not start rubber band when clicking on a feature', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode(null)
      })

      // useVertexEditing also registers mousedown handler that calls queryRenderedFeatures
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useVertexEditing mousedown vertex check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: 'some-feature' } }]) // rubber band mousedown feature check
        mockMap._trigger('mousedown', makeMapEvent({ point: { x: 0, y: 0 } }))
      })

      act(() => {
        mockMap._trigger('mousemove', makeMapEvent({ point: { x: 100, y: 100 } }))
      })

      expect(result.current.rubberBand).toBeNull()
    })

    it('small mouse movement does not activate rubber band', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode(null)
      })

      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('mousedown', makeMapEvent({ point: { x: 50, y: 50 } }))
      })

      act(() => {
        mockMap._trigger('mousemove', makeMapEvent({ point: { x: 52, y: 52 } }))
      })

      expect(result.current.rubberBand).toBeNull()
    })

    it('mouseup without active rubber band does not select', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode(null)
      })

      // mousedown
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('mousedown', makeMapEvent({ point: { x: 50, y: 50 } }))
      })

      // mouseup without enough movement (not active)
      act(() => {
        mockMap._trigger('mouseup', makeMapEvent({ point: { x: 52, y: 52 }, originalEvent: { shiftKey: false, clientX: 52, clientY: 52, preventDefault: vi.fn() } }))
      })

      expect(result.current.selectedFeatureIds.size).toBe(0)
    })

    it('shift + rubber band adds to existing selection', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add features
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      const id1 = result.current.features.features[0].properties?._id
      const id2 = result.current.features.features[1].properties?._id

      // Set draw mode to null first (this clears selectedFeatureIds via effect),
      // then set selectedFeatureIds after
      act(() => {
        result.current.setDrawMode(null)
      })

      act(() => {
        result.current.setSelectedFeatureIds(new Set([id1]))
      })

      // Rubber band select second feature with shift
      // useVertexEditing also registers mousedown handler
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useVertexEditing mousedown
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // rubber band mousedown
        mockMap._trigger('mousedown', makeMapEvent({ point: { x: 0, y: 0 } }))
      })
      act(() => {
        mockMap._trigger('mousemove', makeMapEvent({ point: { x: 100, y: 100 } }))
      })
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: id2 } }])
        mockMap._trigger('mouseup', makeMapEvent({
          point: { x: 100, y: 100 },
          originalEvent: { shiftKey: true, clientX: 100, clientY: 100, preventDefault: vi.fn() },
        }))
      })

      expect(result.current.selectedFeatureIds.size).toBe(2)
      expect(result.current.selectedFeatureIds.has(id1)).toBe(true)
      expect(result.current.selectedFeatureIds.has(id2)).toBe(true)
    })

    it('mousemove without mousedown does nothing', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode(null)
      })

      act(() => {
        mockMap._trigger('mousemove', makeMapEvent({ point: { x: 100, y: 100 } }))
      })

      expect(result.current.rubberBand).toBeNull()
    })

    it('mouseup without mousedown does nothing', () => {
      renderHook(() => useDrawingEngine(getMap()))

      // This should not throw
      act(() => {
        mockMap._trigger('mouseup', makeMapEvent({ point: { x: 100, y: 100 }, originalEvent: { shiftKey: false, clientX: 100, clientY: 100, preventDefault: vi.fn() } }))
      })
    })
  })

  describe('controlPanelProps', () => {
    it('returns correct control panel props', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      const props = result.current.controlPanelProps
      expect(props.drawMode).toBe('point')
      expect(props.isDrawingPath).toBe(false)
      expect(props.canFinalizeDraft).toBe(false)
      expect(props.hasSelectedFeature).toBe(false)
      expect(props.selectedCount).toBe(0)
      expect(props.canUndo).toBe(false)
      expect(props.canRedo).toBe(false)
      expect(typeof props.onChangeMode).toBe('function')
      expect(typeof props.onFinalize).toBe('function')
      expect(typeof props.onDeleteFeature).toBe('function')
      expect(typeof props.onResetGeoJSON).toBe('function')
      expect(typeof props.onUndo).toBe('function')
      expect(typeof props.onRedo).toBe('function')
    })
  })

  describe('highlight flash', () => {
    it('sets and clears highlighted feature id after timeout', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add a feature
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      const featureId = result.current.features.features[0].properties?._id

      // Click on the feature to trigger flash
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.highlightedPanelFeatureId).toBe(featureId)

      // After timeout, should clear
      act(() => {
        vi.advanceTimersByTime(1600)
      })

      expect(result.current.highlightedPanelFeatureId).toBeNull()
    })
  })

  describe('wasRubberBanding prevents click', () => {
    it('click is ignored right after rubber band', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode(null)
      })

      // Rubber band
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('mousedown', makeMapEvent({ point: { x: 0, y: 0 } }))
      })
      act(() => {
        mockMap._trigger('mousemove', makeMapEvent({ point: { x: 100, y: 100 } }))
      })
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('mouseup', makeMapEvent({ point: { x: 100, y: 100 }, originalEvent: { shiftKey: false, clientX: 100, clientY: 100, preventDefault: vi.fn() } }))
      })

      // Switch to point mode for click test
      act(() => {
        result.current.setDrawMode('point')
      })

      const featuresBefore = result.current.features.features.length

      // Immediate click should be ignored
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.features.features.length).toBe(featuresBefore)

      // After timeout, clicks work again
      act(() => {
        vi.advanceTimersByTime(60)
      })

      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.features.features.length).toBe(featuresBefore + 1)
    })
  })

  describe('context menu with draft points - string draftIndex', () => {
    it('handles draftIndex as string (MapLibre serialization)', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('line')
      })

      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })

      // Right-click on draft point with string draftIndex (MapLibre serializes numbers to strings)
      // useVertexEditing also registers a contextmenu handler
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useVertexEditing contextmenu vertex check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useDrawingEngine contextmenu vertex check
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { draftIndex: '0' } }]) // useDrawingEngine contextmenu draft check
        mockMap._trigger('contextmenu', makeMapEvent())
      })

      expect(result.current.draftContextMenuEvent).not.toBeNull()
      expect(result.current.draftContextMenuEvent?.draftIndex).toBe(0)
    })

    it('ignores invalid draftIndex', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.setDrawMode('line')
      })

      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })

      // Right-click on draft point with negative draftIndex
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // vertex
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { draftIndex: -1 } }]) // draft
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // feature
        mockMap._trigger('contextmenu', makeMapEvent())
      })

      expect(result.current.draftContextMenuEvent).toBeNull()
    })
  })

  describe('context menu with feature not found', () => {
    it('does not show context menu when feature _id exists but feature not in list', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // vertex
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // draft
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: 'nonexistent' } }])
        mockMap._trigger('contextmenu', makeMapEvent())
      })

      expect(result.current.contextMenuEvent).toBeNull()
    })
  })

  describe('resetGeoJSON clears highlight timer', () => {
    it('clears ongoing highlight timer on reset', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add and click a feature to start highlight timer
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })
      const featureId = result.current.features.features[0].properties?._id
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.highlightedPanelFeatureId).toBe(featureId)

      // Reset while timer is active
      act(() => {
        result.current.resetGeoJSON()
      })

      expect(result.current.highlightedPanelFeatureId).toBeNull()

      // Advancing timer should not cause issues
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.highlightedPanelFeatureId).toBeNull()
    })
  })

  describe('importGeoJSON replace clears highlight timer', () => {
    it('clears highlight timer on replace import', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })
      const featureId = result.current.features.features[0].properties?._id
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { _id: featureId } }])
        mockMap._trigger('click', makeMapEvent())
      })

      act(() => {
        result.current.importGeoJSON([], 'replace')
      })

      expect(result.current.highlightedPanelFeatureId).toBeNull()
    })
  })

  describe('vertex drag commits feature update', () => {
    it('dragging a vertex calls updateFeatureVertex with multiple features', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Create a Point feature first
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      // Create a LineString feature
      act(() => {
        result.current.setDrawMode('line')
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })
      act(() => {
        result.current.finalizeDraft()
      })

      expect(result.current.features.features).toHaveLength(2)
      const lineFeature = result.current.features.features[1]
      const lineId = lineFeature.properties?._id

      // Select the LineString to enable vertex editing
      act(() => {
        result.current.setSelectedFeatureIds(new Set([lineId]))
      })

      // Mousedown on vertex
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: lineId, vertexIndex: 0 } }])
        mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })
      })

      // Drag to new position
      act(() => {
        mockMap._trigger('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })
      })

      // Release (commits vertex move via updateFeatureVertex)
      act(() => {
        mockMap._trigger('mouseup', {})
      })

      // The LineString's first coordinate should be updated
      const line = result.current.features.features[1].geometry as GeoJSON.LineString
      expect(line.coordinates[0]).toEqual([5, 5])
      // The Point feature should be unchanged (covers `: f` branch in map())
      expect(result.current.features.features[0].geometry.type).toBe('Point')
    })

    it('click is ignored immediately after vertex drag (justDraggedRef)', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Create a LineString feature
      act(() => {
        result.current.setDrawMode('line')
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })
      act(() => {
        result.current.finalizeDraft()
      })

      const lineId = result.current.features.features[0].properties?._id

      // Select the feature
      act(() => {
        result.current.setSelectedFeatureIds(new Set([lineId]))
      })

      // Drag a vertex
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: lineId, vertexIndex: 0 } }])
        mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })
      })
      act(() => {
        mockMap._trigger('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })
      })
      act(() => {
        mockMap._trigger('mouseup', {})
      })

      // Try to click immediately after drag - should be ignored
      const featureCountBefore = result.current.features.features.length
      act(() => {
        mockMap.queryRenderedFeatures.mockReturnValueOnce([]) // useVertexEditing contextmenu (for click, vertex check)
        mockMap.queryRenderedFeatures.mockReturnValueOnce([])
        mockMap._trigger('click', makeMapEvent())
      })

      // No new feature should be added
      expect(result.current.features.features.length).toBe(featureCountBefore)

      // Clean up justDraggedRef timer
      act(() => {
        vi.advanceTimersByTime(60)
      })
    })
  })

  describe('source sync edge cases', () => {
    it('handles missing source gracefully when features change', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Remove the main source after setup
      delete mockMap._sources['geojson-maker-generated-features']

      // Trigger feature change - should not throw
      act(() => {
        result.current.setFeatures({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { _id: 'test' } }],
        })
      })

      expect(result.current.features.features).toHaveLength(1)
    })
  })

  describe('Mac keyboard shortcut', () => {
    it('uses metaKey on Mac', () => {
      const originalUA = navigator.userAgent
      Object.defineProperty(navigator, 'userAgent', { value: 'Macintosh', configurable: true })

      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })
      expect(result.current.features.features).toHaveLength(1)

      // Cmd+Z on Mac
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }))
      })

      expect(result.current.features.features).toHaveLength(0)

      Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true })
    })
  })
})
