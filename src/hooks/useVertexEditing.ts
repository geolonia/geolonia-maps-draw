import { useEffect, useRef, useCallback } from 'react'
import type maplibregl from 'maplibre-gl'
import { canDeleteVertex, applyVertexDelete } from '../lib/vertex-helpers'

export const VERTEX_SOURCE_ID = 'geojson-maker-vertex'
export const VERTEX_LAYER_ID = 'geojson-maker-vertex-layer'

export type SelectedVertex = {
  featureId: string
  vertexIndex: number
}

export type VertexContextMenuEvent = {
  featureId: string
  vertexIndex: number
  x: number
  y: number
}

/** ライン / ポリゴンの頂点ハンドル (Point Feature) を計算する */
function getVertexHandles(
  feature: GeoJSON.Feature,
  selectedVertex: SelectedVertex | null,
): GeoJSON.FeatureCollection {
  const handles: GeoJSON.Feature[] = []
  const geom = feature.geometry
  const featureId = feature.properties?._id as string

  if (geom.type === 'LineString') {
    geom.coordinates.forEach((coord, i) => {
      handles.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coord },
        properties: {
          featureId,
          vertexIndex: i,
          selected: selectedVertex?.featureId === featureId && selectedVertex?.vertexIndex === i,
        },
      })
    })
  } else if (geom.type === 'Polygon') {
    // 外周リング、閉じる重複点を除く
    geom.coordinates[0].slice(0, -1).forEach((coord, i) => {
      handles.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coord },
        properties: {
          featureId,
          vertexIndex: i,
          selected: selectedVertex?.featureId === featureId && selectedVertex?.vertexIndex === i,
        },
      })
    })
  }

  return { type: 'FeatureCollection', features: handles }
}

/** 特定の頂点を新しい座標に移動した Feature を返す */
function applyVertexMove(
  feature: GeoJSON.Feature,
  vertexIndex: number,
  newCoord: [number, number]
): GeoJSON.Feature {
  const geom = feature.geometry
  if (geom.type === 'LineString') {
    const coords = geom.coordinates.map((c, i) =>
      i === vertexIndex ? newCoord : c
    ) as [number, number][]
    return { ...feature, geometry: { ...geom, coordinates: coords } }
  }
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0].map((c, i) => {
      if (i === vertexIndex) return newCoord
      // 頂点 0 を動かす場合、閉じる点も更新
      if (vertexIndex === 0 && i === geom.coordinates[0].length - 1) return newCoord
      return c
    }) as [number, number][]
    return { ...feature, geometry: { ...geom, coordinates: [ring] } }
  }
  return feature
}

type UseVertexEditingOptions = {
  map: maplibregl.Map | null
  features: GeoJSON.FeatureCollection
  selectedFeatureId: string | null
  mainSourceId: string
  onCommit: (updatedFeature: GeoJSON.Feature) => void
  selectedVertex: SelectedVertex | null
  onVertexSelect: (vertex: SelectedVertex | null) => void
  onVertexContextMenu: (event: VertexContextMenuEvent | null) => void
}

