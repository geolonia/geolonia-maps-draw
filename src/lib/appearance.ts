import type { Appearance } from '../types'

export const APPEARANCES: readonly Appearance[] = ['light', 'dark', 'glass', 'auto'] as const

export const DEFAULT_APPEARANCE: Appearance = 'light'

/**
 * 任意の値を Appearance に正規化する。
 * 未知の値・未指定の場合は既定値を返す。
 */
export function resolveAppearance(value: unknown): Appearance {
  return APPEARANCES.includes(value as Appearance) ? (value as Appearance) : DEFAULT_APPEARANCE
}
