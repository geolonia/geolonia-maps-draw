export type DrawMode = 'point' | 'line' | 'polygon' | 'symbol'
export type PathMode = Extract<DrawMode, 'line' | 'polygon'>

/** コントロールの外観。`auto` は prefers-color-scheme に追従する。 */
export type Appearance = 'light' | 'dark' | 'glass' | 'auto'
