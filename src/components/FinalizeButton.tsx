export interface FinalizeButtonProps {
  disabled: boolean
  onClick: () => void
  className?: string
  title?: string
}

export function FinalizeButton({
  disabled,
  onClick,
  className,
  title = '描画を確定',
}: FinalizeButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`drawing-engine-button draw-control-panel__action-button draw-control-panel__action-button--confirm${disabled ? ' draw-control-panel__action-button--disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </button>
  )
}
