// 轨道数据加载与索引(M0)。
// 数据源:public/orbit/*.json(从 RUNCN public/json 复制的离线产物)。
// 全部 key 统一为大写 NaturalId,与 dataParser.js 的 systemsPlanetsMap 对齐。

const ORBIT_DATA_PATH = 'orbit'

let planetOrbits = null
let stars = null
let stationOrbits = null
let stationSystems = null
let loadPromise = null

async function fetchJson(endpoint) {
  const response = await fetch(`${ORBIT_DATA_PATH}/${endpoint}`)
  if (!response.ok) {
    throw new Error(`[loadOrbits] Failed to fetch ${endpoint}: ${response.status}`)
  }
  return response.json()
}

// 行星 naturalId 形如 "EX-389b"(FIO 单字母后缀),剥尾字母即所属星系 id。
function systemIdFromPlanetNaturalId(naturalId) {
  return naturalId.replace(/[a-z]$/i, '').toUpperCase()
}

export async function loadOrbits() {
  if (loadPromise) {
    return loadPromise
  }

  loadPromise = (async () => {
    const [planetsRaw, starsRaw, stationsRaw] = await Promise.all([
      fetchJson('planets-orbit.json'),
      fetchJson('star-masses.json'),
      fetchJson('stations.json'),
    ])

    // 行星轨道:{n: naturalId, a: 半长轴(m), e, i, o, p, m: 质量(kg), s: hash(不可用作 systemId)}
    planetOrbits = new Map()
    for (const p of planetsRaw) {
      if (p.a === undefined || p.a <= 0) continue
      const key = p.n.toUpperCase()
      planetOrbits.set(key, {
        naturalId: key,
        semiMajorAxis: p.a,
        eccentricity: p.e,
        inclination: p.i,
        rightAscension: p.o,
        periapsis: p.p,
        massKg: p.m,
        systemId: systemIdFromPlanetNaturalId(p.n),
      })
    }

    // 恒星质量:{n: naturalId, m: 质量(kg)}
    stars = new Map()
    for (const s of starsRaw) {
      const key = s.n.toUpperCase()
      stars.set(key, { naturalId: key, massKg: s.m })
    }

    // 空间站:键=naturalId,{s: 所属星系, a/e/i/o/p: 轨道根数(可缺失,缺则固定不动)}
    stationOrbits = new Map()
    stationSystems = new Map()
    for (const [id, st] of Object.entries(stationsRaw)) {
      const key = id.toUpperCase()
      stationSystems.set(key, st.s.toUpperCase())
      if (st.a !== undefined && st.a > 0) {
        stationOrbits.set(key, {
          naturalId: key,
          semiMajorAxis: st.a,
          eccentricity: st.e ?? 0,
          inclination: st.i ?? 0,
          rightAscension: st.o ?? 0,
          periapsis: st.p ?? 0,
          massKg: 0,
          systemId: st.s.toUpperCase(),
        })
      }
    }

    console.log(
      `[loadOrbits] planets: ${planetOrbits.size}, stars: ${stars.size}, stations: ${stationSystems.size} (with orbit: ${stationOrbits.size})`
    )
    return { planetOrbits, stars, stationOrbits, stationSystems }
  })()

  return loadPromise
}

// 已加载的轨道索引（loadOrbits() 完成后可用）
export function getOrbitData() {
  return { planetOrbits, stars, stationOrbits, stationSystems }
}
