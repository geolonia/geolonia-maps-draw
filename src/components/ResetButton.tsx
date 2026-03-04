export interface ResetButtonProps {
  disabled: boolean
  onClick: () => void
  className?: string
  title?: string
  /** When true (default), shows a confirm dialog before calling onClick. */
  showConfirm?: boolean
  /** Custom message for the confirm dialog. */
  confirmMessage?: string
}

export function ResetButton({
  disabled,
  onClick,
  className,
  title = 'すべてリセット',
  showConfirm = true,
  confirmMessage = 'すべてのデータをリセットしますか？',
}: ResetButtonProps) {
  const handleClick = () => {
    if (showConfirm) {
      if (window.confirm(confirmMessage)) {
        onClick()
      }
    } else {
      onClick()
    }
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`drawing-engine-button draw-control-panel__action-button draw-control-panel__action-button--reset${disabled ? ' draw-control-panel__action-button--disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    </button>
  )
}
