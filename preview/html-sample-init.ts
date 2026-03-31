import { highlightCode } from './highlight'

const sampleCode = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drawing Engine Sample</title>
  <style>
    body { margin: 0; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <!--
    data-draw="on" を指定するだけで描画機能が有効になります。
  -->
  <div
    id="map"
    class="geolonia"
    data-draw="on"
    data-navigation-control="on"
    data-style="geolonia/basic-v1"
    data-lat="35.681"
    data-lng="139.767"
    data-zoom="14"
    style="width: 100%; height: 100vh;"
  ></div>

  <!-- Geolonia Embed API -->
  <script src="https://cdn.geolonia.com/v1/embed?geolonia-api-key=YOUR-API-KEY"><\/script>
  <!-- Drawing Engine Plugin -->
  <link rel="stylesheet" href="https://cdn.geolonia.com/v1/draw-plugin/style.css">
  <script src="https://cdn.geolonia.com/v1/draw-plugin/plugin.iife.js"><\/script>
</body>
</html>`

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(text))
  return div.innerHTML
}

function initCodePanel() {
  const sourceCodeEl = document.getElementById('source-code')
  const dialog = document.getElementById('source-dialog') as HTMLDialogElement
  const viewSourceBtn = document.getElementById('view-source-btn')
  const closeBtn = document.getElementById('dialog-close')
  const copyBtn = document.getElementById('copy-btn')

  if (!sourceCodeEl || !dialog || !viewSourceBtn || !closeBtn || !copyBtn) return

  // Show plain text immediately, then highlight with Shiki
  sourceCodeEl.innerHTML = escapeHtml(sampleCode)
  highlightCode(sampleCode, 'html').then((html) => {
    const shikiContainer = document.createElement('div')
    shikiContainer.innerHTML = html
    const shikiPre = shikiContainer.querySelector('pre')
    if (shikiPre) {
      shikiPre.style.padding = '1rem'
      shikiPre.style.borderRadius = '8px'
      shikiPre.style.fontSize = '0.8125rem'
      shikiPre.style.lineHeight = '1.6'
      shikiPre.style.margin = '0'
      sourceCodeEl.replaceWith(shikiPre)
    }
  })

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
