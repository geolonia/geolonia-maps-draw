import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeoloniaMap } from '../useGeoloniaMap'
import { GeoloniaNotFoundError } from '../../lib/assert-geolonia'

type LoadHandler = () => void

function createMockMapInstance() {
  let loadHandler: LoadHandler | null = null
  const instance = {
    on: vi.fn((event: string, handler: LoadHandler) => {
      if (event === 'load') loadHandler = handler
    }),
    off: vi.fn(),
    remove: vi.fn(),
    _triggerLoad: () => {
      if (loadHandler) loadHandler()
    },
  }
  return instance
}

describe('useGeoloniaMap', () => {
  let mockInstance: ReturnType<typeof createMockMapInstance>
  let MapConstructor: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockInstance = createMockMapInstance()
    MapConstructor = vi.fn(() => mockInstance)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.geolonia = { Map: MapConstructor } as any
  })

  it('throws GeoloniaNotFoundError when window.geolonia is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).geolonia
    expect(() => {
      renderHook(() => useGeoloniaMap())
    }).toThrow(GeoloniaNotFoundError)
  })

  it('returns containerRef and null map initially', () => {
    const { result } = renderHook(() => useGeoloniaMap())
    expect(result.current.containerRef).toBeDefined()
    expect(result.current.map).toBeNull()
  })

  it('does not create map when containerRef.current is null', () => {
    renderHook(() => useGeoloniaMap())
    expect(MapConstructor).not.toHaveBeenCalled()
  })

  it('creates map with default settings when container ref is attached', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)

    const { result } = renderHook(() => {
      const hook = useGeoloniaMap()
      // Attach the ref before the effect runs
      ;(hook.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = div
      return hook
    })

    // Re-render to trigger effect with container
    // Actually the first render should work since we set the ref before useEffect runs
    // But renderHook runs the effect after render, by which point the ref is set

    expect(MapConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        container: div,
        style: 'geolonia/basic-v1',
        center: [139.7671, 35.6812],
        zoom: 14,
        boxZoom: false,
      }),
    )

    // Trigger load
    act(() => {
      mockInstance._triggerLoad()
    })

    expect(result.current.map).not.toBeNull()

    document.body.removeChild(div)
  })

  it('creates map with custom settings', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)

    renderHook(() => {
      const hook = useGeoloniaMap({
        center: [135.5, 34.7],
        zoom: 10,
        style: 'geolonia/dark',
        container: 'custom-container',
      })
      ;(hook.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = div
      return hook
    })

    expect(MapConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        container: 'custom-container',
        style: 'geolonia/dark',
        center: [135.5, 34.7],
        zoom: 10,
        boxZoom: false,
      }),
    )

    document.body.removeChild(div)
  })

  it('cleans up map instance on unmount', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)

    const { result, unmount } = renderHook(() => {
      const hook = useGeoloniaMap()
      ;(hook.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = div
      return hook
    })

    act(() => {
      mockInstance._triggerLoad()
    })

    expect(result.current.map).not.toBeNull()

    unmount()

    expect(mockInstance.remove).toHaveBeenCalledTimes(1)

    document.body.removeChild(div)
  })
})
