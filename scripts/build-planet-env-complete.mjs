// 补全 planet-env.json：planets-orbit.json 有但 env 缺失的行星，从 FIO 拉取 Radius(米→km) / Pressure。
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'orbit', 'planet-env.json')
const FIO = 'https://rest.fnar.net'
const CONCURRENCY = 20
const TIMEOUT = 10000

const env = JSON.parse(readFileSync(OUT, 'utf8'))
const have = new Set(Object.keys(env))

// 全量行星列表
const allplanets = await (await fetch(`${FIO}/planet/allplanets`)).json()
const missing = allplanets.filter((p) => !have.has(p.PlanetNaturalId.toUpperCase()))
console.log(`现有 ${Object.keys(env).length} 条，缺失 ${missing.length} 条`)

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

let added = 0
let fail = 0
let cursor = 0

async function worker() {
  while (cursor < missing.length) {
    const item = missing[cursor++]
    const d = await fetchJson(`${FIO}/planet/${encodeURIComponent(item.PlanetNaturalId)}`)
    if (!d || !d.Radius) {
      fail++
      continue
    }
    env[d.PlanetNaturalId.toUpperCase()] = {
      r: d.Radius / 1000, // FIO 米 → km（与现有格式一致）
      p: d.Pressure ?? 0,
    }
    added++
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

writeFileSync(OUT, JSON.stringify(env))
console.log(`完成：新增 ${added} 条，失败 ${fail} 条，总计 ${Object.keys(env).length} 条`)
