export class GeoloniaNotFoundError extends Error {
  constructor() {
    super(
      '@geolonia/drawing-engine requires the Geolonia Maps Embed API. ' +
      'Please load the script: <script src="https://cdn.geolonia.com/v1/embed?geolonia-api-key=YOUR-API-KEY"></script>',
    )
    this.name = 'GeoloniaNotFoundError'
  }
}

/**
 * Asserts that `window.geolonia.Map` exists at runtime.
 * Throws `GeoloniaNotFoundError` if the Geolonia Embed API is not loaded.
 */
export function assertGeolonia(): void {
  if (!window.geolonia?.Map) {
    throw new GeoloniaNotFoundError()
  }
}
