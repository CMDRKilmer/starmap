// 更新行星名称表：从 FIO /planet/allplanets 重建 public/data/csv_systemplanets.csv。
// 背景：本地旧数据 Name 恒等于 NaturalId，FIO 现已有别名（如 YI-683c → Arcadia）。
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'csv_systemplanets.csv')

const esc = (s) => (/[,"\n]/.test(s) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s))

const ps = await (await fetch('https://rest.fnar.net/planet/allplanets')).json()
const rows = ps.map((p) => `${esc(p.PlanetNaturalId)},${esc(p.PlanetName || p.PlanetNaturalId)}`)
writeFileSync(OUT, `NaturalId,Name\n${rows.join('\n')}`)
const diff = ps.filter((p) => p.PlanetName !== p.PlanetNaturalId)
console.log(`total ${ps.length}, aliased ${diff.length}`)
console.log('sample:', JSON.stringify(diff.slice(0, 3)))
