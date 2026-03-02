import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import {
  useDrawingEngine,
  DrawControlPanel,
  VertexContextMenu,
} from '@geolonia/drawing-engine'
import '@geolonia/drawing-engine/style.css'

export function App() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    const container = mapContainerRef.current

    // Geolonia Embed が地図を初期化するのを待つ
    const observer = new MutationObserver(() => {
      const mapElement = container.querySelector('.maplibregl-map') as HTMLElement | null
      if (mapElement) {
        observer.disconnect()
        // Geolonia Embed は window 上の geolonia オブジェクト経由で Map インスタンスを公開
        // load イベントで取得する
        const checkMap = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const geoloniaMap = (mapElement as any).__map as maplibregl.Map | undefined
          if (geoloniaMap) {
            setMap(geoloniaMap)
          } else {
            setTimeout(checkMap, 100)
          }
        }
        checkMap()
      }
    })

    observer.observe(container, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  const engine = useDrawingEngine(map)

  const geojsonText = JSON.stringify(engine.features, null, 2)

  return (
    <div className="app">
      <div className="app__map-container">
        <div
          ref={mapContainerRef}
          className="app__map"
          data-lat="35.681"
          data-lng="139.767"
          data-zoom="14"
          data-navigation-control="on"
        />
        {map && (
          <>
            <DrawControlPanel {...engine.controlPanelProps} />
            {engine.vertexContextMenuEvent && (
              <VertexContextMenu
                position={{ x: engine.vertexContextMenuEvent.x, y: engine.vertexContextMenuEvent.y }}
                canDelete={true}
                onDelete={engine.deleteSelectedVertex}
                onClose={engine.closeVertexContextMenu}
              />
            )}
            {engine.rubberBand && (
              <div
                className="app__rubber-band"
                style={{
                  left: engine.rubberBand.x,
                  top: engine.rubberBand.y,
                  width: engine.rubberBand.width,
                  height: engine.rubberBand.height,
                }}
              />
            )}
          </>
        )}
      </div>
      <div className="app__sidebar">
        <h2 className="app__sidebar-title">GeoJSON Output</h2>
        <pre className="app__geojson-output">{geojsonText}</pre>
      </div>
    </div>
  )
}
