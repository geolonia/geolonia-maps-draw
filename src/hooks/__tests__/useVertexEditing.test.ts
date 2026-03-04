import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVertexEditing, VERTEX_SOURCE_ID, VERTEX_LAYER_ID } from '../useVertexEditing'
import type { SelectedVertex, VertexContextMenuEvent } from '../useVertexEditing'
import { createMockMap, type MockMap } from '../../__tests__/test-utils'

function makeFeatures(...features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features }
}

function makeLine(id: string, coords: number[][]): GeoJSON.Feature {
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: { _id: id },
  }
}

function makePolygon(id: string, coords: number[][]): GeoJSON.Feature {
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: { _id: id },
  }
}

function makePoint(id: string, coord: number[]): GeoJSON.Feature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coord },
    properties: { _id: id },
  }
}

describe('useVertexEditing', () => {
  let mockMap: MockMap

  beforeEach(() => {
    mockMap = createMockMap()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const defaultOptions = () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map: mockMap as any,
    features: makeFeatures(),
    selectedFeatureId: null as string | null,
    mainSourceId: 'main-source',
    onCommit: vi.fn(),
    selectedVertex: null as SelectedVertex | null,
    onVertexSelect: vi.fn(),
    onVertexContextMenu: vi.fn() as (event: VertexContextMenuEvent | null) => void,
  })

  it('adds vertex source and layer on mount', () => {
    const opts = defaultOptions()
    renderHook(() => useVertexEditing(opts))

    expect(mockMap.addSource).toHaveBeenCalledWith(VERTEX_SOURCE_ID, expect.anything())
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: VERTEX_LAYER_ID, source: VERTEX_SOURCE_ID }),
    )
  })

  it('removes vertex source and layer on unmount', () => {
    const opts = defaultOptions()
    const { unmount } = renderHook(() => useVertexEditing(opts))
    unmount()

    expect(mockMap.removeLayer).toHaveBeenCalledWith(VERTEX_LAYER_ID)
    expect(mockMap.removeSource).toHaveBeenCalledWith(VERTEX_SOURCE_ID)
  })

  it('does nothing when map is null', () => {
    const opts = { ...defaultOptions(), map: null }
    const { result } = renderHook(() => useVertexEditing(opts))
    expect(result.current.justDraggedRef.current).toBe(false)
  })

  it('sets empty vertex handles when no selectedFeatureId', () => {
    const opts = defaultOptions()
    renderHook(() => useVertexEditing(opts))

    const source = mockMap._sources[VERTEX_SOURCE_ID]
    expect(source.setData).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FeatureCollection', features: [] }),
    )
  })

  it('sets vertex handles for LineString feature', () => {
    const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
    const opts = { ...defaultOptions(), features: makeFeatures(line), selectedFeatureId: 'f1' }
    renderHook(() => useVertexEditing(opts))

    const source = mockMap._sources[VERTEX_SOURCE_ID]
    const lastCall = source.setData.mock.calls[source.setData.mock.calls.length - 1][0]
    expect(lastCall.features).toHaveLength(3)
  })

  it('sets vertex handles for Polygon feature', () => {
    const poly = makePolygon('f1', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]])
    const opts = { ...defaultOptions(), features: makeFeatures(poly), selectedFeatureId: 'f1' }
    renderHook(() => useVertexEditing(opts))

    const source = mockMap._sources[VERTEX_SOURCE_ID]
    const lastCall = source.setData.mock.calls[source.setData.mock.calls.length - 1][0]
    // 4 vertices (excluding closing point)
    expect(lastCall.features).toHaveLength(4)
  })

  it('sets empty handles for Point feature', () => {
    const point = makePoint('f1', [0, 0])
    const opts = { ...defaultOptions(), features: makeFeatures(point), selectedFeatureId: 'f1' }
    renderHook(() => useVertexEditing(opts))

    const source = mockMap._sources[VERTEX_SOURCE_ID]
    const lastCall = source.setData.mock.calls[source.setData.mock.calls.length - 1][0]
    expect(lastCall.features).toHaveLength(0)
  })

  it('shows selected vertex with selected=true', () => {
    const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
    const opts = {
      ...defaultOptions(),
      features: makeFeatures(line),
      selectedFeatureId: 'f1',
      selectedVertex: { featureId: 'f1', vertexIndex: 1 },
    }
    renderHook(() => useVertexEditing(opts))

    const source = mockMap._sources[VERTEX_SOURCE_ID]
    const lastCall = source.setData.mock.calls[source.setData.mock.calls.length - 1][0]
    expect(lastCall.features[1].properties.selected).toBe(true)
    expect(lastCall.features[0].properties.selected).toBe(false)
  })

  it('shows selected vertex with selected=true for Polygon', () => {
    const poly = makePolygon('f1', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]])
    const opts = {
      ...defaultOptions(),
      features: makeFeatures(poly),
      selectedFeatureId: 'f1',
      selectedVertex: { featureId: 'f1', vertexIndex: 2 },
    }
    renderHook(() => useVertexEditing(opts))

    const source = mockMap._sources[VERTEX_SOURCE_ID]
    const lastCall = source.setData.mock.calls[source.setData.mock.calls.length - 1][0]
    expect(lastCall.features[2].properties.selected).toBe(true)
    expect(lastCall.features[0].properties.selected).toBe(false)
  })

  describe('mouse events', () => {
    it('changes cursor to grab on vertex hover', () => {
      const line = makeLine('f1', [[0, 0], [1, 1]])
      const opts = { ...defaultOptions(), features: makeFeatures(line), selectedFeatureId: 'f1' }
      renderHook(() => useVertexEditing(opts))

      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      mockMap._trigger('mousemove', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      expect(mockMap._canvas.style.cursor).toBe('grab')
    })

    it('resets cursor when not hovering vertex', () => {
      const opts = defaultOptions()
      renderHook(() => useVertexEditing(opts))

      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('mousemove', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      expect(mockMap._canvas.style.cursor).toBe('')
    })

    it('starts drag on mousedown on vertex', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const opts = { ...defaultOptions(), features: makeFeatures(line), selectedFeatureId: 'f1' }
      renderHook(() => useVertexEditing(opts))

      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      expect(mockMap._canvas.style.cursor).toBe('grabbing')
      expect(mockMap.dragPan.disable).toHaveBeenCalled()
    })

    it('does not start drag when no vertex hit', () => {
      const opts = defaultOptions()
      renderHook(() => useVertexEditing(opts))

      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      expect(mockMap.dragPan.disable).not.toHaveBeenCalled()
    })

    it('commits vertex move on mouseup after drag', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const opts = { ...defaultOptions(), features: makeFeatures(line), selectedFeatureId: 'f1', onCommit }
      renderHook(() => useVertexEditing(opts))

      // mousedown on vertex
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      // mousemove (drag)
      mockMap._trigger('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })

      // mouseup
      mockMap._trigger('mouseup', {})

      expect(onCommit).toHaveBeenCalledTimes(1)
      expect(mockMap.dragPan.enable).toHaveBeenCalled()
    })

    it('selects vertex on click without drag', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onVertexSelect = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedFeatureId: 'f1',
        onVertexSelect,
      }
      renderHook(() => useVertexEditing(opts))

      // mousedown on vertex
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 1 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      // mouseup without moving
      mockMap._trigger('mouseup', {})

      expect(onVertexSelect).toHaveBeenCalledWith({ featureId: 'f1', vertexIndex: 1 })
    })

    it('sets justDraggedRef after drag', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const opts = { ...defaultOptions(), features: makeFeatures(line), selectedFeatureId: 'f1' }
      const { result } = renderHook(() => useVertexEditing(opts))

      // mousedown
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      // mousemove
      mockMap._trigger('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })

      // mouseup
      mockMap._trigger('mouseup', {})
      expect(result.current.justDraggedRef.current).toBe(true)

      // after timeout, it resets
      act(() => { vi.advanceTimersByTime(60) })
      expect(result.current.justDraggedRef.current).toBe(false)
    })

    it('shows context menu on right-click on vertex', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onVertexContextMenu = vi.fn()
      const onVertexSelect = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedFeatureId: 'f1',
        onVertexContextMenu,
        onVertexSelect,
      }
      renderHook(() => useVertexEditing(opts))

      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 2 } }])
      mockMap._trigger('contextmenu', {
        point: { x: 10, y: 10 },
        lngLat: { lng: 0, lat: 0 },
        preventDefault: vi.fn(),
        originalEvent: { clientX: 100, clientY: 200 },
      })

      expect(onVertexSelect).toHaveBeenCalledWith({ featureId: 'f1', vertexIndex: 2 })
      expect(onVertexContextMenu).toHaveBeenCalledWith({
        featureId: 'f1',
        vertexIndex: 2,
        x: 100,
        y: 200,
      })
    })

    it('does nothing on contextmenu when no vertex hit', () => {
      const opts = defaultOptions()
      renderHook(() => useVertexEditing(opts))

      mockMap.queryRenderedFeatures.mockReturnValueOnce([])
      mockMap._trigger('contextmenu', {
        point: { x: 10, y: 10 },
        preventDefault: vi.fn(),
        originalEvent: { clientX: 100, clientY: 200 },
      })

      expect(opts.onVertexContextMenu).not.toHaveBeenCalled()
    })

    it('mouseup without prior mousedown does nothing', () => {
      const opts = defaultOptions()
      renderHook(() => useVertexEditing(opts))

      mockMap._trigger('mouseup', {})
      expect(opts.onCommit).not.toHaveBeenCalled()
    })

    it('does not start drag when feature not found in features list', () => {
      const opts = defaultOptions()
      renderHook(() => useVertexEditing(opts))

      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'nonexistent', vertexIndex: 0 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      expect(mockMap.dragPan.disable).not.toHaveBeenCalled()
    })

    it('does not check hover when vertex layer is missing', () => {
      const opts = defaultOptions()
      renderHook(() => useVertexEditing(opts))

      // Remove the vertex layer
      mockMap._layers.delete(VERTEX_LAYER_ID)

      mockMap._trigger('mousemove', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })
      expect(mockMap.queryRenderedFeatures).not.toHaveBeenCalled()
    })

    it('does not start drag when vertex layer is missing', () => {
      const opts = defaultOptions()
      renderHook(() => useVertexEditing(opts))

      mockMap._layers.delete(VERTEX_LAYER_ID)

      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })
      expect(mockMap.dragPan.disable).not.toHaveBeenCalled()
    })

    it('does not handle contextmenu when vertex layer is missing', () => {
      const opts = defaultOptions()
      renderHook(() => useVertexEditing(opts))

      mockMap._layers.delete(VERTEX_LAYER_ID)

      mockMap._trigger('contextmenu', {
        point: { x: 10, y: 10 },
        preventDefault: vi.fn(),
        originalEvent: { clientX: 100, clientY: 200 },
      })
      expect(opts.onVertexContextMenu).not.toHaveBeenCalled()
    })

    it('updates main source during drag', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const opts = { ...defaultOptions(), features: makeFeatures(line), selectedFeatureId: 'f1' }
      // Need to create the main source so getSource finds it
      mockMap.addSource('main-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      renderHook(() => useVertexEditing(opts))

      // mousedown on vertex
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      // mousemove
      mockMap._trigger('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })

      const mainSource = mockMap._sources['main-source']
      expect(mainSource.setData).toHaveBeenCalled()
    })

    it('updates main source during drag with multiple features (covers both branches of ternary)', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const otherLine = makeLine('f2', [[10, 10], [11, 11]])
      const opts = { ...defaultOptions(), features: makeFeatures(line, otherLine), selectedFeatureId: 'f1' }
      mockMap.addSource('main-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      renderHook(() => useVertexEditing(opts))

      // mousedown on vertex of f1
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      // mousemove (drag)
      mockMap._trigger('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })

      const mainSource = mockMap._sources['main-source']
      const lastCall = mainSource.setData.mock.calls[mainSource.setData.mock.calls.length - 1][0]
      // f1 should be updated, f2 should remain unchanged
      expect(lastCall.features).toHaveLength(2)
      expect((lastCall.features[0].geometry as GeoJSON.LineString).coordinates[0]).toEqual([5, 5])
      expect(lastCall.features[1].properties._id).toBe('f2')
    })
  })

  describe('vertex move for Polygon', () => {
    it('moves vertex 0 of polygon and updates closing point', () => {
      const poly = makePolygon('f1', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]])
      const onCommit = vi.fn()
      const opts = { ...defaultOptions(), features: makeFeatures(poly), selectedFeatureId: 'f1', onCommit }
      renderHook(() => useVertexEditing(opts))

      // mousedown on vertex 0
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      // drag to new position
      mockMap._trigger('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })
      mockMap._trigger('mouseup', {})

      const committed = onCommit.mock.calls[0][0]
      const ring = (committed.geometry as GeoJSON.Polygon).coordinates[0]
      // vertex 0 and closing point should both be updated
      expect(ring[0]).toEqual([5, 5])
      expect(ring[ring.length - 1]).toEqual([5, 5])
    })

    it('moves middle vertex of polygon', () => {
      const poly = makePolygon('f1', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]])
      const onCommit = vi.fn()
      const opts = { ...defaultOptions(), features: makeFeatures(poly), selectedFeatureId: 'f1', onCommit }
      renderHook(() => useVertexEditing(opts))

      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 2 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })
      mockMap._trigger('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 9, lat: 9 } })
      mockMap._trigger('mouseup', {})

      const committed = onCommit.mock.calls[0][0]
      const ring = (committed.geometry as GeoJSON.Polygon).coordinates[0]
      expect(ring[2]).toEqual([9, 9])
    })
  })

  describe('vertex move for non-LineString/Polygon (no-op)', () => {
    it('applyVertexMove returns same feature for Point', () => {
      const point = makePoint('f1', [0, 0])
      const onCommit = vi.fn()
      const opts = { ...defaultOptions(), features: makeFeatures(point), selectedFeatureId: 'f1', onCommit }
      renderHook(() => useVertexEditing(opts))

      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })
      mockMap._trigger('mousemove', { point: { x: 20, y: 20 }, lngLat: { lng: 5, lat: 5 } })
      mockMap._trigger('mouseup', {})

      // Should still commit (feature is returned as-is for unsupported types)
      expect(onCommit).toHaveBeenCalled()
    })
  })

  describe('deleteSelectedVertex', () => {
    it('deletes the selected vertex', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const onVertexSelect = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedFeatureId: 'f1',
        selectedVertex: { featureId: 'f1', vertexIndex: 1 },
        onCommit,
        onVertexSelect,
      }
      const { result } = renderHook(() => useVertexEditing(opts))

      act(() => {
        result.current.deleteSelectedVertex()
      })

      expect(onCommit).toHaveBeenCalledTimes(1)
      const committed = onCommit.mock.calls[0][0]
      expect((committed.geometry as GeoJSON.LineString).coordinates).toEqual([[0, 0], [2, 2]])
      expect(onVertexSelect).toHaveBeenCalledWith(null)
    })

    it('does nothing when no vertex is selected', () => {
      const opts = defaultOptions()
      const { result } = renderHook(() => useVertexEditing(opts))

      act(() => {
        result.current.deleteSelectedVertex()
      })

      expect(opts.onCommit).not.toHaveBeenCalled()
    })

    it('does nothing when feature not found', () => {
      const opts = {
        ...defaultOptions(),
        selectedVertex: { featureId: 'nonexistent', vertexIndex: 0 },
      }
      const { result } = renderHook(() => useVertexEditing(opts))

      act(() => {
        result.current.deleteSelectedVertex()
      })

      expect(opts.onCommit).not.toHaveBeenCalled()
    })

    it('does nothing when cannot delete vertex (min vertices)', () => {
      const line = makeLine('f1', [[0, 0], [1, 1]])
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedVertex: { featureId: 'f1', vertexIndex: 0 },
      }
      const { result } = renderHook(() => useVertexEditing(opts))

      act(() => {
        result.current.deleteSelectedVertex()
      })

      expect(opts.onCommit).not.toHaveBeenCalled()
    })
  })

  describe('keyboard handler', () => {
    it('Delete key triggers vertex deletion', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedFeatureId: 'f1',
        selectedVertex: { featureId: 'f1', vertexIndex: 1 },
        onCommit,
      }
      renderHook(() => useVertexEditing(opts))

      const event = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true })
      window.dispatchEvent(event)

      expect(onCommit).toHaveBeenCalled()
    })

    it('Backspace key triggers vertex deletion', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedFeatureId: 'f1',
        selectedVertex: { featureId: 'f1', vertexIndex: 1 },
        onCommit,
      }
      renderHook(() => useVertexEditing(opts))

      const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true })
      window.dispatchEvent(event)

      expect(onCommit).toHaveBeenCalled()
    })

    it('ignores key events on INPUT elements', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedVertex: { featureId: 'f1', vertexIndex: 1 },
        onCommit,
      }
      renderHook(() => useVertexEditing(opts))

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      const event = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)
      document.body.removeChild(input)

      expect(onCommit).not.toHaveBeenCalled()
    })

    it('ignores key events on TEXTAREA elements', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedVertex: { featureId: 'f1', vertexIndex: 1 },
        onCommit,
      }
      renderHook(() => useVertexEditing(opts))

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      const event = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true })
      Object.defineProperty(event, 'target', { value: textarea })
      window.dispatchEvent(event)
      document.body.removeChild(textarea)

      expect(onCommit).not.toHaveBeenCalled()
    })

    it('ignores non-Delete/Backspace keys', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedVertex: { featureId: 'f1', vertexIndex: 1 },
        onCommit,
      }
      renderHook(() => useVertexEditing(opts))

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      expect(onCommit).not.toHaveBeenCalled()
    })

    it('does nothing when no vertex is selected', () => {
      const opts = defaultOptions()
      renderHook(() => useVertexEditing(opts))

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
      expect(opts.onCommit).not.toHaveBeenCalled()
    })

    it('cleans up keyboard listener on unmount', () => {
      const opts = {
        ...defaultOptions(),
        selectedVertex: { featureId: 'f1', vertexIndex: 0 },
      }
      const { unmount } = renderHook(() => useVertexEditing(opts))
      unmount()

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
      expect(opts.onCommit).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('removes map event listeners on unmount', () => {
      const opts = defaultOptions()
      const { unmount } = renderHook(() => useVertexEditing(opts))

      unmount()

      expect(mockMap.off).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(mockMap.off).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(mockMap.off).toHaveBeenCalledWith('mouseup', expect.any(Function))
      expect(mockMap.off).toHaveBeenCalledWith('contextmenu', expect.any(Function))
    })
  })

  describe('source setData edge cases', () => {
    it('handles source without setData gracefully', () => {
      const line = makeLine('f1', [[0, 0], [1, 1]])
      const opts = { ...defaultOptions(), features: makeFeatures(line), selectedFeatureId: 'f1' }

      // Override getSource to return object without setData
      mockMap.getSource.mockImplementation(((id: string) => {
        if (id === VERTEX_SOURCE_ID) return {}
        return mockMap._sources[id]
      }) as typeof mockMap.getSource)

      // Should not throw
      expect(() => renderHook(() => useVertexEditing(opts))).not.toThrow()
    })
  })

  describe('edge cases - dragging vertex to same position', () => {
    it('commits even when vertex is dragged to same position', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const opts = { ...defaultOptions(), features: makeFeatures(line), selectedFeatureId: 'f1', onCommit }
      renderHook(() => useVertexEditing(opts))

      // mousedown on vertex
      mockMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { featureId: 'f1', vertexIndex: 0 } }])
      mockMap._trigger('mousedown', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      // mousemove to same position (hasMoved becomes true because mousemove fires)
      mockMap._trigger('mousemove', { point: { x: 10, y: 10 }, lngLat: { lng: 0, lat: 0 } })

      // mouseup
      mockMap._trigger('mouseup', {})

      // hasMoved is true so onCommit is called, even though position didn't change
      expect(onCommit).toHaveBeenCalledTimes(1)
      const committed = onCommit.mock.calls[0][0]
      expect((committed.geometry as GeoJSON.LineString).coordinates[0]).toEqual([0, 0])
    })
  })

  describe('edge cases - feature with many vertices', () => {
    it('handles line with many vertices', () => {
      const coords = Array.from({ length: 100 }, (_, i) => [i, i])
      const line = makeLine('f1', coords)
      const opts = { ...defaultOptions(), features: makeFeatures(line), selectedFeatureId: 'f1' }
      renderHook(() => useVertexEditing(opts))

      const source = mockMap._sources[VERTEX_SOURCE_ID]
      const lastCall = source.setData.mock.calls[source.setData.mock.calls.length - 1][0]
      expect(lastCall.features).toHaveLength(100)
    })

    it('handles polygon with many vertices', () => {
      // 50 vertices + closing point = 51
      const ring = Array.from({ length: 50 }, (_, i) => [Math.cos(i * 2 * Math.PI / 50), Math.sin(i * 2 * Math.PI / 50)])
      ring.push(ring[0]) // close the ring
      const poly = makePolygon('f1', ring)
      const opts = { ...defaultOptions(), features: makeFeatures(poly), selectedFeatureId: 'f1' }
      renderHook(() => useVertexEditing(opts))

      const source = mockMap._sources[VERTEX_SOURCE_ID]
      const lastCall = source.setData.mock.calls[source.setData.mock.calls.length - 1][0]
      // Should be 50 vertex handles (excluding closing point)
      expect(lastCall.features).toHaveLength(50)
    })
  })

  describe('edge cases - SELECT element key events', () => {
    it('ignores key events on SELECT elements', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedVertex: { featureId: 'f1', vertexIndex: 1 },
        onCommit,
      }
      renderHook(() => useVertexEditing(opts))

      const select = document.createElement('select')
      document.body.appendChild(select)
      const event = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true })
      Object.defineProperty(event, 'target', { value: select })
      window.dispatchEvent(event)
      document.body.removeChild(select)

      expect(onCommit).not.toHaveBeenCalled()
    })

    it('ignores key events on contentEditable elements', () => {
      const line = makeLine('f1', [[0, 0], [1, 1], [2, 2]])
      const onCommit = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(line),
        selectedVertex: { featureId: 'f1', vertexIndex: 1 },
        onCommit,
      }
      renderHook(() => useVertexEditing(opts))

      const div = document.createElement('div')
      Object.defineProperty(div, 'isContentEditable', { value: true })
      document.body.appendChild(div)
      const event = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true })
      Object.defineProperty(event, 'target', { value: div })
      window.dispatchEvent(event)
      document.body.removeChild(div)

      expect(onCommit).not.toHaveBeenCalled()
    })
  })

  describe('edge cases - vertex deletion for polygon', () => {
    it('deletes vertex from polygon with more than 3 vertices', () => {
      const poly = makePolygon('f1', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]])
      const onCommit = vi.fn()
      const onVertexSelect = vi.fn()
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(poly),
        selectedFeatureId: 'f1',
        selectedVertex: { featureId: 'f1', vertexIndex: 1 },
        onCommit,
        onVertexSelect,
      }
      const { result } = renderHook(() => useVertexEditing(opts))

      act(() => {
        result.current.deleteSelectedVertex()
      })

      expect(onCommit).toHaveBeenCalledTimes(1)
      const committed = onCommit.mock.calls[0][0]
      const ring = (committed.geometry as GeoJSON.Polygon).coordinates[0]
      // 3 vertices + closing point after deletion
      expect(ring).toHaveLength(4)
      expect(onVertexSelect).toHaveBeenCalledWith(null)
    })

    it('does not delete vertex from polygon with exactly 3 vertices', () => {
      const poly = makePolygon('f1', [[0, 0], [1, 0], [0, 1], [0, 0]])
      const opts = {
        ...defaultOptions(),
        features: makeFeatures(poly),
        selectedFeatureId: 'f1',
        selectedVertex: { featureId: 'f1', vertexIndex: 0 },
      }
      const { result } = renderHook(() => useVertexEditing(opts))

      act(() => {
        result.current.deleteSelectedVertex()
      })

      expect(opts.onCommit).not.toHaveBeenCalled()
    })
  })
})
