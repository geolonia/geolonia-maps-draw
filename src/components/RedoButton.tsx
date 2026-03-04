export interface RedoButtonProps {
  disabled: boolean
  onClick: () => void
  className?: string
  title?: string
}

export function RedoButton({
  disabled,
  onClick,
  className,
  title = 'やり直す (Ctrl+Shift+Z)',
}: RedoButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`drawing-engine-button draw-control-panel__action-button${disabled ? ' draw-control-panel__action-button--disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 14 20 9 15 4" />
        <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
      </svg>
    </button>
  )
}
