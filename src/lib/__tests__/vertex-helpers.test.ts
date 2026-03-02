import { describe, it, expect } from 'vitest'
import { canDeleteVertex, applyVertexDelete } from '../vertex-helpers'

describe('canDeleteVertex', () => {
  it('LineString: 3頂点以上なら削除可能', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0,0],[1,1],[2,2]] },
      properties: {},
    }
    expect(canDeleteVertex(feature)).toBe(true)
  })

  it('LineString: 2頂点なら削除不可', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] },
      properties: {},
    }
    expect(canDeleteVertex(feature)).toBe(false)
  })

  it('Polygon: 4頂点(+閉じ点)以上なら削除可能', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] },
      properties: {},
    }
    expect(canDeleteVertex(feature)).toBe(true)
  })

  it('Polygon: 3頂点(+閉じ点)なら削除不可', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[0,1],[0,0]]] },
      properties: {},
    }
    expect(canDeleteVertex(feature)).toBe(false)
  })

  it('Point は削除不可', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0,0] },
      properties: {},
    }
    expect(canDeleteVertex(feature)).toBe(false)
  })
})

describe('applyVertexDelete', () => {
  it('LineString: 中間頂点を削除', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0,0],[1,1],[2,2]] },
      properties: { _id: 'f-1' },
    }
    const result = applyVertexDelete(feature, 1)
    expect(result.geometry).toEqual({
      type: 'LineString',
      coordinates: [[0,0],[2,2]],
    })
    expect(result.properties).toEqual({ _id: 'f-1' })
  })

  it('LineString: 先頭頂点を削除', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0,0],[1,1],[2,2]] },
      properties: {},
    }
    const result = applyVertexDelete(feature, 0)
    expect(result.geometry).toEqual({
      type: 'LineString',
      coordinates: [[1,1],[2,2]],
    })
  })

  it('LineString: 末尾頂点を削除', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0,0],[1,1],[2,2]] },
      properties: {},
    }
    const result = applyVertexDelete(feature, 2)
    expect(result.geometry).toEqual({
      type: 'LineString',
      coordinates: [[0,0],[1,1]],
    })
  })

  it('Polygon: 中間頂点を削除し閉じ点が維持される', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] },
      properties: { _id: 'f-2' },
    }
    const result = applyVertexDelete(feature, 1)
    expect(result.geometry).toEqual({
      type: 'Polygon',
      coordinates: [[[0,0],[1,1],[0,1],[0,0]]],
    })
  })

  it('Polygon: 先頭頂点(index=0)を削除すると閉じ点が新しい先頭に更新される', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] },
      properties: {},
    }
    const result = applyVertexDelete(feature, 0)
    const coords = (result.geometry as GeoJSON.Polygon).coordinates[0]
    // 先頭と末尾が一致していること（閉じたリング）
    expect(coords[0]).toEqual(coords[coords.length - 1])
    // 3頂点 + 閉じ点 = 4要素
    expect(coords).toEqual([[1,0],[1,1],[0,1],[1,0]])
  })

  it('Polygon: 末尾頂点(最後の実頂点)を削除', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] },
      properties: {},
    }
    const result = applyVertexDelete(feature, 3)
    const coords = (result.geometry as GeoJSON.Polygon).coordinates[0]
    expect(coords).toEqual([[0,0],[1,0],[1,1],[0,0]])
  })

  it('Point は変更なし', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0,0] },
      properties: {},
    }
    const result = applyVertexDelete(feature, 0)
    expect(result).toBe(feature)
  })
})
