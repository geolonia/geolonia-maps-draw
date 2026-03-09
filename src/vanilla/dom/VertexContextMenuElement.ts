export type VertexContextMenuOptions = {
  position: { x: number; y: number }
  canDelete: boolean
  onDelete: () => void
  onClose: () => void
}

export class VertexContextMenuElement {
  readonly element: HTMLDivElement
  private onClose: () => void

  private handleOutsideClick: (e: MouseEvent) => void
  private handleEscape: (e: KeyboardEvent) => void

  constructor(options: VertexContextMenuOptions) {
    this.onClose = options.onClose
    this.element = document.createElement('div')
    this.element.className = 'vertex-context-menu'
    this.element.style.left = `${options.position.x}px`
    this.element.style.top = `${options.position.y}px`

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.textContent = 'この頂点を削除'
    deleteBtn.disabled = !options.canDelete
    deleteBtn.className = options.canDelete
      ? 'vertex-context-menu__item'
      : 'vertex-context-menu__item vertex-context-menu__item--disabled'
    deleteBtn.title = options.canDelete ? 'この頂点を削除' : '頂点が少なすぎるため削除できません'
    deleteBtn.addEventListener('click', () => {
      if (!options.canDelete) return
      options.onDelete()
    })
    this.element.appendChild(deleteBtn)

    this.handleOutsideClick = (e: MouseEvent) => {
      if (this.element && !this.element.contains(e.target as Node)) {
        this.onClose()
      }
    }
    this.handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.onClose()
    }

    document.addEventListener('mousedown', this.handleOutsideClick)
    document.addEventListener('keydown', this.handleEscape)
  }

  destroy(): void {
    document.removeEventListener('mousedown', this.handleOutsideClick)
    document.removeEventListener('keydown', this.handleEscape)
    this.element.remove()
  }
}
