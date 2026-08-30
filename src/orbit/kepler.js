// 开普勒方程求解（抄自 RUNCN orbit.ts:430-444）
export function solveKepler(meanAnomaly, e) {
  const M = meanAnomaly % (2 * Math.PI)
  let E = e < 0.8 ? M : Math.PI
  for (let i = 0; i < 16; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= d
    if (Math.abs(d) < 1e-10) break
  }
  return E
}

export function trueAnomaly(E, e) {
  return Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e)
}
