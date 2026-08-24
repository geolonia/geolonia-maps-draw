import { useState } from 'react'
import {
  useDrawingEngine,
  useGeoloniaMap,
  DrawControlPanel,
  VertexContextMenu,
  APPEARANCES,
} from '@geolonia/drawing-engine'
import type { Appearance } from '@geolonia/drawing-engine'
import '@geolonia/drawing-engine/style.css'

export function App() {
  const [appearance, setAppearance] = useState<Appearance>('light')
  const { containerRef, map } = useGeoloniaMap({
    center: [139.767, 35.681],
    zoom: 14,
  })

  const engine = useDrawingEngine(map, { appearance })

  return (
    <div className="app">
      <div className="app__appearance-switcher">
        <span className="app__appearance-label">外観</span>
        {APPEARANCES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setAppearance(value)}
            aria-pressed={appearance === value}
            className={`app__appearance-button${appearance === value ? ' app__appearance-button--active' : ''}`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="app__map-container">
        <div
          ref={containerRef}
          data-navigation-control="on"
          className="app__map"
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
    </div>
  )
}
