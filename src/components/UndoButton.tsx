export interface UndoButtonProps {
  disabled: boolean
  onClick: () => void
  className?: string
  title?: string
}

export function UndoButton({
  disabled,
  onClick,
  className,
  title = '元に戻す (Ctrl+Z)',
}: UndoButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`drawing-engine-button draw-control-panel__action-button${disabled ? ' draw-control-panel__action-button--disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <polyline points="9 14 4 9 9 4" />
        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
      </svg>
    </button>
  )
}
