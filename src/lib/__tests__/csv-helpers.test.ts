import { describe, it, expect } from 'vitest'
import { parseCSV } from '../csv-helpers'

describe('parseCSV', () => {
  it('lat,lng カラムをパースする', () => {
    const csv = 'lat,lng\n35.681,139.767\n34.693,135.502'
    const rows = parseCSV(csv)
    expect(rows).toEqual([
      { lat: 35.681, lng: 139.767, properties: {} },
      { lat: 34.693, lng: 135.502, properties: {} },
    ])
  })

  it('latitude,longitude カラム名を検出する', () => {
    const csv = 'latitude,longitude\n35.681,139.767'
    const rows = parseCSV(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].lat).toBe(35.681)
    expect(rows[0].lng).toBe(139.767)
  })

  it('日本語カラム名（緯度,経度）を検出する', () => {
    const csv = '緯度,経度\n35.681,139.767'
    const rows = parseCSV(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].lat).toBe(35.681)
  })

  it('大文字小文字を区別しない', () => {
    const csv = 'LAT,LNG\n35.681,139.767'
    const rows = parseCSV(csv)
    expect(rows).toHaveLength(1)
  })

  it('追加カラムをプロパティに取り込む', () => {
    const csv = 'name,lat,lng,category\n東京駅,35.681,139.767,駅'
    const rows = parseCSV(csv)
    expect(rows).toEqual([
      { lat: 35.681, lng: 139.767, properties: { name: '東京駅', category: '駅' } },
    ])
  })

  it('空行をスキップする', () => {
    const csv = 'lat,lng\n35.681,139.767\n\n34.693,135.502\n'
    const rows = parseCSV(csv)
    expect(rows).toHaveLength(2)
  })

  it('数値でない座標行をスキップする', () => {
    const csv = 'lat,lng\nabc,139.767\n35.681,139.767'
    const rows = parseCSV(csv)
    expect(rows).toHaveLength(1)
  })

  it('緯度カラムがない場合エラーを投げる', () => {
    const csv = 'x,lng\n35.681,139.767'
    expect(() => parseCSV(csv)).toThrow('緯度カラムが見つかりません')
  })

  it('経度カラムがない場合エラーを投げる', () => {
    const csv = 'lat,y\n35.681,139.767'
    expect(() => parseCSV(csv)).toThrow('経度カラムが見つかりません')
  })

  it('ヘッダーのみでデータがない場合エラーを投げる', () => {
    expect(() => parseCSV('lat,lng')).toThrow('CSVにはヘッダーと1行以上のデータが必要です')
  })

  it('CRLFの改行コードに対応する', () => {
    const csv = 'lat,lng\r\n35.681,139.767\r\n34.693,135.502'
    const rows = parseCSV(csv)
    expect(rows).toHaveLength(2)
  })
})
