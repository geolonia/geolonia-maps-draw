# @geolonia/drawing-engine

[Geolonia Maps](https://geolonia.com/) 専用の GeoJSON 描画エンジン。React hooks とコンポーネントで構成されています。

> **注意:** このライブラリは Geolonia Maps Embed API が必須です。`window.geolonia.Map` が存在しない環境では `GeoloniaNotFoundError` がスローされます。

## Demo

https://geolonia.github.io/geolonia-maps-draw/

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
  appearance: 'light',                  // 外観（既定: 'light'）
```

## 外観テーマ

コントロールの見た目を3つから選べます。

| 値 | 内容 | アクセシビリティ |
|---|---|---|
| `light`（既定） | Geolonia デザインシステム準拠のフラット | WCAG AA 準拠 |
| `dark` | 構造色の濃紺を面にしたダーク | WCAG AA 準拠 |
| `glass` | 半透明とぼかしを使った意匠 | **AA を保証しません** |
| `auto` | OS の設定に追従して `light` / `dark` を切り替える | WCAG AA 準拠 |

```tsx
const engine = useDrawingEngine(map, { appearance: 'dark' })
```

コンポーネントに直接渡すこともできます。

```tsx
<DrawControlPanel {...engine.controlPanelProps} appearance='dark' />
```

Vanilla JS 版は後から切り替えられます。

```js
const engine = new DrawingEngine(map, { appearance: 'dark' })
engine.setAppearance('glass')
```

HTML から使う場合は `data-draw-appearance` 属性で指定します。

```html
<div class="geolonia" data-draw="on" data-draw-appearance="dark"></div>
```

外観はパネルのルート要素の `data-de-appearance` 属性として反映されます。`<html>` は変更しないため、同一ページに複数の地図を置いてそれぞれ別の外観にできます。

### glass のアクセシビリティについて

`glass` は半透明の面を地図タイルの上に重ねるため、**文字と背景のコントラストが地図の内容によって変わります。** 衛星写真や暗い地図スタイルの上では WCAG AA（4.5:1）を下回る可能性があります。

行政向け案件など、アクセシビリティ要件がある場合は `light` または `dark` を使ってください。

`backdrop-filter` に対応していない環境では、`glass` を指定しても `light` と同じ不透明な面で表示されます。

### デザイントークン

色・余白・角丸は [Geolonia デザインシステム](https://github.com/geolonia/geolonia-design-system)のトークンを参照します。`@geolonia/design-tokens` を読み込んでいる環境ではその値が使われ、読み込んでいない場合は既定値で動作します。

```ts
import '@geolonia/design-tokens/tokens.css'
```

デザインシステムのブランドテーマ（`<html data-theme="orange">`）と外観テーマは別の軸なので、組み合わせて使えます。ただしオレンジテーマは AA を保証しません（デザインシステム側の仕様）。

各トークンの決定内容と根拠は [`docs/design-tokens.md`](docs/design-tokens.md) を参照してください。

## コンポーネント

### `DrawControlPanel`

描画モード選択、Undo/Redo、削除、リセットなどの操作を提供するコントロールパネル。ドラッグで移動可能。パネル下部に Geolonia ブランドアイコンを表示。`appearance` で外観を指定できる。

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
type Appearance = 'light' | 'dark' | 'glass' | 'auto'

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
