import { useEffect, useRef } from 'react'
import './VertexContextMenu.css'

type VertexContextMenuProps = {
  position: { x: number; y: number }
  canDelete: boolean
  onDelete: () => void
  onClose: () => void
}

export function VertexContextMenu({ position, canDelete, onDelete, onClose }: VertexContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const handleDelete = () => {
    if (!canDelete) return
    onDelete()
  }

  return (
    <div
      ref={menuRef}
      className='vertex-context-menu'
      style={{ left: position.x, top: position.y }}
    >
      <button
        type='button'
        className={`vertex-context-menu__item${canDelete ? '' : ' vertex-context-menu__item--disabled'}`}
        onClick={handleDelete}
        disabled={!canDelete}
        title={canDelete ? 'この頂点を削除' : '頂点が少なすぎるため削除できません'}
      >
        この頂点を削除
      </button>
    </div>
  )
}
