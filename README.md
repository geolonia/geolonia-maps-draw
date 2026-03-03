# @geolonia/drawing-engine

[Geolonia Maps](https://geolonia.com/) 専用の GeoJSON 描画エンジン。React hooks とコンポーネントで構成されています。

## Demo

https://geolonia.github.io/geolonia-maps-draw/

> **注意:** このライブラリは Geolonia Maps Embed API が必須です。`window.geolonia.Map` が存在しない環境では `GeoloniaNotFoundError` がスローされます。

## インストール

```bash
npm install @geolonia/drawing-engine
```

### Peer Dependencies

```bash
npm install react react-dom maplibre-gl
```

- `react` >= 18
- `react-dom` >= 18
- `maplibre-gl` >= 4

### Geolonia Maps Embed API

HTML に以下のスクリプトタグを追加してください：

```html
<script src="https://cdn.geolonia.com/v1/embed?geolonia-api-key=YOUR-API-KEY"></script>
```

## 基本的な使い方

```tsx
import {
  useGeoloniaMap,
  useDrawingEngine,
  DrawControlPanel,
  VertexContextMenu,
} from '@geolonia/drawing-engine'
import '@geolonia/drawing-engine/style.css'

function App() {
  const { containerRef, map } = useGeoloniaMap({
    center: [139.767, 35.681],
    zoom: 14,
  })

  const engine = useDrawingEngine(map)

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div ref={containerRef} data-navigation-control="on" style={{ width: '100%', height: '100%' }} />
      {map && (
        <>
          <DrawControlPanel {...engine.controlPanelProps} />
          {engine.vertexContextMenuEvent && (
            <VertexContextMenu
              position={{ x: engine.vertexContextMenuEvent.x, y: engine.vertexContextMenuEvent.y }}
              canDelete={true}
              onDelete={engine.deleteSelectedVertex}
              onClose={engine.closeVertexContextMenu}
            />
          )}
        </>
      )}
    </div>
  )
}
```

### オプション

```tsx
const engine = useDrawingEngine(map, {
  initialFeatures: myFeatureCollection, // 初期 GeoJSON データ
})
```

## コンポーネント

### `DrawControlPanel`

描画モード選択、Undo/Redo、削除、リセットなどの操作を提供するコントロールパネル。ドラッグで移動可能。パネル下部に Geolonia ブランドアイコンを表示。

### `DrawModeSelector`

描画モード（ポイント、ライン、ポリゴン、シンボル）の選択 UI。

### `VertexContextMenu`

頂点の右クリックメニュー。頂点の削除操作を提供。

### `GeoloniaIcon`

Geolonia ブランドアイコン（24x24 SVG）。

## Hooks

### `useGeoloniaMap(settings?)`

Geolonia Maps の初期化 hook。`window.geolonia.Map` を使用して地図インスタンスを生成します。

```tsx
const { containerRef, map } = useGeoloniaMap({
  center: [139.767, 35.681], // デフォルト: [139.7671, 35.6812]
  zoom: 14,                   // デフォルト: 14
  style: 'geolonia/basic-v1', // デフォルト: 'geolonia/basic-v1'
  container: 'map-id',        // デフォルト: containerRef の DOM 要素
})
```

- `boxZoom` は自動的に `false` に設定されます（Shift+click を選択操作に使用するため）
- Geolonia Maps Embed API が未読み込みの場合は `GeoloniaNotFoundError` をスローします

### `useDrawingEngine(map, options?)`

メインの描画エンジン hook。Geolonia Maps の Map インスタンスを受け取り、描画に必要な全ての状態とアクションを返します。

**返り値:**
- `features` - 現在の GeoJSON FeatureCollection
- `drawMode` - 現在の描画モード (`'point' | 'line' | 'polygon' | 'symbol' | null`)
- `selectedFeatureIds` - 選択中のフィーチャ ID セット
- `isDrawingPath` - ライン/ポリゴン描画中かどうか
- `canFinalizeDraft` - ドラフトを確定できるか
- `canUndo` / `canRedo` - Undo/Redo 可能か
- `controlPanelProps` - `DrawControlPanel` に渡す props
- `finalizeDraft()` - ドラフトを確定
- `deleteSelectedFeatures()` - 選択中のフィーチャを削除
- `deleteSelectedVertex()` - 選択中の頂点を削除
- `resetGeoJSON()` - GeoJSON を初期化
- `undo()` / `redo()` - Undo/Redo
- `importCSV(text)` - CSV データをインポート
- `importGeoJSON(features, mode)` - GeoJSON データをインポート（replace/merge）

### `useUndoable(initialState)`

汎用的な Undo/Redo 管理 hook。最大 50 履歴を保持。

### `useVertexEditing(options)`

頂点の選択、ドラッグ移動、削除を管理する hook。

## ユーティリティ関数

| 関数 | 説明 |
|------|------|
| `createPointFeature(coord, mode)` | Point Feature を生成 |
| `createPathFeature(vertices, mode)` | LineString/Polygon Feature を生成 |
| `createDraftFeatureCollection(coords, mode)` | ドラフト用 FeatureCollection を生成 |
| `parseGeoJSONImport(text)` | GeoJSON テキストをパースして Feature 配列に変換 |
| `nextFeatureId()` | ユニークな Feature ID を生成 |
| `closePolygonRing(vertices)` | ポリゴンリングを閉じる |
| `parseCSV(text)` | CSV テキストをパースして座標データに変換 |
| `clampPosition(pos, panelSize, viewport)` | 位置をビューポート内に制約 |
| `canDeleteVertex(feature)` | 頂点削除が可能かチェック |
| `applyVertexDelete(feature, index)` | 頂点を削除した Feature を返す |

## エラーハンドリング

### `assertGeolonia()`

`window.geolonia.Map` の存在をチェックします。`useDrawingEngine` と `useGeoloniaMap` の内部で自動的に呼ばれます。

### `GeoloniaNotFoundError`

Geolonia Maps Embed API が読み込まれていない場合にスローされるエラー。

```tsx
import { GeoloniaNotFoundError } from '@geolonia/drawing-engine'

try {
  // ...
} catch (e) {
  if (e instanceof GeoloniaNotFoundError) {
    console.error('Geolonia Maps Embed API を読み込んでください')
  }
}
```

## 型定義

```typescript
type DrawMode = 'point' | 'line' | 'polygon' | 'symbol'
type PathMode = 'line' | 'polygon'

type GeoloniaMapSettings = {
  container?: string
  center?: [number, number]
  zoom?: number
  style?: string
}
```

## 開発

```bash
# 依存関係インストール
npm install

# プレビューサーバー起動
npm run dev

# ライブラリビルド
npm run build

# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# Lint
npm run lint
```

## ライセンス

MIT
