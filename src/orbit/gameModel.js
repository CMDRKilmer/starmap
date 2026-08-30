import { GAME_G } from './constants.js'
import { solveKepler, trueAnomaly } from './kepler.js'

function rotZ(v, th) {
  const c = Math.cos(th)
  const s = Math.sin(th)
  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y, z: v.z }
}
function rotX(v, th) {
  const c = Math.cos(th)
  const s = Math.sin(th)
  return { x: v.x, y: c * v.y - s * v.z, z: s * v.y + c * v.z }
}

// 轨道面 → 世界：R3(-ω)·R1(+i)·R3(-Ω)
// 注意：i 正向旋转，与服务器 transferEllipse 坐标对齐（RUNCN 2026-08-27 实测）。
export function gameOrbitalToWorld(p, { inclination: i, rightAscension: o, periapsis: w }) {
  let v = rotZ(p, -w)
  v = rotX(v, i)
  return rotZ(v, -o)
}

// 预测天体在 gameTimeSec（与 GAME_REF 同源的世界时间秒）的位置，相对轨道中心，单位 km。
export function predictPositionKm(orbit, parentMassKg, gameTimeSec) {
  const n = Math.sqrt((GAME_G * parentMassKg) / Math.pow(orbit.semiMajorAxis, 3))
  const M = n * gameTimeSec
  const E = solveKepler(M, orbit.eccentricity)
  const nu = trueAnomaly(E, orbit.eccentricity)
  const r = orbit.semiMajorAxis * (1 - orbit.eccentricity * Math.cos(E))
  const offset = gameOrbitalToWorld(
    { x: r * Math.cos(nu), y: r * Math.sin(nu), z: 0 },
    orbit,
  )
  // 游戏输出：x/y 交换 + /1e3（米 → 千米）
  return { x: offset.y / 1e3, y: offset.x / 1e3, z: offset.z / 1e3 }
}
