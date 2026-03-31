import { highlightCode } from './highlight'

const sampleCode = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drawing Engine - Vanilla JS</title>
  <style>
    body { margin: 0; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map" class="geolonia" data-style="geolonia/basic-v1"></div>

  <script src="https://cdn.geolonia.com/v1/embed?geolonia-api-key=YOUR-API-KEY"><\/script>
  <script type="module">
    import { DrawingEngine } from '@geolonia/drawing-engine/vanilla'
    import '@geolonia/drawing-engine/style.css'

    const map = new window.geolonia.Map({
      container: document.getElementById('map'),
      boxZoom: false,
    })
    map.on('load', () => {
      const engine = new DrawingEngine(map, { showControls: true })
      engine.addEventListener('change', () => {
        console.log('Features:', JSON.stringify(engine.features, null, 2))
      })
    })
  <\/script>
</body>
</html>`

function initCodePanel() {
  const dialog = document.getElementById('source-dialog') as HTMLDialogElement
  const viewSourceBtn = document.getElementById('view-source-btn')
  const closeBtn = document.getElementById('dialog-close')
  const copyBtn = document.getElementById('copy-btn')
  const codeWrapper = document.getElementById('code-wrapper')

  if (!dialog || !viewSourceBtn || !closeBtn || !copyBtn || !codeWrapper) return

  // Show fallback first
  const fallbackPre = document.createElement('pre')
  fallbackPre.style.cssText =
    'background:#24292e;color:#e2e8f0;padding:1rem;border-radius:8px;' +
    'font-size:0.8125rem;line-height:1.6;overflow-x:auto;white-space:pre;margin:0;' +
    'font-family:"SF Mono","Fira Code","Fira Mono",Menlo,Consolas,monospace;'
  fallbackPre.textContent = sampleCode
  codeWrapper.appendChild(fallbackPre)

  // Highlight with Shiki (progressive enhancement — fallback stays if it fails)
  highlightCode(sampleCode, 'html').then((html) => {
    const container = document.createElement('div')
    container.innerHTML = html
    const shikiPre = container.querySelector('pre')
    if (shikiPre) {
      shikiPre.style.padding = '1rem'
      shikiPre.style.borderRadius = '8px'
      shikiPre.style.fontSize = '0.8125rem'
      shikiPre.style.lineHeight = '1.6'
      shikiPre.style.margin = '0'
      fallbackPre.replaceWith(shikiPre)
    }
  }).catch(() => { /* keep fallback visible */ })

  viewSourceBtn.addEventListener('click', () => {
    dialog.showModal()
  })

  closeBtn.addEventListener('click', () => {
    dialog.close()
  })

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close()
    }
  })

  copyBtn.addEventListener('click', () => {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      const original = copyBtn.textContent
      copyBtn.textContent = 'コピー失敗'
      setTimeout(() => { copyBtn.textContent = original }, 2000)
      return
    }
    navigator.clipboard.writeText(sampleCode).then(() => {
      const original = copyBtn.textContent
      copyBtn.textContent = 'コピーしました!'
      setTimeout(() => { copyBtn.textContent = original }, 2000)
    }).catch(() => {
      const original = copyBtn.textContent
      copyBtn.textContent = 'コピー失敗'
      setTimeout(() => { copyBtn.textContent = original }, 2000)
    })
  })
}

initCodePanel()
