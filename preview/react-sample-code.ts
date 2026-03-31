export const reactSampleCode = `import {
  useDrawingEngine,
  useGeoloniaMap,
  DrawControlPanel,
} from '@geolonia/drawing-engine'
import '@geolonia/drawing-engine/style.css'

function App() {
  const { containerRef, map } = useGeoloniaMap({
    center: [139.767, 35.681],
    zoom: 14,
  })

  const engine = useDrawingEngine(map)

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div
        ref={containerRef}
        data-navigation-control="on"
        style={{ width: '100%', height: '100%' }}
      />
      {map && <DrawControlPanel {...engine.controlPanelProps} />}
    </div>
  )
}
`
