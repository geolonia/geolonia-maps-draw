import type maplibregl from 'maplibre-gl'
import '../core/geolonia-types'
import { assertGeoloniaEmbed } from '../lib/assert-geolonia'
import { DrawingEngine } from '../vanilla/DrawingEngine'
import { resolveAppearance } from '../lib/appearance'

/**
 * Parse `data-*` attributes from the Embed target element into DrawingEngine options.
 */
export function parseDataAttributes(atts: Record<string, string>) {
  return {
    showControls: atts.draw === 'on',
    // data-draw-appearance。Embed が渡すキー名の揺れ（dataset 形式 / ハイフン形式）
    // の両方を受ける。未知の値は既定値に落とす。
    appearance: resolveAppearance(atts.drawAppearance ?? atts['draw-appearance']),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((target as any).__drawingEngine) return

    const options = parseDataAttributes(atts)
    const engine = new DrawingEngine(map, options)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(target as any).__drawingEngine = engine
    map.on('remove', () => {
      engine.destroy()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(target as any).__drawingEngine = null
    })
  })
}
