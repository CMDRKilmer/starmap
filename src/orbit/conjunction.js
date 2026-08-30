// 交汇窗口：计算两颗行星未来「会合」时刻（相对距离最小的时刻）。
// 轨道模型与 predictPositionKm 一致——任意 gameTimeSec 求两行星位置再取距离。
import { GAME_G } from './constants.js'
import { predictPositionKm } from './gameModel.js'

// 轨道周期（秒）
export function orbitalPeriodSec(semiMajorAxisM, parentMassKg) {
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisM, 3) / (GAME_G * parentMassKg))
}

// 会合周期（秒）：两轨道同步周期 1/|1/Ta − 1/Tb|，即两次最近相遇的间隔
export function synodicPeriodSec(aPeriodSec, bPeriodSec) {
  return 1 / Math.abs(1 / aPeriodSec - 1 / bPeriodSec)
}

// 两行星距离平方（km²）——求最小值时避免开根号，单调性一致
function dist2(orbitA, orbitB, massKg, t) {
  const a = predictPositionKm(orbitA, massKg, t)
  const b = predictPositionKm(orbitB, massKg, t)
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}

// 黄金分割求一维凸函数最小值（会合谷底附近距离² 平滑，收敛快）
function minimize(f, lo, hi, eps) {
  const phi = (Math.sqrt(5) - 1) / 2
  let a = lo
  let b = hi
  let c = b - phi * (b - a)
  let d = a + phi * (b - a)
  let fc = f(c)
  let fd = f(d)
  while (b - a > eps) {
    if (fc < fd) {
      b = d
      d = c
      fd = fc
      c = b - phi * (b - a)
      fc = f(c)
    } else {
      a = c
      c = d
      fc = fd
      d = a + phi * (b - a)
      fd = f(d)
    }
  }
  const t = (a + b) / 2
  return { timeSec: t, distKm: Math.sqrt(f(t)) }
}

// 扫描未来 horizonSec 内的会合窗口（相对距离局部最小点）。
// 返回 [{ timeSec, distKm }]，按时间升序，最多 maxResults 个。
export function findConjunctions(orbitA, orbitB, parentMassKg, fromGameSec, horizonSec, opts = {}) {
  const maxResults = opts.maxResults ?? 5
  const precisionSec = opts.precisionSec ?? 60 // 1 分钟精度
  const Ta = orbitalPeriodSec(orbitA.semiMajorAxis, parentMassKg)
  const Tb = orbitalPeriodSec(orbitB.semiMajorAxis, parentMassKg)
  const synodic = synodicPeriodSec(Ta, Tb)
  if (!Number.isFinite(synodic) || synodic <= 0) return [] // 周期相同/异常：无会合
  const coarseStep = synodic / 48 // 一个会合周期至少 48 个粗采样点
  const f = (t) => dist2(orbitA, orbitB, parentMassKg, t)
  const n = Math.max(2, Math.ceil(horizonSec / coarseStep))
  const out = []
  let t0 = fromGameSec - coarseStep
  let d0 = f(t0)
  let t1 = fromGameSec
  let d1 = f(t1)
  for (let i = 1; i <= n; i++) {
    const t2 = fromGameSec + i * coarseStep
    const d2 = f(t2)
    // 粗采样点 t1 是局部最小：d1 < d0 且 d1 < d2
    if (d1 < d0 && d1 < d2) {
      out.push(minimize(f, t0, t2, precisionSec))
      if (out.length >= maxResults) break
    }
    t0 = t1
    d0 = d1
    t1 = t2
    d1 = d2
  }
  return out
}
