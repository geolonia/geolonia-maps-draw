import { useEffect, useRef, useState } from 'react'
import type maplibregl from 'maplibre-gl'
import { assertGeolonia } from '../lib/assert-geolonia'
import '../core/geolonia-types'

export type GeoloniaMapSettings = {
  container?: string
  center?: [number, number]
  zoom?: number
  style?: string
}

const DEFAULT_CENTER: [number, number] = [139.7671, 35.6812]
const DEFAULT_ZOOM = 14
const DEFAULT_STYLE = 'geolonia/basic-v1'

export function useGeoloniaMap(settings?: GeoloniaMapSettings) {
  assertGeolonia()

  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<maplibregl.Map | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const instance = new window.geolonia!.Map({
      container: settings?.container ?? el,
      style: settings?.style ?? DEFAULT_STYLE,
      center: settings?.center ?? DEFAULT_CENTER,
      zoom: settings?.zoom ?? DEFAULT_ZOOM,
      boxZoom: false,
    })

    instance.on('load', () => {
      setMap(instance)
    })

    return () => {
      instance.remove()
      setMap(null)
    }
  }, [])

  return { containerRef, map }
}
