import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { CodeViewer } from '../CodeViewer'

const openWith = (code: string) => {
  render(<CodeViewer code={code} fileName="Demo.tsx" />)
  fireEvent.click(screen.getByRole('button', { name: 'View Source' }))
  return screen.getByRole('region', { name: 'Source code viewer' })
}

const tagTexts = (region: HTMLElement) =>
  Array.from(region.querySelectorAll('.hl-tag')).map((el) => el.textContent)

describe('CodeViewer のシンタックスハイライト', () => {
  it('大文字始まりのコンポーネントタグをタグとして扱う', () => {
    const region = openWith('<MapView />')
    expect(tagTexts(region)).toContain('<MapView')
  })

  it('小文字始まりの HTML タグをタグとして扱う', () => {
    const region = openWith('<div className="a"></div>')
    expect(tagTexts(region)).toEqual(expect.arrayContaining(['<div', '</div']))
  })

  it('Fragment の省略記法をタグとして扱う', () => {
    const region = openWith('<>text</>')
    expect(tagTexts(region)).toEqual(expect.arrayContaining(['<>', '</>']))
  })

  it('ハイフンを含むカスタム要素名をタグとして扱う', () => {
    const region = openWith('<geolonia-map></geolonia-map>')
    expect(tagTexts(region)).toEqual(
      expect.arrayContaining(['<geolonia-map', '</geolonia-map']),
    )
  })

  it('コメント・文字列・数値のハイライトを壊さない', () => {
    const region = openWith('// note\nconst n = 1\nconst s = "x"')
    expect(region.querySelector('.hl-comment')?.textContent).toBe('// note')
    expect(region.querySelector('.hl-number')?.textContent).toBe('1')
    expect(region.querySelector('.hl-string')?.textContent).toBe('"x"')
  })
})
