import type maplibregl from 'maplibre-gl'

declare global {
  interface Window {
    geolonia?: {
      Map: new (options: maplibregl.MapOptions) => maplibregl.Map
      registerPlugin?: (
        callback: (
          map: maplibregl.Map,
          target: HTMLElement,
          atts: Record<string, string>,
        ) => void,
      ) => void
    }
  }
}
