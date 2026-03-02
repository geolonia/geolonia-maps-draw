import { describe, it, expect } from 'vitest'
import { closePolygonRing, createPointFeature, createPathFeature, createDraftFeatureCollection, parseGeoJSONImport } from '../geojson-helpers'

// _id のカウンターはモジュールレベルなので、各テストで expect.stringMatching で検証
const ID_PATTERN = expect.stringMatching(/^geolonia-\d+$/)

describe('closePolygonRing', () => {
  it('空配列を渡すと空配列を返す', () => {
    expect(closePolygonRing([])).toEqual([])
  })

  it('1点のみの場合、first と last が同一なのでそのまま返す', () => {
    const vertices: [number, number][] = [[139.0, 35.0]]
    const result = closePolygonRing(vertices)
    expect(result).toEqual([[139.0, 35.0]])
    expect(result).toBe(vertices)
  })

  it('閉じていないリングの場合、最初の点を末尾に追加する', () => {
    const vertices: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ]
    expect(closePolygonRing(vertices)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ])
  })

  it('既に閉じているリングはそのまま返す', () => {
    const vertices: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ]
    const result = closePolygonRing(vertices)
    expect(result).toEqual(vertices)
    expect(result).toBe(vertices) // 同一参照
  })
})

describe('createPointFeature', () => {
  it('mode="point" で正しい Feature 構造を返す', () => {
    const result = createPointFeature([139.767, 35.681], 'point')
    expect(result).toEqual({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [139.767, 35.681],
      },
      properties: {
        _id: ID_PATTERN,
        drawMode: 'point',
      },
    })
  })

  it('mode="symbol" で drawMode プロパティが symbol になる', () => {
    const result = createPointFeature([0, 0], 'symbol')
    expect(result.properties).toEqual({ _id: ID_PATTERN, drawMode: 'symbol' })
  })
})

describe('createPathFeature', () => {
  it('mode="line" で LineString ジオメトリを返す', () => {
    const vertices: [number, number][] = [
      [0, 0],
      [1, 1],
    ]
    const result = createPathFeature(vertices, 'line')
    expect(result).toEqual({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
      properties: {
        _id: ID_PATTERN,
        drawMode: 'line',
      },
    })
  })

  it('mode="polygon" で Polygon ジオメトリを返し、リングが閉じている', () => {
    const vertices: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ]
    const result = createPathFeature(vertices, 'polygon')
    expect(result).toEqual({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
      properties: {
        _id: ID_PATTERN,
        drawMode: 'polygon',
      },
    })
  })
})

describe('parseGeoJSONImport', () => {
  it('FeatureCollection をパースしてフィーチャ配列を返す', () => {
    const input = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [139, 35] }, properties: { name: 'test' } },
      ],
    })
    const result = parseGeoJSONImport(input)
    expect(result).toHaveLength(1)
    expect(result[0].properties).toEqual({
      name: 'test',
      _id: ID_PATTERN,
      drawMode: 'point',
    })
  })

  it('単一 Feature をパースして配列に包む', () => {
    const input = JSON.stringify({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      properties: {},
    })
    const result = parseGeoJSONImport(input)
    expect(result).toHaveLength(1)
    expect(result[0].properties).toEqual({
      _id: ID_PATTERN,
      drawMode: 'line',
    })
  })

  it('既存の drawMode を保持する', () => {
    const input = JSON.stringify({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { drawMode: 'symbol' },
    })
    const result = parseGeoJSONImport(input)
    expect(result[0].properties?.drawMode).toBe('symbol')
  })

  it('Polygon のジオメトリタイプから drawMode を推測する', () => {
    const input = JSON.stringify({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      properties: {},
    })
    const result = parseGeoJSONImport(input)
    expect(result[0].properties?.drawMode).toBe('polygon')
  })

  it('未知のジオメトリタイプではデフォルトで point を推測する', () => {
    const input = JSON.stringify({
      type: 'Feature',
      geometry: { type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] },
      properties: {},
    })
    const result = parseGeoJSONImport(input)
    expect(result[0].properties?.drawMode).toBe('point')
  })

  it('不正な JSON でエラーを投げる', () => {
    expect(() => parseGeoJSONImport('not json')).toThrow()
  })

  it('GeoJSON でないオブジェクトでエラーを投げる', () => {
    expect(() => parseGeoJSONImport('{"foo": "bar"}')).toThrow('GeoJSON の形式が正しくありません')
  })
})

describe('createDraftFeatureCollection', () => {
  it('空座標で空の FeatureCollection を返す', () => {
    const result = createDraftFeatureCollection([], 'line')
    expect(result).toEqual({ type: 'FeatureCollection', features: [] })
  })

  it('1点で Point のみを返す', () => {
    const result = createDraftFeatureCollection([[0, 0]], 'line')
    expect(result.features).toHaveLength(1)
    expect(result.features[0].geometry).toEqual({ type: 'Point', coordinates: [0, 0] })
    expect(result.features[0].properties).toEqual({ draftIndex: 0 })
  })

  it('2点(line) で LineString + 2 Points を返す', () => {
    const result = createDraftFeatureCollection([[0, 0], [1, 1]], 'line')
    expect(result.features).toHaveLength(3)
    const types = result.features.map((f) => f.geometry.type)
    expect(types.filter((t) => t === 'Point')).toHaveLength(2)
    expect(types.filter((t) => t === 'LineString')).toHaveLength(1)
    // draftIndex が正しく付与される
    expect(result.features[0].properties).toEqual({ draftIndex: 0 })
    expect(result.features[1].properties).toEqual({ draftIndex: 1 })
  })

  it('2点(polygon) で LineString + 2 Points を返す（3点未満のため）', () => {
    const result = createDraftFeatureCollection([[0, 0], [1, 0]], 'polygon')
    expect(result.features).toHaveLength(3)
    const types = result.features.map((f) => f.geometry.type)
    expect(types.filter((t) => t === 'Point')).toHaveLength(2)
    expect(types.filter((t) => t === 'LineString')).toHaveLength(1)
  })

  it('3点(line) で LineString + 3 Points を返す', () => {
    const result = createDraftFeatureCollection([[0, 0], [1, 0], [1, 1]], 'line')
    expect(result.features).toHaveLength(4)
    const types = result.features.map((f) => f.geometry.type)
    expect(types.filter((t) => t === 'Point')).toHaveLength(3)
    expect(types.filter((t) => t === 'LineString')).toHaveLength(1)
  })

  it('3点(polygon) で Polygon + LineString + 3 Points を返す', () => {
    const result = createDraftFeatureCollection([[0, 0], [1, 0], [1, 1]], 'polygon')
    expect(result.features).toHaveLength(5)
    const types = result.features.map((f) => f.geometry.type)
    expect(types.filter((t) => t === 'Point')).toHaveLength(3)
    expect(types.filter((t) => t === 'Polygon')).toHaveLength(1)
    expect(types.filter((t) => t === 'LineString')).toHaveLength(1)

    // ポリゴンリングが閉じている
    const polygon = result.features.find((f) => f.geometry.type === 'Polygon')!
    const ring = (polygon.geometry as GeoJSON.Polygon).coordinates[0]
    expect(ring[0]).toEqual(ring[ring.length - 1])

    // draftIndex が正しく付与される
    const points = result.features.filter((f) => f.geometry.type === 'Point')
    expect(points[0].properties).toEqual({ draftIndex: 0 })
    expect(points[1].properties).toEqual({ draftIndex: 1 })
    expect(points[2].properties).toEqual({ draftIndex: 2 })
  })
})
