import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 外観テーマのコントラスト検証。
 *
 * CSS の各外観ブロックからトークン値を取り出し、フォールバック値を解決して
 * 実際のコントラスト比を計算する。値を悪化させる変更を CI で止めるためのもの。
 *
 * 基準:
 * - 文字・アイコン: WCAG AA 4.5:1
 * - UI コンポーネント（面の識別・境界）: WCAG 1.4.11 非テキストコントラスト 3:1
 */

const CSS = readFileSync(resolve(__dirname, '../drawing-engine.css'), 'utf-8')

const AA_TEXT = 4.5
const AA_NON_TEXT = 3

function channelToLinear(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

function luminance(color: string): number {
  const [r, g, b] = parseHex(color)
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function toHex(rgb: number[]): string {
  return '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

/** color-mix(in srgb, A p%, B) を sRGB 単純混合で評価する */
function mix(a: string, percent: number, b: string): string {
  const ca = parseHex(a)
  const cb = parseHex(b)
  return toHex(ca.map((v, i) => (v * percent + cb[i] * (100 - percent)) / 100))
}

/** var(--name, FALLBACK) をフォールバック値へ、color-mix(...) を計算結果へ畳み込む */
function resolveValue(raw: string): string {
  let value = raw.trim()

  // 内側から var() を畳み込む
  for (let i = 0; i < 10 && value.includes('var('); i++) {
    const next = value.replace(/var\(\s*--[\w-]+\s*,\s*([^(),]+?)\s*\)/g, (_, fallback) => fallback.trim())
    if (next === value) break
    value = next
  }

  const mixMatch = value.match(/^color-mix\(\s*in srgb\s*,\s*(#[0-9a-fA-F]{3,8})\s+([\d.]+)%\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)$/)
  if (mixMatch) return mix(mixMatch[1], parseFloat(mixMatch[2]), mixMatch[3])

  return value
}

/** 指定セレクタのブロックからトークンを抜き出す */
function tokensOf(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const block = CSS.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n  \\}`))
  expect(block, `${selector} のブロックが見つからない`).not.toBeNull()

  const tokens: Record<string, string> = {}
  for (const [, name, value] of (block as RegExpMatchArray)[1].matchAll(/(--de-[\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim()
  }
  return tokens
}

function resolvedTokensOf(selector: string): Record<string, string> {
  const raw = tokensOf(selector)
  const out: Record<string, string> = {}

  for (const [name, value] of Object.entries(raw)) {
    // 同ブロック内の --de-* 参照を先に展開する
    let expanded = value
    for (let i = 0; i < 10 && /var\(\s*--de-/.test(expanded); i++) {
      const next = expanded.replace(/var\(\s*(--de-[\w-]+)\s*\)/g, (m, ref) => raw[ref] ?? m)
      if (next === expanded) break
      expanded = next
    }
    out[name] = resolveValue(expanded)
  }
  return out
}

describe('外観テーマのコントラスト', () => {
  describe('light（既定）', () => {
    const t = resolvedTokensOf("[data-de-appearance='light'],\n  [data-de-appearance='auto']")

    it('文字が面に対して AA を満たす', () => {
      expect(contrast(t['--de-color-text'], t['--de-color-background'])).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('弱い文字が面に対して AA を満たす', () => {
      expect(contrast(t['--de-color-text-secondary'], t['--de-color-background'])).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('選択状態の面が周囲の面から識別できる', () => {
      expect(contrast(t['--de-button-selected-background'], t['--de-color-background'])).toBeGreaterThanOrEqual(AA_NON_TEXT)
    })

    it('選択状態の面に乗る文字が AA を満たす', () => {
      expect(contrast(t['--de-button-selected-color'], t['--de-button-selected-background'])).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('危険色がアイコンの基準を満たす', () => {
      expect(contrast(t['--de-color-danger'], t['--de-color-background'])).toBeGreaterThanOrEqual(AA_NON_TEXT)
    })
  })

  describe('dark', () => {
    const t = resolvedTokensOf("[data-de-appearance='dark']")

    it('面は構造色の濃紺', () => {
      expect(t['--de-color-background'].toLowerCase()).toBe('#1b2a4a')
    })

    it('文字が面に対して AA を満たす', () => {
      expect(contrast(t['--de-color-text'], t['--de-color-background'])).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('弱い文字が面に対して AA を満たす', () => {
      expect(contrast(t['--de-color-text-secondary'], t['--de-color-background'])).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('選択状態の面が周囲の面から識別できる（非テキスト 3:1）', () => {
      expect(contrast(t['--de-button-selected-background'], t['--de-color-background'])).toBeGreaterThanOrEqual(AA_NON_TEXT)
    })

    it('選択状態の面に乗る文字が AA を満たす（4.5:1）', () => {
      expect(contrast(t['--de-button-selected-color'], t['--de-button-selected-background'])).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('危険色がアイコンの基準を満たす', () => {
      expect(contrast(t['--de-color-danger'], t['--de-color-background'])).toBeGreaterThanOrEqual(AA_NON_TEXT)
    })

    it('ホバー面に乗る文字が AA を満たす', () => {
      expect(contrast(t['--de-color-text'], t['--de-color-surface'])).toBeGreaterThanOrEqual(AA_TEXT)
    })
  })

  describe('glass', () => {
    const t = tokensOf("[data-de-appearance='glass']")

    it('面の不透明度の下限が定義されている', () => {
      expect(t['--de-glass-surface-opacity']).toBe('0.85')
    })

    it('面のグラデーションが下限の不透明度を下回らない', () => {
      const floor = parseFloat(t['--de-glass-surface-opacity'])
      const alphas = [...t['--de-panel-background'].matchAll(/rgba\([^)]*?,\s*([\d.]+)\s*\)/g)]
        .map((m) => parseFloat(m[1]))

      expect(alphas.length).toBeGreaterThan(0)
      expect(Math.max(...alphas)).toBeGreaterThanOrEqual(floor)
    })

    it('色は light を継承し、glass では上書きしない', () => {
      expect(t['--de-color-text']).toBeUndefined()
      expect(t['--de-color-background']).toBeUndefined()
    })
  })
})
