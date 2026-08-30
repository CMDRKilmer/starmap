#!/usr/bin/env node
// 验证 starmap src/orbit/* 移植自 RUNCN orbit.ts 的公式是否一致。
// 方法（与 RUNCN scripts/verify-orbit-model.mjs 同源数学）：
//   1. 往返：predictPositionKm 输出 → worldToOrbital 逆变换 → nu → E → M
//      M0 = M - n*worldTime 应 ≈ 0 mod 2π（游戏 M0=0 模型自洽）
//   2. 圆轨道（e≈0）：|pos| 应 ≈ a（km）
// 用法：node scripts/verify-kepler.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { GAME_G, GAME_REF, GAME_MOTION_FACTOR } from '../src/orbit/constants.js'
import { solveKepler, trueAnomaly } from '../src/orbit/kepler.js'
import { predictPositionKm } from '../src/orbit/gameModel.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const orbits = JSON.parse(readFileSync(join(root, 'public/orbit/planets-orbit.json')))
const starMasses = JSON.parse(readFileSync(join(root, 'public/orbit/star-masses.json')))
const masses = new Map(starMasses.map((s) => [s.n.toUpperCase(), s.m]))

// 与 verify-orbit-model.mjs 相同的逆变换（世界 → 轨道面）
function worldToOrbital(d, { inclination: i, rightAscension: o, periapsis: w }) {
  const x1 = Math.cos(o) * d.x + Math.sin(o) * d.y
  const y1 = -Math.sin(o) * d.x + Math.cos(o) * d.y
  const y2 = Math.cos(i) * y1 + Math.sin(i) * d.z
  const z2 = -Math.sin(i) * y1 + Math.cos(i) * d.z
  return {
    x: Math.cos(w) * x1 + Math.sin(w) * y2,
    y: -Math.sin(w) * x1 + Math.cos(w) * y2,
    z: z2,
  }
}
function eccFromTrue(nu, e) {
  return 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2))
}
function normalizeAngle(a) {
  let x = a % (2 * Math.PI)
  if (x > Math.PI) x -= 2 * Math.PI
  if (x < -Math.PI) x += 2 * Math.PI
  return x
}

// 采样：行星 e 全在 [0.001, 0.05]（近圆），取 e 最小 / 中间 / 最大 3 颗覆盖范围
const sorted = [...orbits].sort((a, b) => Math.abs(a.e) - Math.abs(b.e))
const samples = [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]]
const systemOf = (id) => id.replace(/[a-z]$/i, '').toUpperCase()

console.log('=== 开普勒预测验证 ===\n')
let allPass = true
for (const p of samples) {
  const orbit = {
    semiMajorAxis: p.a,
    eccentricity: p.e,
    inclination: p.i,
    rightAscension: p.o,
    periapsis: p.p,
  }
  const parentMass = masses.get(systemOf(p.n))
  if (!parentMass) {
    console.log(`${p.n}: 无恒星质量，跳过`)
    continue
  }
  const tSec = Date.now() / 1000
  const worldTime = GAME_REF + (tSec - GAME_REF) * GAME_MOTION_FACTOR
  const n = Math.sqrt((GAME_G * parentMass) / Math.pow(p.a, 3))

  // 2 个时刻做往返 M0 校验
  const M0s = []
  const posList = []
  for (const dt of [0, 3600 * 24]) {
    const pos = predictPositionKm(orbit, parentMass, worldTime + dt * GAME_MOTION_FACTOR)
    posList.push(pos)
    // 输出 x/y 已交换 → 还原 offset 坐标（×1e3 回米）
    const offset = { x: pos.y * 1e3, y: pos.x * 1e3, z: pos.z * 1e3 }
    const len = Math.hypot(offset.x, offset.y, offset.z)
    const dir = worldToOrbital({ x: offset.x / len, y: offset.y / len, z: offset.z / len }, orbit)
    const nu = Math.atan2(dir.y, dir.x)
    const E = eccFromTrue(nu, p.e)
    const Mobs = E - p.e * Math.sin(E)
    M0s.push(normalizeAngle(Mobs - n * (worldTime + dt * GAME_MOTION_FACTOR)))
  }

  // 校验 1：M0 ≈ 0
  const m0ErrDeg = Math.max(...M0s.map((m) => Math.abs(m))) * 180 / Math.PI
  const passM0 = m0ErrDeg < 1e-6
  // 校验 2：模长必在近/远心点之间 [a(1-e), a(1+e)]（km）
  const rKm = Math.hypot(posList[0].x, posList[0].y, posList[0].z)
  const rMin = (p.a * (1 - p.e)) / 1e3
  const rMax = (p.a * (1 + p.e)) / 1e3
  const passR = rKm >= rMin * (1 - 1e-9) && rKm <= rMax * (1 + 1e-9)
  allPass = allPass && passM0 && passR
  console.log(`${p.n}: e=${p.e.toFixed(4)} a=${(p.a / 1e6).toFixed(1)}Mm`)
  console.log(`  M0 偏差: ${m0ErrDeg.toExponential(3)}° ${passM0 ? '✅' : '❌'}`)
  console.log(`  模长 ${(rKm / 1e6).toFixed(1)}Mm ∈ [${(rMin / 1e6).toFixed(1)}, ${(rMax / 1e6).toFixed(1)}]Mm ${passR ? '✅' : '❌'}`)
  console.log(`  pos(t0): x=${posList[0].x.toFixed(1)} y=${posList[0].y.toFixed(1)} z=${posList[0].z.toFixed(1)} km`)
  console.log(`  pos(t1): x=${posList[1].x.toFixed(1)} y=${posList[1].y.toFixed(1)} z=${posList[1].z.toFixed(1)} km\n`)
}

console.log(allPass ? '结论: 与 RUNCN 公式一致 ✅' : '结论: 存在偏差 ❌')
process.exit(allPass ? 0 : 1)
