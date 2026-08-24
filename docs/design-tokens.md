# デザイントークン

このライブラリの UI と地図描画に使う色・サイズの決定を記録する。

## 方針

正本は [geolonia/geolonia-design-system](https://github.com/geolonia/geolonia-design-system) の `tokens.css`（npm: `@geolonia/design-tokens`）。このリポジトリは値を直書きせず、そこで定義されたトークンを参照する。

このリポジトリは配布ライブラリなので、`tokens.css` を依存として読み込ませない。利用者アプリの `:root` に色を注入することになり、アプリ側のトークンと衝突するため。代わりに `--de-*` で一段ラップし、フォールバック付きで参照する。

```css
--de-color-primary: var(--color-action-primary, #1E4FB8);
```

利用者が `@geolonia/design-tokens` を読み込んでいればその値が使われ、読み込んでいなければフォールバックの既定値で動く。

`src/drawing-engine.css` に同じ形の `--de-*` 層が既にあるが、参照先の外部名（`--color-blue` / `--color-danger` / `--gradient-primary` 等）がデザインシステムに存在しない名前になっている。下の対応表が修正先を示す。

## 1. UI シェルの CSS トークン

| 用途 | 現在の値 | デザインシステムトークン | `--de-*` 名 |
|---|---|---|---|
| 主色（選択状態・フォーカス） | `#1a73e8` | `--color-action-primary` `#1E4FB8` | `--de-color-primary` |
| 主色ホバー | — | `--color-action-primary-hover` `#163E86` | `--de-color-primary-hover` |
| 差し色（縁取り・強調） | `#7c3aed` `#8b5cf6` `#6d28d9` | `--color-action-accent` `#E85A19` | `--de-color-accent` |
| 危険（削除） | `#ef4444` | `--color-status-danger` `#C0271E` | `--de-color-danger` |
| 文字・アイコン | `#374151` `#475569` | `--color-text-primary` `#1A1A1A` | `--de-color-text` |
| 弱い文字・アイコン | `#999` `#9ca3af` `#555` | `--color-text-secondary` `#5A5A5A` | `--de-color-text-secondary` |
| 面（ボタン地・パネル地） | `rgba(255,255,255,*)` | `--color-background` `#FFFFFF` | `--de-color-background` |
| 弱い面（ホバー地） | — | `--color-surface` `#F3F4F6` | `--de-color-surface` |
| 境界線 | `rgba(0,0,0,0.1)` `rgba(0,0,0,0.08)` | `--color-border` `#D6D9DE` | `--de-color-border` |
| 書体 | `-apple-system, BlinkMacSystemFont, ...` | `--font-family-base` | `--de-font-family` |
| 本文サイズ | — | `--font-size-body` `16px` | `--de-font-size-body` |
| 注釈サイズ | `13px` | `--font-size-caption` `13px` | `--de-font-size-caption` |
| パネルの影 | `0 8px 32px rgba(0,0,0,0.08)` ほか3層 | `--shadow-card` | `--de-shadow-card` |
| 浮いた面の影 | — | `--shadow-modal` | `--de-shadow-modal` |

紫（`#7c3aed` / `#8b5cf6` / `#6d28d9`）はデザインシステムに存在しない色。差し色の役割は `--color-action-accent` が担う。

### スケール外の値の寄せ先

デザインシステムのスケールに無い値を使っている箇所。

| 現在 | 寄せ先 |
|---|---|
| `font-size: 14px` | `--font-size-caption` `13px`（スケールは 28 / 22 / 18 / 16 / 13） |
| パネル `padding: 12px` | `--space-2` `8px` |
| モードセレクタ `gap: 6px` | `--space-1` `4px` |
| ボタン `border-radius: 10px` | `--radius-button` `6px`（`10px` は `--radius-card` に相当し、ボタンには使わない） |
| パネル `border-radius: 16px` / `17px` | `--radius-card` `10px` |

## 2. コントロールのサイズ

デザインシステムに最小タップ領域の規定が無いため、このリポジトリで決める。下限の根拠は WCAG 2.2 SC 2.5.8「ターゲットサイズ（最小）」の 24 × 24 CSS px。

現在の実寸はアイコン `24px` + `padding: 8px` + `border: 1px` で **42px 角**。

| | アイコン | padding | 外形 | 用途 |
|---|---|---|---|---|
| `medium`（既定） | `24px` | `--space-2` `8px` | **42px 角** | 単独利用・地図の主操作。現状維持 |
| `small` | `20px` | `--space-1` `4px` | **30px 角** | 既存 UI への埋め込み。WCAG 2.2 の 24px 下限を満たす |

- パネルの `padding` は `medium` = `--space-2` `8px`、`small` = `--space-1` `4px`
- ボタン間の `gap` はグループ間 `--space-2` `8px`、モードセレクタ内 `--space-1` `4px`
- パネルの固定幅（現在 `width: 68px`）は廃止し、内容に合わせて決まるようにする。サイズ切り替えのたびに幅を再計算する必要がなくなる

`small` をこれ以上小さくしない。デザインシステムのアクセシビリティ方針は基準を下げないことを明記している。

## 3. 地図描画のトークン

### CSS トークンは地図レイヤに届かない

MapLibre の `paint` は JavaScript の値として渡すため、CSS カスタムプロパティを参照できない。地物の色は CSS ではなく **TypeScript の定数**として持つ。

現在レイヤ定義が `src/core/DrawingEngineCore.ts` と `src/hooks/useDrawingEngine.ts` の2箇所に重複しており、色を変えるにはその両方を直す必要がある。色をトークン化する作業（#37）で `src/lib/style-tokens.ts` を単一の出所として導入し、両方をそこから参照させる。

### 地物のパレット

デザインシステムに地図描画用のトークンは存在しない。グラフ系列色を流用する。`tokens.css` は「グラフの塗りは図形なので AA 4.5:1 は不要（3:1 目安）」と明記しており、地物の塗りも同じ性質のため根拠として使える。

| 用途 | 現在 | 決定 | 由来 |
|---|---|---|---|
| 地物色1（既定） | `#1a73e8` | `#1E4FB8` | `--color-chart-1` |
| 地物色2 | `#e86a4a` | `#E85A19` | `--color-chart-2` |
| 地物色3 | — | `#1F7A3D` | `--color-chart-3` |
| シンボルの既定色 | `#ffb400` | 地物色1に統一 | シンボルとポイントの区別は色ではなくアイコンで行う（#39） |

3色から増やす場合は `--color-chart-4` `#D98E00`、`--color-chart-5` `#1B2A4A` の順に足す。独自の色を発明しない。

### 選択表示

選択は「白いケーシング（太線）の上に選択色の破線を重ねる」形で示す。色だけに頼らないため、地物がどの色でも識別できる。

| 用途 | 現在 | 決定 | 由来 |
|---|---|---|---|
| 選択のケーシング | — | `#FFFFFF` | `--color-background` |
| 選択のアウトライン | `#ff0000` | `#1B2A4A` | `--color-structure-navy`（= `--color-chart-5`） |

アウトラインに `--color-action-primary` を使うと地物色1と、`--color-action-accent` を使うと地物色2と同色になる。構造色の濃紺は地物パレットに使っていないため、選択表示専用に充てる。純赤 `#ff0000` はデザインシステムに存在しない。

### 頂点

通常と選択で色を変えず、塗りと線を反転させて示す。

| | 塗り | 線 |
|---|---|---|
| 通常 | `#FFFFFF` | `#1B2A4A` |
| 選択 | `#1B2A4A` | `#FFFFFF` |

現在は通常が白 + `#1a73e8`、選択が `#ef4444` + `#ef4444`。半径（通常 `6`、選択 `8`）と線幅 `2.5` は維持する。

### 描画中（ドラフト）

専用の色を持たせない。選択中の地物色をそのまま使い、破線と低い不透明度で未確定であることを示す。確定すると実線になるため、状態の違いが色以外で伝わる。

| 用途 | 値 |
|---|---|
| ポリゴンの塗り不透明度 | `0.2`（現状維持） |
| ドラフトの塗り不透明度 | `0.1`（現状維持） |
| ドラフトの破線 | `[4, 4]`（現状維持） |

## 4. シンボルの既定アイコン

デザインシステムに地図マーカー・ピンの規定は無い。このリポジトリで用意する。

- 単色のピン。塗りは地物の色（`--de-feature-*` に相当する TS 定数）に追従する
- `24 × 24`。アンカーは下端中央
- アイコンを指定しなかった地物はこの既定ピンで描く

## 5. トークンに無い色が必要になったとき

`docs/DESIGN.md`（デザインシステム側）の手順に従う。生のカラーコードを直書きしない。

1. 状態色のペア（淡い地 + 濃い文字）は `@geolonia/design-tokens` の `deriveStatusPair()` で導出する
2. JavaScript を使えない場面は既存トークンから `color-mix()` で導出する
3. 同じ色が複数のアプリで繰り返し必要になったら、デザインシステム側にトークン追加を Issue で提案する

地図描画用のトークンは 3 の候補。`geojson-maker` / `smartcity-smartmap` / `minmap-frontend` でも同種の色が必要になっており、実績が揃った時点で昇格を提案する。それまではこのリポジトリ内の決定として扱う。

## 未決事項

- 現在の意匠（ガラスモーフィズム。多層グラデーション + `backdrop-filter` + 発光シャドウ）を維持するか、デジタル庁準拠のフラットに寄せるか
- アイコンのみのボタンはデザインシステムに定義が無い。このリポジトリのサイズ決定（2節）で進める

いずれも #41 で扱う。
