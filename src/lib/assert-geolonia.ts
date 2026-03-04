const EMBED_CDN_PATTERN = 'cdn.geolonia.com/v1/embed'

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

/**
 * Checks whether an Embed script tag with `cdn.geolonia.com/v1/embed` exists in the document.
 */
export function hasEmbedScript(): boolean {
  const scripts = document.querySelectorAll('script[src]')
  for (const script of scripts) {
    if (script.getAttribute('src')?.includes(EMBED_CDN_PATTERN)) {
      return true
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
  const embedDetected = hasEmbedScript()
  const mapExists = !!window.geolonia?.Map

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
