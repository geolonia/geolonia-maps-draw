import { describe, it, expect, vi } from 'vitest'
import { assertGeolonia, GeoloniaNotFoundError, assertGeoloniaEmbed, GeoloniaEmbedRequiredError } from '../assert-geolonia'

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

describe('assertGeoloniaEmbed', () => {
  it('does not throw when registerPlugin exists', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = { Map: vi.fn(), registerPlugin: vi.fn() }
    expect(() => assertGeoloniaEmbed()).not.toThrow()
  })

  it('throws GeoloniaNotFoundError when window.geolonia is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).geolonia
    expect(() => assertGeoloniaEmbed()).toThrow(GeoloniaNotFoundError)
  })

  it('throws GeoloniaEmbedRequiredError when registerPlugin is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = { Map: vi.fn() }
    expect(() => assertGeoloniaEmbed()).toThrow(GeoloniaEmbedRequiredError)
  })

  it('throws GeoloniaEmbedRequiredError when registerPlugin is not a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = { Map: vi.fn(), registerPlugin: 'not-a-function' }
    expect(() => assertGeoloniaEmbed()).toThrow(GeoloniaEmbedRequiredError)
  })

  it('error message includes Embed API instruction', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = { Map: vi.fn() }
    expect(() => assertGeoloniaEmbed()).toThrow('registerPlugin')
  })

  it('error name is GeoloniaEmbedRequiredError', () => {
    const err = new GeoloniaEmbedRequiredError()
    expect(err.name).toBe('GeoloniaEmbedRequiredError')
    expect(err).toBeInstanceOf(Error)
  })
})
