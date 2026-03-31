import {
  useDrawingEngine,
  useGeoloniaMap,
  DrawControlPanel,
  VertexContextMenu,
} from '@geolonia/drawing-engine'
import '@geolonia/drawing-engine/style.css'
import { CodePanel } from './CodePanel'
import { reactSampleCode } from './react-sample-code'

export function App() {
  const { containerRef, map } = useGeoloniaMap({
    center: [139.767, 35.681],
    zoom: 14,
  })

  const engine = useDrawingEngine(map)

  return (
    <div className="app">
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
      <a className="app__back-link" href="./">&larr; Demos</a>
      <CodePanel
        code={reactSampleCode}
        lang="tsx"
        title="React サンプルコード"
        description="以下のコードをコピーして、React プロジェクトに貼り付けてください。@geolonia/drawing-engine パッケージのインストールが必要です。"
      />
    </div>
  )
}
