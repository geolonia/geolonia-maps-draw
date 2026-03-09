export class GeoloniaNotFoundError extends Error {
  constructor() {
    super(
      '@geolonia/drawing-engine requires the Geolonia Maps Embed API. ' +
      'Please load the script: <script src="https://cdn.geolonia.com/v1/embed?geolonia-api-key=YOUR-API-KEY"></script>',
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
 * Asserts that `window.geolonia.Map` exists at runtime.
 * Throws `GeoloniaNotFoundError` if the Geolonia Embed API is not loaded.
 */
export function assertGeolonia(): void {
  if (typeof window === 'undefined' || !window.geolonia?.Map) {
    throw new GeoloniaNotFoundError()
  }
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
