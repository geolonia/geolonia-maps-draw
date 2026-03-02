/**
 * 頂点削除に関するユーティリティ関数
 */

/** 頂点を削除できるか（最小頂点数チェック） */
export function canDeleteVertex(feature: GeoJSON.Feature): boolean {
  const geom = feature.geometry
  if (geom.type === 'LineString') {
    return geom.coordinates.length > 2
  }
  if (geom.type === 'Polygon') {
    // 外周リングの閉じ点を除いた頂点数で判定
    return geom.coordinates[0].length - 1 > 3
  }
  return false
}

/** 特定の頂点を削除した Feature を返す */
export function applyVertexDelete(
  feature: GeoJSON.Feature,
  vertexIndex: number,
): GeoJSON.Feature {
  const geom = feature.geometry
  if (geom.type === 'LineString') {
    const coords = geom.coordinates.filter((_, i) => i !== vertexIndex)
    return { ...feature, geometry: { ...geom, coordinates: coords } }
  }
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0].slice(0, -1) // 閉じ点を除去
    const newRing = ring.filter((_, i) => i !== vertexIndex)
    // ポリゴンリングを閉じる（先頭 = 末尾）
    const closed = [...newRing, newRing[0]]
    return { ...feature, geometry: { ...geom, coordinates: [closed] } }
  }
  return feature
}
