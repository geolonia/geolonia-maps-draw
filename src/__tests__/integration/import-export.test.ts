import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDrawingEngine } from '../../hooks/useDrawingEngine'
import { parseGeoJSONImport } from '../../lib/geojson-helpers'
import { createMockMap, makeMapEvent } from '../test-utils'
import type { MockMap } from '../test-utils'

describe('Integration: import/export flow', () => {
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

  describe('GeoJSON import -> verify features -> export matches', () => {
    it('imports GeoJSON FeatureCollection and features are accessible', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      const geojsonText = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [139.767, 35.681] },
            properties: { name: 'Tokyo Station' },
          },
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 0]] },
            properties: { name: 'Test Line' },
          },
        ],
      })

      const importedFeatures = parseGeoJSONImport(geojsonText)

      act(() => {
        result.current.importGeoJSON(importedFeatures, 'replace')
      })

      expect(result.current.features.features).toHaveLength(2)
      expect(result.current.features.features[0].geometry.type).toBe('Point')
      expect(result.current.features.features[1].geometry.type).toBe('LineString')

      // Verify properties are preserved with _id and drawMode added
      expect(result.current.features.features[0].properties?.name).toBe('Tokyo Station')
      expect(result.current.features.features[0].properties?._id).toBeDefined()
      expect(result.current.features.features[0].properties?.drawMode).toBe('point')
      expect(result.current.features.features[1].properties?.drawMode).toBe('line')

      // Export matches: the output FeatureCollection contains the imported features
      const exported = result.current.features
      expect(exported.type).toBe('FeatureCollection')
      expect(exported.features).toHaveLength(2)
    })
  })

  describe('CSV import -> verify point features', () => {
    it('imports CSV and creates point features with correct coordinates', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      const csv = 'name,lat,lng,category\n東京駅,35.681,139.767,駅\n大阪駅,34.693,135.502,駅'

      act(() => {
        result.current.importCSV(csv)
      })

      expect(result.current.features.features).toHaveLength(2)

      // Verify first point
      const point1 = result.current.features.features[0]
      expect(point1.geometry.type).toBe('Point')
      const coords1 = (point1.geometry as GeoJSON.Point).coordinates
      expect(coords1[0]).toBe(139.767) // lng
      expect(coords1[1]).toBe(35.681) // lat

      // Verify properties
      expect(point1.properties?.name).toBe('東京駅')
      expect(point1.properties?.category).toBe('駅')
      expect(point1.properties?.drawMode).toBe('point')

      // Verify second point
      const point2 = result.current.features.features[1]
      const coords2 = (point2.geometry as GeoJSON.Point).coordinates
      expect(coords2[0]).toBe(135.502)
      expect(coords2[1]).toBe(34.693)
    })
  })

  describe('import with merge mode', () => {
    it('keeps existing features and adds imported ones', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Draw a point first
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      expect(result.current.features.features).toHaveLength(1)

      const existingFeatureId = result.current.features.features[0].properties?._id

      // Import with merge
      const importedFeatures: GeoJSON.Feature[] = [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [1, 1] },
        properties: { _id: 'imported-1', drawMode: 'point' },
      }]

      act(() => {
        result.current.importGeoJSON(importedFeatures, 'merge')
      })

      expect(result.current.features.features).toHaveLength(2)
      // Existing feature is still there
      expect(result.current.features.features[0].properties?._id).toBe(existingFeatureId)
      // Imported feature was appended
      expect(result.current.features.features[1].properties?._id).toBe('imported-1')
    })
  })

  describe('import with replace mode', () => {
    it('replaces all existing features with imported ones', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Draw two points first
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })
      expect(result.current.features.features).toHaveLength(2)

      // Import with replace
      const importedFeatures: GeoJSON.Feature[] = [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[10, 10], [20, 20]] },
        properties: { _id: 'replaced-1', drawMode: 'line' },
      }]

      act(() => {
        result.current.importGeoJSON(importedFeatures, 'replace')
      })

      // Only the imported feature remains
      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].properties?._id).toBe('replaced-1')
      expect(result.current.features.features[0].geometry.type).toBe('LineString')

      // Selection and highlight should be cleared
      expect(result.current.selectedFeatureIds.size).toBe(0)
      expect(result.current.highlightedPanelFeatureId).toBeNull()
    })
  })

  describe('import single Feature', () => {
    it('imports a single GeoJSON Feature', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      const geojsonText = JSON.stringify({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        properties: { name: 'Triangle' },
      })

      const importedFeatures = parseGeoJSONImport(geojsonText)

      act(() => {
        result.current.importGeoJSON(importedFeatures, 'replace')
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].geometry.type).toBe('Polygon')
      expect(result.current.features.features[0].properties?.name).toBe('Triangle')
      expect(result.current.features.features[0].properties?.drawMode).toBe('polygon')
    })
  })

  describe('import then undo', () => {
    it('imports features then undoes the import', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Draw a point
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      expect(result.current.features.features).toHaveLength(1)

      // Import with merge
      const importedFeatures: GeoJSON.Feature[] = [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [5, 5] },
        properties: { _id: 'imported-undo', drawMode: 'point' },
      }]

      act(() => {
        result.current.importGeoJSON(importedFeatures, 'merge')
      })
      expect(result.current.features.features).toHaveLength(2)

      // Undo the import
      act(() => {
        result.current.undo()
      })
      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].properties?._id).not.toBe('imported-undo')
    })
  })
})
