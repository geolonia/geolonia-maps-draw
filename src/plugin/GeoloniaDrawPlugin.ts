import type maplibregl from 'maplibre-gl'
import '../core/geolonia-types'
import { assertGeoloniaEmbed } from '../lib/assert-geolonia'
import { DrawingEngine } from '../vanilla/DrawingEngine'

/**
 * Parse `data-*` attributes from the Embed target element into DrawingEngine options.
 */
function parseDataAttributes(atts: Record<string, string>) {
  return {
    showControls: atts.draw === 'on',
  }
}

/**
 * Registers the drawing plugin with Geolonia Embed.
 * Activates on elements with `data-draw="on"`.
 */
export function registerDrawPlugin(): void {
  assertGeoloniaEmbed()

  window.geolonia!.registerPlugin!((map: maplibregl.Map, target: HTMLElement, atts: Record<string, string>) => {
    if (atts.draw !== 'on') return

    const options = parseDataAttributes(atts)
    const engine = new DrawingEngine(map, options)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(target as any).__drawingEngine = engine
    map.on('remove', () => engine.destroy())
  })
}
