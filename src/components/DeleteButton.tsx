export interface DeleteButtonProps {
  disabled: boolean
  onClick: () => void
  className?: string
  title?: string
}

export function DeleteButton({
  disabled,
  onClick,
  className,
  title = '選択した図形を削除',
}: DeleteButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`drawing-engine-button draw-control-panel__action-button draw-control-panel__action-button--delete${disabled ? ' draw-control-panel__action-button--disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
  )
}
