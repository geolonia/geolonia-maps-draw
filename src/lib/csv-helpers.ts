export type CsvRow = {
  lat: number
  lng: number
  properties: Record<string, string>
}

const LAT_PATTERNS = ['lat', 'latitude', '緯度']
const LNG_PATTERNS = ['lng', 'lon', 'longitude', '経度']

function findColumnIndex(headers: string[], patterns: string[]): number {
  const lower = headers.map((h) => h.trim().toLowerCase())
  for (const pattern of patterns) {
    const idx = lower.indexOf(pattern)
    if (idx !== -1) return idx
  }
  return -1
}

export function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSVにはヘッダーと1行以上のデータが必要です')

  const headers = lines[0].split(',')
  const latIdx = findColumnIndex(headers, LAT_PATTERNS)
  const lngIdx = findColumnIndex(headers, LNG_PATTERNS)

  if (latIdx === -1) throw new Error('緯度カラムが見つかりません (lat, latitude, 緯度)')
  if (lngIdx === -1) throw new Error('経度カラムが見つかりません (lng, lon, longitude, 経度)')

  const propHeaders = headers
    .map((h, i) => ({ name: h.trim(), index: i }))
    .filter(({ index }) => index !== latIdx && index !== lngIdx)

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue
    const cols = line.split(',')
    const lat = parseFloat(cols[latIdx])
    const lng = parseFloat(cols[lngIdx])
    if (isNaN(lat) || isNaN(lng)) continue

    const properties: Record<string, string> = {}
    for (const { name, index } of propHeaders) {
      if (cols[index] !== undefined) {
        properties[name] = cols[index].trim()
      }
    }
    rows.push({ lat, lng, properties })
  }

  return rows
}
