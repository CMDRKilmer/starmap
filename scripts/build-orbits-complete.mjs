// 补全 planets-orbit.json：csv_systemplanets.csv 有记录但本地轨道缺失的行星，从 FIO 拉取轨道根数合并。
// FIO /planet/{id} 字段：OrbitSemiMajorAxis(米)/OrbitEccentricity/OrbitInclination/OrbitRightAscension/OrbitPeriapsis/Mass
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'orbit', 'planets-orbit.json')
const FIO = 'https://rest.fnar.net'
const CONCURRENCY = 20
const TIMEOUT = 10000

const existing = JSON.parse(readFileSync(OUT, 'utf8'))
const have = new Set(existing.map((p) => p.n.toUpperCase()))

// 全量行星列表（FIO 提供，或从 csv 读）
const allplanets = await (await fetch(`${FIO}/planet/allplanets`)).json()
const missing = allplanets.filter((p) => !have.has(p.PlanetNaturalId.toUpperCase()))
console.log(`现有 ${existing.length} 条，FIO 共 ${allplanets.length} 条，缺失 ${missing.length} 条`)

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
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
  }
  return undefined
}

const added = []
let fail = 0
let cursor = 0

async function worker() {
  while (cursor < missing.length) {
    const item = missing[cursor++]
    const d = await fetchJson(`${FIO}/planet/${encodeURIComponent(item.PlanetNaturalId)}`)
    if (!d || !d.OrbitSemiMajorAxis || d.OrbitSemiMajorAxis <= 0) {
      fail++
      continue
    }
    added.push({
      n: d.PlanetNaturalId, // 小写，与原格式一致
      a: d.OrbitSemiMajorAxis,
      e: d.OrbitEccentricity ?? 0,
      i: d.OrbitInclination ?? 0,
      o: d.OrbitRightAscension ?? 0,
      p: d.OrbitPeriapsis ?? 0,
      m: d.Mass ?? 0,
      s: '', // hash 不再使用
    })
    if (added.length % 100 === 0) console.log(`  已补 ${added.length}/${missing.length}`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

writeFileSync(OUT, JSON.stringify([...existing, ...added]))
console.log(`完成：新增 ${added.length} 条，失败 ${fail} 条，总计 ${existing.length + added.length} 条`)
