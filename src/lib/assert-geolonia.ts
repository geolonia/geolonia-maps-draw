export class GeoloniaEmbedNotDetectedError extends Error {
  constructor() {
    super(
      'Geolonia Embed API のスクリプトタグが見つかりません。\n' +
      '以下のスクリプトタグをHTMLに追加してください:\n' +
      '<script src="https://cdn.geolonia.com/v1/embed?geolonia-api-key=YOUR-API-KEY"></script>',
    )
    this.name = 'GeoloniaEmbedNotDetectedError'
  }
}

export class GeoloniaNotFoundError extends Error {
  constructor() {
    super(
      'Geolonia Maps の Map コンストラクタが見つかりません。\n' +
      'Embed API スクリプトの読み込みが完了していない可能性があります。\n' +
      'スクリプトの読み込み完了後に実行してください。',
    )
    this.name = 'GeoloniaNotFoundError'
  }
}

export class GeoloniaEmbedRequiredError extends Error {
  constructor() {
    super(
      '@geolonia/drawing-engine plugin requires the Geolonia Embed API with registerPlugin support. ' +
      'Please load the script: <script src="https://cdn.geolonia.com/v1/embed?geolonia-api-key=YOUR-API-KEY"></script>',
    )
    this.name = 'GeoloniaEmbedRequiredError'
  }
}

/**
 * Checks whether an Embed script tag with `cdn.geolonia.com/v1/embed` exists in the document.
 */
export function hasEmbedScript(): boolean {
  const scripts = document.querySelectorAll('script[src]')
  for (const script of scripts) {
    const src = script.getAttribute('src')
    if (!src) continue
    try {
      const url = new URL(src, document.baseURI)
      if (url.hostname === 'cdn.geolonia.com' && url.pathname === '/v1/embed') {
        return true
      }
    } catch {
      // ignore invalid URL
    }
  }
  return false
}

/**
 * Asserts that the Geolonia Embed API is properly loaded.
 *
 * 1. Verifies that a `<script>` tag referencing the Embed CDN exists.
 * 2. Verifies that `window.geolonia.Map` is available.
 *
 * If the Map constructor exists but no Embed script tag is found, a warning is
 * logged instead of throwing — this supports development scenarios where the
 * Map constructor is provided without the standard Embed script tag.
 *
 * @throws {GeoloniaEmbedNotDetectedError} if no Embed script tag is found and Map is unavailable.
 * @throws {GeoloniaNotFoundError} if the Embed script tag exists but Map is not ready.
 */
export function assertGeolonia(): void {
  if (typeof window === 'undefined') {
    throw new GeoloniaNotFoundError()
  }

  const embedDetected = hasEmbedScript()
  const mapExists = typeof window.geolonia?.Map === 'function'

  if (mapExists) {
    if (!embedDetected) {
      console.warn(
        '[@geolonia/drawing-engine] window.geolonia.Map は利用可能ですが、' +
        'Embed API のスクリプトタグが検出されませんでした。' +
        '本番環境では Geolonia Embed API 経由でご利用ください。',
      )
    }
    return
  }

  // Map does not exist
  if (embedDetected) {
    throw new GeoloniaNotFoundError()
  }
  throw new GeoloniaEmbedNotDetectedError()
}

/**
 * Asserts that the Geolonia Embed API with `registerPlugin` is available.
 * Used by the plugin entry point which requires full Embed API support.
 */
export function assertGeoloniaEmbed(): void {
  assertGeolonia()
  if (typeof window.geolonia?.registerPlugin !== 'function') {
    throw new GeoloniaEmbedRequiredError()
  }
}
