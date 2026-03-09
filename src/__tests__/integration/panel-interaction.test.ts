import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDrawingEngine } from '../../hooks/useDrawingEngine'
import { createMockMap, makeMapEvent } from '../test-utils'
import type { MockMap } from '../test-utils'

describe('Integration: DrawControlPanel with useDrawingEngine', () => {
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

  describe('controlPanelProps reflect engine state', () => {
    it('initial controlPanelProps match initial state', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      const props = result.current.controlPanelProps
      expect(props.drawMode).toBe('point')
      expect(props.isDrawingPath).toBe(false)
      expect(props.canFinalizeDraft).toBe(false)
      expect(props.hasSelectedFeature).toBe(false)
      expect(props.selectedCount).toBe(0)
      expect(props.canUndo).toBe(false)
      expect(props.canRedo).toBe(false)
    })

    it('controlPanelProps update after mode change', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.controlPanelProps.onChangeMode('line')
      })

      expect(result.current.controlPanelProps.drawMode).toBe('line')
      expect(result.current.controlPanelProps.isDrawingPath).toBe(true)
    })

    it('controlPanelProps update after drawing and selecting', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Draw a point
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })

      expect(result.current.controlPanelProps.canUndo).toBe(true)

      // Select the feature
      const featureId = result.current.features.features[0].properties?._id
      act(() => {
        result.current.setSelectedFeatureIds(new Set([featureId]))
      })

      expect(result.current.controlPanelProps.hasSelectedFeature).toBe(true)
      expect(result.current.controlPanelProps.selectedCount).toBe(1)
    })
  })

  describe('mode button interactions via controlPanelProps', () => {
    it('onChangeMode changes the draw mode', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.controlPanelProps.onChangeMode('polygon')
      })

      expect(result.current.drawMode).toBe('polygon')
      expect(result.current.controlPanelProps.drawMode).toBe('polygon')
    })

    it('onChangeMode to null enters selection mode', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      act(() => {
        result.current.controlPanelProps.onChangeMode(null)
      })

      expect(result.current.drawMode).toBeNull()
      expect(result.current.controlPanelProps.isDrawingPath).toBe(false)
    })
  })

  describe('undo/redo via controlPanelProps', () => {
    it('onUndo and onRedo work through controlPanelProps', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add a feature
      act(() => {
        mockMap._trigger('click', makeMapEvent())
      })
      expect(result.current.features.features).toHaveLength(1)

      // Undo via panel props
      act(() => {
        result.current.controlPanelProps.onUndo()
      })
      expect(result.current.features.features).toHaveLength(0)
      expect(result.current.controlPanelProps.canUndo).toBe(false)
      expect(result.current.controlPanelProps.canRedo).toBe(true)

      // Redo via panel props
      act(() => {
        result.current.controlPanelProps.onRedo()
      })
      expect(result.current.features.features).toHaveLength(1)
    })
  })

  describe('delete via controlPanelProps', () => {
    it('onDeleteFeature removes selected features', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add two features
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      const id1 = result.current.features.features[0].properties?._id

      // Select first feature
      act(() => {
        result.current.setSelectedFeatureIds(new Set([id1]))
      })

      expect(result.current.controlPanelProps.hasSelectedFeature).toBe(true)

      // Delete via panel props
      act(() => {
        result.current.controlPanelProps.onDeleteFeature()
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.controlPanelProps.hasSelectedFeature).toBe(false)
    })
  })

  describe('finalize via controlPanelProps', () => {
    it('onFinalize creates line feature from draft', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Switch to line mode
      act(() => {
        result.current.controlPanelProps.onChangeMode('line')
      })

      // Draw two points
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      expect(result.current.controlPanelProps.canFinalizeDraft).toBe(true)

      // Finalize via panel props
      act(() => {
        result.current.controlPanelProps.onFinalize()
      })

      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].geometry.type).toBe('LineString')
    })
  })

  describe('reset via controlPanelProps', () => {
    it('onResetGeoJSON clears all features', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // Add features
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })
      expect(result.current.features.features).toHaveLength(2)

      // Reset via panel props
      act(() => {
        result.current.controlPanelProps.onResetGeoJSON()
      })

      expect(result.current.features.features).toHaveLength(0)
    })
  })

  describe('full panel workflow', () => {
    it('mode change -> draw -> finalize -> select -> delete -> undo', () => {
      const { result } = renderHook(() => useDrawingEngine(getMap()))

      // 1. Change to polygon mode via panel
      act(() => {
        result.current.controlPanelProps.onChangeMode('polygon')
      })
      expect(result.current.controlPanelProps.drawMode).toBe('polygon')

      // 2. Draw a polygon
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 0, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 0 } }))
      })
      act(() => {
        mockMap._trigger('click', makeMapEvent({ lngLat: { lng: 1, lat: 1 } }))
      })

      // 3. Finalize via panel
      act(() => {
        result.current.controlPanelProps.onFinalize()
      })
      expect(result.current.features.features).toHaveLength(1)

      // 4. Switch to selection mode and select the polygon
      act(() => {
        result.current.controlPanelProps.onChangeMode(null)
      })
      const featureId = result.current.features.features[0].properties?._id
      act(() => {
        result.current.setSelectedFeatureIds(new Set([featureId]))
      })

      // 5. Delete via panel
      act(() => {
        result.current.controlPanelProps.onDeleteFeature()
      })
      expect(result.current.features.features).toHaveLength(0)

      // 6. Undo the deletion via panel
      act(() => {
        result.current.controlPanelProps.onUndo()
      })
      expect(result.current.features.features).toHaveLength(1)
      expect(result.current.features.features[0].geometry.type).toBe('Polygon')
    })
  })
})
