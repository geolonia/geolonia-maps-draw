import type { DrawMode } from '../types'
import { DRAW_MODE_ICONS } from './DrawModeIcons'
import './DrawModeSelector.css'

const DRAW_MODE_LABELS: Record<DrawMode, string> = {
  point: 'ポイント',
  line: 'ライン',
  polygon: 'ポリゴン',
  symbol: 'シンボル'
}

export const DRAW_MODE_TOOLTIPS: Record<DrawMode, string> = {
  point: 'クリックした地点をポイントとして GeoJSON に追加します。',
  line: 'クリックした地点を順に線として登録し、「完了」で確定します。',
  polygon: 'クリックした地点をポリゴンとして登録し、「完了」で閉じます。',
  symbol: 'クリックした地点にシンボル（強調表示されたポイント）を置きます。'
}

const DRAW_MODES: DrawMode[] = ['point', 'line', 'polygon', 'symbol']

type DrawModeSelectorProps = {
  selectedMode: DrawMode | null
  onChange: (mode: DrawMode | null) => void
}

export function DrawModeSelector({ selectedMode, onChange }: DrawModeSelectorProps) {
  return (
    <div className='draw-mode-selector'>
      {DRAW_MODES.map((mode) => {
        const isSelected = mode === selectedMode
        const Icon = DRAW_MODE_ICONS[mode]
        const label = DRAW_MODE_LABELS[mode]
        return (
          <button
            key={mode}
            type='button'
            data-mode={mode}
            aria-label={label}
            title={DRAW_MODE_TOOLTIPS[mode]}
            onClick={() => onChange(isSelected ? null : mode)}
            className={`draw-mode-selector__button${isSelected ? ' draw-mode-selector__button--selected' : ''}`}
          >
            <Icon />
          </button>
        )
      })}
    </div>
  )
}
