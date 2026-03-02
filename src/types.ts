export type DrawMode = 'point' | 'line' | 'polygon' | 'symbol'
export type PathMode = Extract<DrawMode, 'line' | 'polygon'>
