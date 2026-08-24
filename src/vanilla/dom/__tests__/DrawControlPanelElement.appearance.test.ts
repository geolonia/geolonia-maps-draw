import { describe, it, expect, vi, afterEach } from 'vitest'
import { DrawControlPanelElement } from '../DrawControlPanelElement'
import type { DrawControlPanelCallbacks } from '../DrawControlPanelElement'

function createCallbacks(): DrawControlPanelCallbacks {
  return {
    onChangeMode: vi.fn(),
    onFinalize: vi.fn(),
    onDeleteFeature: vi.fn(),
    onResetGeoJSON: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  }
}

describe('DrawControlPanelElement の外観', () => {
  let panel: DrawControlPanelElement | null = null

  afterEach(() => {
    panel?.destroy()
    panel = null
  })

  it('指定しない場合は light になる', () => {
    panel = new DrawControlPanelElement(createCallbacks())
    expect(panel.element.getAttribute('data-de-appearance')).toBe('light')
  })

  it.each(['light', 'dark', 'glass', 'auto'] as const)('%s を指定すると属性に反映される', (appearance) => {
    panel = new DrawControlPanelElement(createCallbacks(), appearance)
    expect(panel.element.getAttribute('data-de-appearance')).toBe(appearance)
  })

  it('未知の値は light に落とす', () => {
    // @ts-expect-error 実行時に不正な値が渡された場合の挙動を検証する
    panel = new DrawControlPanelElement(createCallbacks(), 'neon')
    expect(panel.element.getAttribute('data-de-appearance')).toBe('light')
  })

  it('setAppearance で後から切り替えられる', () => {
    panel = new DrawControlPanelElement(createCallbacks(), 'light')
    panel.setAppearance('glass')
    expect(panel.element.getAttribute('data-de-appearance')).toBe('glass')
  })

  it('setAppearance に未知の値を渡すと light に落とす', () => {
    panel = new DrawControlPanelElement(createCallbacks(), 'dark')
    // @ts-expect-error 実行時に不正な値が渡された場合の挙動を検証する
    panel.setAppearance('neon')
    expect(panel.element.getAttribute('data-de-appearance')).toBe('light')
  })
})
