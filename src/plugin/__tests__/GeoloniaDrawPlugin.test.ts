import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerDrawPlugin } from '../GeoloniaDrawPlugin'
import { GeoloniaEmbedRequiredError } from '../../lib/assert-geolonia'

type Handler = (...args: unknown[]) => void

function createMockMap() {
  const handlers: Record<string, Handler[]> = {}
  const sources: Record<string, { setData: ReturnType<typeof vi.fn> }> = {}
  const layers: Set<string> = new Set()
  const canvas = document.createElement('canvas')
  const container = document.createElement('div')

  return {
    on(event: string, handler: Handler) {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    },
    off(event: string, handler: Handler) {
      handlers[event] = (handlers[event] || []).filter((h) => h !== handler)
    },
    fire(event: string, data?: unknown) {
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
  }
}

describe('registerDrawPlugin', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let registeredCallback: ((...args: any[]) => void) | null

  beforeEach(() => {
    registeredCallback = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = {
      Map: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registerPlugin: vi.fn((cb: (...args: any[]) => void) => {
        registeredCallback = cb
      }),
    }
  })

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).geolonia
  })

  it('throws GeoloniaEmbedRequiredError when registerPlugin is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = { Map: vi.fn() }
    expect(() => registerDrawPlugin()).toThrow(GeoloniaEmbedRequiredError)
  })

  it('calls registerPlugin', () => {
    registerDrawPlugin()
    expect(window.geolonia!.registerPlugin).toHaveBeenCalledTimes(1)
    expect(registeredCallback).toBeTypeOf('function')
  })

  it('creates DrawingEngine when data-draw="on"', () => {
    registerDrawPlugin()
    const mockMap = createMockMap()
    const target = document.createElement('div')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registeredCallback!(mockMap as any, target, { draw: 'on' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((target as any).__drawingEngine).toBeDefined()
  })

  it('does not create DrawingEngine when data-draw is not "on"', () => {
    registerDrawPlugin()
    const mockMap = createMockMap()
    const target = document.createElement('div')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registeredCallback!(mockMap as any, target, { draw: 'off' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((target as any).__drawingEngine).toBeUndefined()
  })

  it('destroys engine on map remove', () => {
    registerDrawPlugin()
    const mockMap = createMockMap()
    const target = document.createElement('div')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registeredCallback!(mockMap as any, target, { draw: 'on' })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine = (target as any).__drawingEngine
    const destroySpy = vi.spyOn(engine, 'destroy')

    mockMap.fire('remove')
    expect(destroySpy).toHaveBeenCalledTimes(1)
  })

  it('does nothing when atts is empty', () => {
    registerDrawPlugin()
    const mockMap = createMockMap()
    const target = document.createElement('div')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registeredCallback!(mockMap as any, target, {})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((target as any).__drawingEngine).toBeUndefined()
  })
})
