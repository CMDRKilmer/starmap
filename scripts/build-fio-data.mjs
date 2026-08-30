#!/usr/bin/env node
// 从 FIO API (rest.fnar.net) 重建 starmap 星系骨架数据 → public/data/。
// 背景：原数据源 CMDRKilmer/fiodata GitHub 仓库已失效；FIO API 可公开访问。
// 用法：node scripts/build-fio-data.mjs
// 输出（与 dataParser.js 期望的字段对齐）：
//   systemstars_allstars.json  恒星全量 [{SystemId,SystemNaturalId,SystemName,Type,PositionX/Y/Z,SectorId,SubSectorId,Mass,MassSol,...}]
//   csv_systemlinks.csv        Left,Right（NaturalId 连接）
//   csv_systemplanets.csv      NaturalId,Name
//   csv_planetdetail.csv       PlanetNaturalId,HasLocalMarket,...,Gravity,Temperature,Pressure,Fertility,Surface
//   csv_planetresources.csv    Planet,Ticker,Type,Factor
//   system_factions.json       { systemFactions: {}, planetFactions: { [planetId]: factionCode } }

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')
const FIO = 'https://rest.fnar.net'
const CONCURRENCY = 30
const TIMEOUT = 10000

mkdirSync(OUT_DIR, { recursive: true })

async function fetchJson(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
    try {
      const resp = await fetch(url, { signal: ctrl.signal })
      if (resp.ok) return await resp.json()
    } catch {
      // 重试
    } finally {
      clearTimeout(timer)
    }
    await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
  }
  return undefined
}

function toCSV(headers, rows) {
  return [headers.join(','), ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n')
}

// 1. 恒星全量（含坐标/质量）
console.log('1/4 拉取恒星全量 systemstars/allstars ...')
const allstars = await fetchJson(`${FIO}/systemstars/allstars`)
if (!allstars) throw new Error('systemstars/allstars 拉取失败')
writeFileSync(join(OUT_DIR, 'systemstars_allstars.json'), JSON.stringify(allstars))
console.log(`   恒星 ${allstars.length} 条`)

// 2. 系统连接（hash → NaturalId 映射，从 /systemstars 的 Connections 构建）
console.log('2/4 拉取系统连接 systemstars ...')
const systems = await fetchJson(`${FIO}/systemstars`)
if (!systems) throw new Error('systemstars 拉取失败')
const idToNatural = new Map(systems.map(s => [s.SystemId, s.NaturalId]))
const linkRows = []
const seen = new Set()
for (const s of systems) {
  for (const conn of s.Connections ?? []) {
    const left = idToNatural.get(s.SystemId)
    const right = idToNatural.get(conn.ConnectingId)
    if (!left || !right || left === right) continue
    const key = [left, right].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    linkRows.push({ Left: left, Right: right })
  }
}
writeFileSync(join(OUT_DIR, 'csv_systemlinks.csv'), toCSV(['Left', 'Right'], linkRows))
console.log(`   连接 ${linkRows.length} 条`)

// 3. 行星列表
console.log('3/4 拉取行星列表 planet/allplanets ...')
const allplanets = await fetchJson(`${FIO}/planet/allplanets`)
if (!allplanets) throw new Error('planet/allplanets 拉取失败')
writeFileSync(
  join(OUT_DIR, 'csv_systemplanets.csv'),
  toCSV(['NaturalId', 'Name'], allplanets.map(p => ({ NaturalId: p.PlanetNaturalId, Name: p.PlanetName }))),
)
console.log(`   行星 ${allplanets.length} 条`)

// 4. 行星详情（并发拉取：环境/设施/资源/派系）
console.log('4/4 拉取行星详情 /planet/{id} ...')
const detailRows = []
const resourceRows = []
const planetFactions = {}
let ok = 0
let fail = 0
let cursor = 0

async function fetchPlanetDetail(id) {
  const d = await fetchJson(`${FIO}/planet/${encodeURIComponent(id)}`)
  if (!d) return
  detailRows.push({
    PlanetNaturalId: d.PlanetNaturalId ?? id,
    HasLocalMarket: d.HasLocalMarket ? 'True' : 'False',
    HasChamberOfCommerce: d.HasChamberOfCommerce ? 'True' : 'False',
    HasWarehouse: d.HasWarehouse ? 'True' : 'False',
    HasAdministrationCenter: d.HasAdministrationCenter ? 'True' : 'False',
    HasShipyard: d.HasShipyard ? 'True' : 'False',
    Gravity: d.Gravity ?? '',
    Temperature: d.Temperature ?? '',
    Pressure: d.Pressure ?? '',
    Fertility: d.Fertility ?? '',
    Surface: d.Surface ? 'True' : 'False',
  })
  for (const m of d.MaterialList ?? []) {
    if (typeof m.Factor === 'number' && m.Factor > 0) {
      resourceRows.push({
        Planet: d.PlanetNaturalId ?? id,
        Ticker: m.MaterialTicker ?? '',
        Type: m.ResourceType ?? '',
        Factor: m.Factor,
      })
    }
  }
  if (d.FactionCode) {
    planetFactions[(d.PlanetNaturalId ?? id).toUpperCase()] = d.FactionCode
  }
}

const worker = async () => {
  while (cursor < allplanets.length) {
    const item = allplanets[cursor++]
    const before = ok + fail
    try {
      await fetchPlanetDetail(item.PlanetNaturalId)
      ok++
    } catch {
      fail++
    }
    if (ok + fail !== before && (ok + fail) % 200 === 0) {
      console.log(`   进度 ${ok + fail}/${allplanets.length} 成功 ${ok} 失败 ${fail}`)
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

writeFileSync(join(OUT_DIR, 'csv_planetdetail.csv'), toCSV([
  'PlanetNaturalId', 'HasLocalMarket', 'HasChamberOfCommerce', 'HasWarehouse',
  'HasAdministrationCenter', 'HasShipyard', 'Gravity', 'Temperature', 'Pressure',
  'Fertility', 'Surface',
], detailRows))
writeFileSync(join(OUT_DIR, 'csv_planetresources.csv'), toCSV(['Planet', 'Ticker', 'Type', 'Factor'], resourceRows))
writeFileSync(join(OUT_DIR, 'system_factions.json'), JSON.stringify({ systemFactions: {}, planetFactions }))
console.log(`   完成：详情 ${detailRows.length}，资源行 ${resourceRows.length}，行星派系 ${Object.keys(planetFactions).length}，失败 ${fail}`)
console.log(`输出目录：${OUT_DIR}`)
