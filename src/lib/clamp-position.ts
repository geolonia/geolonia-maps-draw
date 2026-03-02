/**
 * ドラッグ位置をビューポート内に制限するユーティリティ
 */
export type Position = { x: number; y: number }
export type Size = { width: number; height: number }

/**
 * パネルがビューポート外にはみ出さないよう、位置を制約する。
 * @param pos - ドラッグ中のパネル左上座標
 * @param panelSize - パネルのサイズ
 * @param viewport - ビューポートのサイズ
 * @returns 制約後の座標
 */
export function clampPosition(pos: Position, panelSize: Size, viewport: Size): Position {
  const x = Math.max(0, Math.min(pos.x, viewport.width - panelSize.width))
  const y = Math.max(0, Math.min(pos.y, viewport.height - panelSize.height))
  return { x, y }
}
