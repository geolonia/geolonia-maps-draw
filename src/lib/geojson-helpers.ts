import type { DrawMode, PathMode } from '../types'

let featureIdCounter = 0
export function nextFeatureId(): string {
  return `geolonia-${++featureIdCounter}`
}

export function closePolygonRing(vertices: [number, number][]): [number, number][] {
  if (vertices.length === 0) return []
  const first = vertices[0]
  const last = vertices[vertices.length - 1]
  const shouldClose = first[0] !== last[0] || first[1] !== last[1]
  return shouldClose ? [...vertices, first] : vertices
}

export function createPointFeature(coordinate: [number, number], mode: DrawMode): GeoJSON.Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: coordinate
    },
    properties: {
      _id: nextFeatureId(),
      drawMode: mode
    }
  }
}

export function createDraftFeatureCollection(
  coords: [number, number][],
  mode: PathMode
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []

  if (coords.length === 0) {
    return { type: 'FeatureCollection', features }
  }

  // 頂点を Point として追加（draftIndex で識別可能にする）
  for (let i = 0; i < coords.length; i++) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords[i] },
      properties: { draftIndex: i }
    })
  }

  if (coords.length >= 2) {
    // ポリゴンモードで3点以上なら Polygon + 外周 LineString
    if (mode === 'polygon' && coords.length >= 3) {
      const closed = closePolygonRing(coords)
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [closed] },
        properties: {}
      })
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: closed },
        properties: {}
      })
    } else {
      // ライン、またはポリゴンで3点未満
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {}
      })
    }
  }

  return { type: 'FeatureCollection', features }
}

function inferDrawMode(geometryType: string): string {
  switch (geometryType) {
    case 'Point': return 'point'
    case 'LineString': return 'line'
    case 'Polygon': return 'polygon'
    default: return 'point'
  }
}

export function parseGeoJSONImport(text: string): GeoJSON.Feature[] {
  const parsed = JSON.parse(text)
  let features: GeoJSON.Feature[]

  if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
    features = parsed.features
  } else if (parsed.type === 'Feature') {
    features = [parsed]
  } else {
    throw new Error('GeoJSON の形式が正しくありません')
  }

  return features.map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      _id: nextFeatureId(),
      drawMode: f.properties?.drawMode ?? inferDrawMode(f.geometry.type),
    },
  }))
}

export function createPathFeature(vertices: [number, number][], mode: PathMode): GeoJSON.Feature {
  const geometry: GeoJSON.LineString | GeoJSON.Polygon =
    mode === 'line'
      ? {
        type: 'LineString',
        coordinates: vertices
      }
      : {
        type: 'Polygon',
        coordinates: [closePolygonRing(vertices)]
      }

  return {
    type: 'Feature',
    geometry,
    properties: {
      _id: nextFeatureId(),
      drawMode: mode
    }
  }
}
