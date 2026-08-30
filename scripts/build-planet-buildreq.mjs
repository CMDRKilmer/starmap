// 从 FIO 拉取全部行星的 BuildRequirements（基建需求），生成 public/data/planet-buildreq.json。
// 三绿行星（星球基建不需要额外材料）= BuildRequirements 中无环境额外材料（SEA/TSH/INS/AEF/HSE 等）。
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'planet-buildreq.json')
const FIO = 'https://rest.fnar.net'
const CONCURRENCY = 30
const TIMEOUT = 10000

// 所有行星共有的基础建材（无环境依赖），其余 ticker 视为环境额外材料
const BASE = new Set(['MCG', 'TRU', 'LDE', 'LSE', 'LTA', 'PSL'])

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

const planets = await fetchJson(`${FIO}/planet/allplanets`)
if (!planets) throw new Error('planet/allplanets 拉取失败')

const extraMap = {}
let ok = 0
let fail = 0
let tripleGreen = 0
let cursor = 0

async function worker() {
  while (cursor < planets.length) {
    const p = planets[cursor++]
    const d = await fetchJson(`${FIO}/planet/${encodeURIComponent(p.PlanetNaturalId)}`)
    if (!d) {
      fail++
      continue
    }
    const extra = (d.BuildRequirements ?? [])
      .map((r) => r.MaterialTicker)
      .filter((t) => !BASE.has(t))
    extraMap[d.PlanetNaturalId.toUpperCase()] = extra
    if (extra.length === 0) tripleGreen++
    ok++
    if (ok % 500 === 0) console.log(`  进度 ${ok}/${planets.length} 成功 ${ok} 失败 ${fail}`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

writeFileSync(OUT, JSON.stringify(extraMap))
console.log(`完成：${ok} 行星，失败 ${fail}，三绿（无额外建材）${tripleGreen} 颗`)
console.log(`输出：${OUT}`)
