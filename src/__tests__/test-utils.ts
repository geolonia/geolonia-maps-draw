import { vi } from 'vitest'

/**
 * Creates a consistently mocked MapLibre Map instance for testing.
 */
export function createMockMap() {
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

export type MockMap = ReturnType<typeof createMockMap>

/**
 * Creates a mock map mouse event for testing.
 */
export function makeMapEvent(overrides: Record<string, unknown> = {}) {
  return {
    point: { x: 10, y: 10 },
    lngLat: { lng: 139.767, lat: 35.681 },
    originalEvent: { clientX: 100, clientY: 200, shiftKey: false, preventDefault: vi.fn() },
    preventDefault: vi.fn(),
    ...overrides,
  }
}

/**
 * Creates a test GeoJSON Feature of the given type.
 */
export function createMockFeature(
  type: 'Point' | 'LineString' | 'Polygon',
  coordinates: GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][],
  id?: string,
): GeoJSON.Feature {
  const _id = id ?? `test-${Math.random().toString(36).slice(2, 8)}`

  switch (type) {
    case 'Point':
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coordinates as GeoJSON.Position },
        properties: { _id },
      }
    case 'LineString':
      return {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coordinates as GeoJSON.Position[] },
        properties: { _id },
      }
    case 'Polygon':
      return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: coordinates as GeoJSON.Position[][] },
        properties: { _id },
      }
  }
}

/**
 * Wraps features in a FeatureCollection.
 */
export function createMockFeatureCollection(
  features: GeoJSON.Feature[] = [],
): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features }
}
