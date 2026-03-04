import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDrawingEngine } from '../../hooks/useDrawingEngine'
import { createMockMap, makeMapEvent } from '../test-utils'
import type { MockMap } from '../test-utils'

describe('Integration: drawing flow', () => {
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

  describe('point drawing flow', () => {
    it('initializes with point mode, draws points, verifies features', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Initial state
      expect(result.current.drawMode).toBe('point')
      expect(result.current.features.features).toHaveLength(0)

      // Click to create first point
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 139.767, lat: 35.681 } }))
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].geometry.type).toBe('Point')
      const point1 = result.current.features.features[0].geometry as GeoJSON.Point
      expect(point1.coordinates).toEqual([139.767, 35.681])

      // Click to create second point
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 135.502, lat: 34.693 } }))
      })

      expect(result.current.features.features).toHaveLength(2)
      expect(result.current.features.features[1].geometry.type).toBe('Point')
    })
  })

  describe('line drawing flow', () => {
    it('set line mode -> click multiple points -> finalize -> verify LineString', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Switch to line mode
      act(() => {
        result.current.setDrawMode('line')
      })

      expect(result.current.drawMode).toBe('line')
      expect(result.current.isDrawingPath).toBe(true)

      // Click first point
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      expect(result.current.canFinalizeDraft).toBe(false)

      // Click second point
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })
      expect(result.current.canFinalizeDraft).toBe(true)

      // Click third point
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 2, lat: 0 } }))
      })

      // Finalize
      act(() => {
        result.current.finalizeDraft()
      })

      expect(result.current.features.features).toHaveLength(1)
      const lineFeature = result.current.features.features[0]
      expect(lineFeature.geometry.type).toBe('LineString')
      const line = lineFeature.geometry as GeoJSON.LineString
      expect(line.coordinates).toEqual([[0, 0], [1, 1], [2, 0]])
    })
  })

  describe('polygon drawing flow', () => {
    it('set polygon mode -> click points -> finalize -> verify Polygon', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Switch to polygon mode
      act(() => {
        result.current.setDrawMode('polygon')
      })

      expect(result.current.drawMode).toBe('polygon')
      expect(result.current.isDrawingPath).toBe(true)

      // Click three points for polygon (minimum required)
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

      // Finalize
      act(() => {
        result.current.finalizeDraft()
      })

      expect(result.current.features.features).toHaveLength(1)
      const polygonFeature = result.current.features.features[0]
      expect(polygonFeature.geometry.type).toBe('Polygon')
      const polygon = polygonFeature.geometry as GeoJSON.Polygon
      // Should be closed ring
      const ring = polygon.coordinates[0]
      expect(ring[0]).toEqual(ring[ring.length - 1])
      expect(ring).toHaveLength(4) // 3 vertices + closing point
    })
  })

  describe('multi-select and delete flow', () => {
    it('adds features -> multi-selects -> deletes -> verifies removal', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add three point features
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 2, lat: 2 } }))
      })

      expect(result.current.features.features).toHaveLength(3)

      const id1 = result.current.features.features[0].properties?._id
      const id2 = result.current.features.features[1].properties?._id

      // Select first two features
      act(() => {
        result.current.setSelectedFeatureIds(new Set([id1, id2]))
      })

      expect(result.current.selectedFeatureIds.size).toBe(2)

      // Delete selected
      act(() => {
        result.current.deleteSelectedFeatures()
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.selectedFeatureIds.size).toBe(0)
      // The remaining feature should be the third one
      expect(result.current.features.features[0].properties?._id).not.toBe(id1)
      expect(result.current.features.features[0].properties?._id).not.toBe(id2)
    })
  })

  describe('undo/redo flow across multiple operations', () => {
    it('performs multiple operations then undoes and redoes', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add point 1
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      expect(result.current.features.features).toHaveLength(1)

      // Add point 2
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })
      expect(result.current.features.features).toHaveLength(2)

      // Add point 3
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 2, lat: 2 } }))
      })
      expect(result.current.features.features).toHaveLength(3)

      // Undo once - back to 2 features
      act(() => {
        result.current.undo()
      })
      expect(result.current.features.features).toHaveLength(2)
      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(true)

      // Undo again - back to 1 feature
      act(() => {
        result.current.undo()
      })
      expect(result.current.features.features).toHaveLength(1)

      // Redo once - forward to 2 features
      act(() => {
        result.current.redo()
      })
      expect(result.current.features.features).toHaveLength(2)

      // Redo again - forward to 3 features
      act(() => {
        result.current.redo()
      })
      expect(result.current.features.features).toHaveLength(3)

      // No more redo
      expect(result.current.canRedo).toBe(false)

      // Undo all the way back to 0
      act(() => {
        result.current.undo()
      })
      act(() => {
        result.current.undo()
      })
      act(() => {
        result.current.undo()
      })
      expect(result.current.features.features).toHaveLength(0)
      expect(result.current.canUndo).toBe(false)
    })
  })

  describe('draw line, switch mode, draw polygon flow', () => {
    it('draws multiple geometry types in sequence', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Draw a point
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      expect(result.current.features.features).toHaveLength(1)

      // Switch to line mode and draw a line
      act(() => {
        result.current.setDrawMode('line')
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 10, lat: 10 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 11, lat: 11 } }))
      })
      act(() => {
        result.current.finalizeDraft()
      })
      expect(result.current.features.features).toHaveLength(2)
      expect(result.current.features.features[1].geometry.type).toBe('LineString')

      // Switch to polygon mode and draw a polygon
      act(() => {
        result.current.setDrawMode('polygon')
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 20, lat: 20 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 21, lat: 20 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 21, lat: 21 } }))
      })
      act(() => {
        result.current.finalizeDraft()
      })
      expect(result.current.features.features).toHaveLength(3)
      expect(result.current.features.features[2].geometry.type).toBe('Polygon')

      // Verify all feature types
      const types = result.current.features.features.map((f) => f.geometry.type)
      expect(types).toEqual(['Point', 'LineString', 'Polygon'])
    })
  })

  describe('reset flow', () => {
    it('draws features then resets and verifies clean state', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add several features
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      expect(result.current.features.features).toHaveLength(2)

      // Reset
      act(() => {
        result.current.resetGeoJSON()
      })

      expect(result.current.features.features).toHaveLength(0)
      expect(result.current.selectedFeatureIds.size).toBe(0)
      expect(result.current.highlightedPanelFeatureId).toBeNull()
    })
  })
})
