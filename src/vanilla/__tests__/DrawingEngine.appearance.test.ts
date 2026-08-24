import { describe, it, expect, vi, afterEach } from 'vitest'
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

function panelOf(map: ReturnType<typeof createMockMap>): HTMLElement | null {
  return map.getContainer().querySelector('.draw-control-panel')
}

describe('DrawingEngine の外観', () => {
  const engines: DrawingEngine[] = []

  function create(options?: Parameters<typeof DrawingEngine.prototype.constructor>[1]) {
    const map = createMockMap()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine = new DrawingEngine(map as any, { showControls: true, ...(options as object) })
    engines.push(engine)
    return { map, engine }
  }

  afterEach(() => {
    while (engines.length) engines.pop()?.destroy()
    document.body.innerHTML = ''
  })

  it('指定しない場合は light になる', () => {
    const { map, engine } = create()
    expect(engine.appearance).toBe('light')
    expect(panelOf(map)?.getAttribute('data-de-appearance')).toBe('light')
  })

  it.each(['light', 'dark', 'glass', 'auto'] as const)('%s を指定するとパネルに反映される', (appearance) => {
    const { map, engine } = create({ appearance })
    expect(engine.appearance).toBe(appearance)
    expect(panelOf(map)?.getAttribute('data-de-appearance')).toBe(appearance)
  })

  it('未知の値は light に落とす', () => {
    // @ts-expect-error 実行時に不正な値が渡された場合の挙動を検証する
    const { map, engine } = create({ appearance: 'neon' })
    expect(engine.appearance).toBe('light')
    expect(panelOf(map)?.getAttribute('data-de-appearance')).toBe('light')
  })

  it('setAppearance で後から切り替えられる', () => {
    const { map, engine } = create({ appearance: 'light' })
    engine.setAppearance('dark')
    expect(engine.appearance).toBe('dark')
    expect(panelOf(map)?.getAttribute('data-de-appearance')).toBe('dark')
  })

  it('コントロール非表示でも setAppearance が例外を投げない', () => {
    const map = createMockMap()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine = new DrawingEngine(map as any, { showControls: false })
    engines.push(engine)
    expect(() => engine.setAppearance('dark')).not.toThrow()
    expect(engine.appearance).toBe('dark')
  })

  it('2つの地図にそれぞれ別の外観を指定でき、互いに影響しない', () => {
    const a = create({ appearance: 'dark' })
    const b = create({ appearance: 'glass' })
    expect(panelOf(a.map)?.getAttribute('data-de-appearance')).toBe('dark')
    expect(panelOf(b.map)?.getAttribute('data-de-appearance')).toBe('glass')

    a.engine.setAppearance('light')
    expect(panelOf(a.map)?.getAttribute('data-de-appearance')).toBe('light')
    expect(panelOf(b.map)?.getAttribute('data-de-appearance')).toBe('glass')
  })
})
