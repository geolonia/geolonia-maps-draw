import { describe, it, expect, vi } from 'vitest'
import { assertGeolonia, GeoloniaNotFoundError } from '../assert-geolonia'

describe('assertGeolonia', () => {
  it('does not throw when window.geolonia.Map exists', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.geolonia = { Map: vi.fn() } as any
    expect(() => assertGeolonia()).not.toThrow()
  })

  it('throws GeoloniaNotFoundError when window.geolonia is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).geolonia
    expect(() => assertGeolonia()).toThrow(GeoloniaNotFoundError)
  })

  it('throws GeoloniaNotFoundError when window.geolonia.Map is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).geolonia = {}
    expect(() => assertGeolonia()).toThrow(GeoloniaNotFoundError)
  })

  it('error message includes script tag instruction', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).geolonia
    expect(() => assertGeolonia()).toThrow('Geolonia Maps Embed API')
  })

  it('error name is GeoloniaNotFoundError', () => {
    const err = new GeoloniaNotFoundError()
    expect(err.name).toBe('GeoloniaNotFoundError')
    expect(err).toBeInstanceOf(Error)
  })
})
