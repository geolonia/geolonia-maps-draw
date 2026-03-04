import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  assertGeolonia,
  GeoloniaNotFoundError,
  GeoloniaEmbedNotDetectedError,
  hasEmbedScript,
} from '../assert-geolonia'

function addEmbedScript(src = 'https://cdn.geolonia.com/v1/embed?geolonia-api-key=YOUR-API-KEY') {
  const script = document.createElement('script')
  script.src = src
  script.setAttribute('data-testid', 'embed-test')
  document.head.appendChild(script)
  return script
}

function removeAllEmbedScripts() {
  document.querySelectorAll('script[data-testid="embed-test"]').forEach((s) => s.remove())
  document.querySelectorAll('script[data-testid="geolonia-embed"]').forEach((s) => s.remove())
}

describe('GeoloniaEmbedNotDetectedError', () => {
  it('has correct name and message', () => {
    const err = new GeoloniaEmbedNotDetectedError()
    expect(err.name).toBe('GeoloniaEmbedNotDetectedError')
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toContain('スクリプトタグが見つかりません')
    expect(err.message).toContain('cdn.geolonia.com/v1/embed')
  })
})

describe('GeoloniaNotFoundError', () => {
  it('has correct name and message', () => {
    const err = new GeoloniaNotFoundError()
    expect(err.name).toBe('GeoloniaNotFoundError')
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toContain('Map コンストラクタが見つかりません')
  })
})

describe('hasEmbedScript', () => {
  afterEach(() => {
    removeAllEmbedScripts()
  })

  it('returns true when Embed script tag with CDN URL exists', () => {
    addEmbedScript()
    expect(hasEmbedScript()).toBe(true)
  })

  it('returns true with different query params', () => {
    addEmbedScript('https://cdn.geolonia.com/v1/embed?geolonia-api-key=DIFFERENT-KEY&lang=ja')
    expect(hasEmbedScript()).toBe(true)
  })

  it('returns false when no Embed script tag exists', () => {
    removeAllEmbedScripts()
    expect(hasEmbedScript()).toBe(false)
  })

  it('returns false when script tags exist but none match CDN pattern', () => {
    removeAllEmbedScripts()
    const script = document.createElement('script')
    script.src = 'https://example.com/some-other-script.js'
    script.setAttribute('data-testid', 'embed-test')
    document.head.appendChild(script)
    expect(hasEmbedScript()).toBe(false)
  })
})

describe('assertGeolonia', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    removeAllEmbedScripts()
  })

  it('does not throw when Embed script tag present and Map exists', () => {
    addEmbedScript()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = { Map: vi.fn() }
    expect(() => assertGeolonia()).not.toThrow()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('throws GeoloniaEmbedNotDetectedError when Embed script tag is missing and Map is missing', () => {
    removeAllEmbedScripts()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).geolonia
    expect(() => assertGeolonia()).toThrow(GeoloniaEmbedNotDetectedError)
  })

  it('throws GeoloniaNotFoundError when Embed script tag present but Map is not ready', () => {
    addEmbedScript()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = {}
    expect(() => assertGeolonia()).toThrow(GeoloniaNotFoundError)
  })

  it('throws GeoloniaNotFoundError when Embed script tag present and geolonia is undefined', () => {
    addEmbedScript()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).geolonia
    expect(() => assertGeolonia()).toThrow(GeoloniaNotFoundError)
  })

  it('warns but does not throw when Map exists without Embed script tag (dev scenario)', () => {
    removeAllEmbedScripts()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = { Map: vi.fn() }
    expect(() => assertGeolonia()).not.toThrow()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Embed API のスクリプトタグが検出されませんでした'),
    )
  })

  it('works with different CDN URL patterns (with query params)', () => {
    addEmbedScript('https://cdn.geolonia.com/v1/embed?geolonia-api-key=TEST&lang=en')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = { Map: vi.fn() }
    expect(() => assertGeolonia()).not.toThrow()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('throws GeoloniaEmbedNotDetectedError when geolonia.Map is undefined and no embed script', () => {
    removeAllEmbedScripts()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).geolonia = {}
    expect(() => assertGeolonia()).toThrow(GeoloniaEmbedNotDetectedError)
  })
})
