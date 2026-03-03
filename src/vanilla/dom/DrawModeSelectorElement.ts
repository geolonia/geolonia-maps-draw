import type { DrawMode } from '../../types'
import { DRAW_MODE_ICONS } from './icons'

const DRAW_MODE_LABELS: Record<DrawMode, string> = {
  point: 'ポイント',
  line: 'ライン',
  polygon: 'ポリゴン',
  symbol: 'シンボル',
}

const DRAW_MODE_TOOLTIPS: Record<DrawMode, string> = {
  point: 'クリックした地点をポイントとして GeoJSON に追加します。',
  line: 'クリックした地点を順に線として登録し、「完了」で確定します。',
  polygon: 'クリックした地点をポリゴンとして登録し、「完了」で閉じます。',
  symbol: 'クリックした地点にシンボル（強調表示されたポイント）を置きます。',
}

const DRAW_MODES: DrawMode[] = ['point', 'line', 'polygon', 'symbol']

export class DrawModeSelectorElement {
  readonly element: HTMLDivElement
  private buttons: Map<DrawMode, HTMLButtonElement> = new Map()
  private selectedMode: DrawMode | null = null
  private onChange: (mode: DrawMode | null) => void

  constructor(onChange: (mode: DrawMode | null) => void) {
    this.onChange = onChange
    this.element = document.createElement('div')
    this.element.className = 'draw-mode-selector'

    for (const mode of DRAW_MODES) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.dataset.mode = mode
      btn.setAttribute('aria-label', DRAW_MODE_LABELS[mode])
      btn.title = DRAW_MODE_TOOLTIPS[mode]
      btn.className = 'draw-mode-selector__button'
      btn.appendChild(DRAW_MODE_ICONS[mode]())
      btn.addEventListener('click', () => {
        this.onChange(mode === this.selectedMode ? null : mode)
      })
      this.buttons.set(mode, btn)
      this.element.appendChild(btn)
    }
  }

  update(selectedMode: DrawMode | null): void {
    this.selectedMode = selectedMode
    for (const [mode, btn] of this.buttons) {
      btn.className = mode === selectedMode
        ? 'draw-mode-selector__button draw-mode-selector__button--selected'
        : 'draw-mode-selector__button'
    }
  }
}
