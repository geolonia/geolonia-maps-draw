import { describe, it, expect } from 'vitest'
import { APPEARANCES, DEFAULT_APPEARANCE, resolveAppearance } from '../appearance'

describe('appearance', () => {
  it('既定の外観は light', () => {
    expect(DEFAULT_APPEARANCE).toBe('light')
  })

  it('選べる外観は light / dark / glass / auto の4つ', () => {
    expect([...APPEARANCES]).toEqual(['light', 'dark', 'glass', 'auto'])
  })

  describe('resolveAppearance', () => {
    it.each(['light', 'dark', 'glass', 'auto'] as const)('既知の値 %s はそのまま返す', (value) => {
      expect(resolveAppearance(value)).toBe(value)
    })

    it('未知の文字列は既定値に落とす', () => {
      expect(resolveAppearance('neon')).toBe('light')
    })

    it('未指定（undefined）は既定値に落とす', () => {
      expect(resolveAppearance(undefined)).toBe('light')
    })

    it('null は既定値に落とす', () => {
      expect(resolveAppearance(null)).toBe('light')
    })

    it('文字列以外の型は既定値に落とす', () => {
      expect(resolveAppearance(1)).toBe('light')
      expect(resolveAppearance({})).toBe('light')
      expect(resolveAppearance(true)).toBe('light')
    })

    it('大文字は既知の値として扱わない', () => {
      expect(resolveAppearance('Dark')).toBe('light')
    })
  })
})
