export class RubberBandElement {
  readonly element: HTMLDivElement

  constructor() {
    this.element = document.createElement('div')
    this.element.style.position = 'absolute'
    this.element.style.border = '2px dashed rgba(26, 115, 232, 0.7)'
    this.element.style.backgroundColor = 'rgba(26, 115, 232, 0.1)'
    this.element.style.pointerEvents = 'none'
    this.element.style.zIndex = '10'
    this.element.style.display = 'none'
  }

  update(rect: { x: number; y: number; width: number; height: number } | null): void {
    if (!rect) {
      this.element.style.display = 'none'
      return
    }
    this.element.style.display = 'block'
    this.element.style.left = `${rect.x}px`
    this.element.style.top = `${rect.y}px`
    this.element.style.width = `${rect.width}px`
    this.element.style.height = `${rect.height}px`
  }
}