export function useVertexEditing({
  map,
  features,
  selectedFeatureId,
  mainSourceId,
  onCommit,
  selectedVertex,
  onVertexSelect,
  onVertexContextMenu,
}: UseVertexEditingOptions) {
  /** クリックハンドラと共有する「ドラッグ直後フラグ」 */
  const justDraggedRef = useRef(false)

  const dragRef = useRef<{
    featureId: string
    vertexIndex: number
    feature: GeoJSON.Feature
    hasMoved: boolean
  } | null>(null)

  /** effects の依存を増やさずに最新の features を参照するための ref */
  const featuresRef = useRef(features)
  featuresRef.current = features

  /** 最新の selectedVertex を ref で保持 */
  const selectedVertexRef = useRef(selectedVertex)
  selectedVertexRef.current = selectedVertex

  /** 最新のコールバックを ref で保持 */
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const onVertexSelectRef = useRef(onVertexSelect)
  onVertexSelectRef.current = onVertexSelect
  const onVertexContextMenuRef = useRef(onVertexContextMenu)
  onVertexContextMenuRef.current = onVertexContextMenu

  // 頂点ハンドル用ソース＆レイヤーのセットアップ
  useEffect(() => {
    if (!map) return
    const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
    map.addSource(VERTEX_SOURCE_ID, { type: 'geojson', data: emptyFC })
    map.addLayer({
      id: VERTEX_LAYER_ID,
      type: 'circle',
      source: VERTEX_SOURCE_ID,
      paint: {
        'circle-radius': ['case', ['==', ['get', 'selected'], true], 8, 6],
        'circle-color': ['case', ['==', ['get', 'selected'], true], '#ef4444', '#ffffff'],
        'circle-stroke-color': ['case', ['==', ['get', 'selected'], true], '#ef4444', '#1a73e8'],
        'circle-stroke-width': 2.5,
      },
    })

    return () => {
      if (map.getLayer(VERTEX_LAYER_ID)) map.removeLayer(VERTEX_LAYER_ID)
      if (map.getSource(VERTEX_SOURCE_ID)) map.removeSource(VERTEX_SOURCE_ID)
    }
  }, [map])

  // 選択フィーチャが変わるたびに頂点ハンドルを更新
  useEffect(() => {
    if (!map) return
    const source = map.getSource(VERTEX_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || typeof source.setData !== 'function') return
    const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

    if (!selectedFeatureId) {
      source.setData(emptyFC)
      return
    }
    const selected = features.features.find((f) => f.properties?._id === selectedFeatureId)
    if (!selected || (selected.geometry.type !== 'LineString' && selected.geometry.type !== 'Polygon')) {
      source.setData(emptyFC)
      return
    }
    source.setData(getVertexHandles(selected, selectedVertex))
  }, [map, selectedFeatureId, features, selectedVertex])

  // マウスドラッグ・クリック・右クリックイベントハンドラ
  useEffect(() => {
    if (!map) return
    const canvas = map.getCanvas()

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (dragRef.current) {
        const { featureId, vertexIndex } = dragRef.current
        const newCoord: [number, number] = [e.lngLat.lng, e.lngLat.lat]
        const updatedFeature = applyVertexMove(dragRef.current.feature, vertexIndex, newCoord)
        dragRef.current.feature = updatedFeature
        dragRef.current.hasMoved = true

        // 頂点ハンドルをリアルタイム更新
        const vertexSrc = map.getSource(VERTEX_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
        if (vertexSrc) vertexSrc.setData(getVertexHandles(updatedFeature, selectedVertexRef.current))

        // メインソースも即時更新（プレビュー）
        const mainSrc = map.getSource(mainSourceId) as maplibregl.GeoJSONSource | undefined
        if (mainSrc) {
          mainSrc.setData({
            type: 'FeatureCollection',
            features: featuresRef.current.features.map((f) =>
              f.properties?._id === featureId ? updatedFeature : f
            ),
          })
        }
        return
      }

      // カーソル変更（ホバー検出）
      if (!map.getLayer(VERTEX_LAYER_ID)) return
      const hits = map.queryRenderedFeatures(e.point, { layers: [VERTEX_LAYER_ID] })
      canvas.style.cursor = hits.length > 0 ? 'grab' : ''
    }

    const onMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(VERTEX_LAYER_ID)) return
      const hits = map.queryRenderedFeatures(e.point, { layers: [VERTEX_LAYER_ID] })
      if (hits.length === 0) return

      const hit = hits[0]
      const featureId = hit.properties?.featureId as string
      const vertexIndex = hit.properties?.vertexIndex as number
      const feature = featuresRef.current.features.find((f) => f.properties?._id === featureId)
      if (!feature) return

      dragRef.current = { featureId, vertexIndex, feature, hasMoved: false }
      canvas.style.cursor = 'grabbing'
      map.dragPan.disable()
    }

    const onMouseUp = () => {
      if (!dragRef.current) return
      const { featureId, vertexIndex, feature, hasMoved } = dragRef.current
      dragRef.current = null
      map.dragPan.enable()
      canvas.style.cursor = ''

      // クリックによる選択解除を防ぐフラグ
      justDraggedRef.current = true
      setTimeout(() => { justDraggedRef.current = false }, 50)

      if (hasMoved) {
        onCommitRef.current(feature)
      } else {
        // ドラッグしなかった = クリック → 頂点を選択
        onVertexSelectRef.current({ featureId, vertexIndex })
      }
    }

    const onContextMenu = (e: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(VERTEX_LAYER_ID)) return
      const hits = map.queryRenderedFeatures(e.point, { layers: [VERTEX_LAYER_ID] })
      if (hits.length === 0) return

      const hit = hits[0]
      const featureId = hit.properties?.featureId as string
      const vertexIndex = hit.properties?.vertexIndex as number
      e.preventDefault()
      onVertexSelectRef.current({ featureId, vertexIndex })
      onVertexContextMenuRef.current({
        featureId,
        vertexIndex,
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
      })
    }

    map.on('mousemove', onMouseMove)
    map.on('mousedown', onMouseDown)
    map.on('mouseup', onMouseUp)
    map.on('contextmenu', onContextMenu)
    return () => {
      map.off('mousemove', onMouseMove)
      map.off('mousedown', onMouseDown)
      map.off('mouseup', onMouseUp)
      map.off('contextmenu', onContextMenu)
    }
  }, [map, mainSourceId])

  /** 選択中の頂点を削除する */
  const deleteSelectedVertex = useCallback(() => {
    const sv = selectedVertexRef.current
    if (!sv) return
    const feature = featuresRef.current.features.find((f) => f.properties?._id === sv.featureId)
    if (!feature || !canDeleteVertex(feature)) return
    const updated = applyVertexDelete(feature, sv.vertexIndex)
    onCommitRef.current(updated)
    onVertexSelectRef.current(null)
  }, [])

  // Delete/Backspace キーボードハンドラ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (!selectedVertexRef.current) return
      e.preventDefault()
      deleteSelectedVertex()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedVertex])

  return { justDraggedRef, deleteSelectedVertex }
}
