// 星系视图场景数据仓库（M1）：全量恒星 + 行星轨道（内存索引），
// 提供 currentBodiesAt(gameTimeSec) 计算此刻全部行星的轨道坐标（km）。
import { create } from 'zustand'
import { loadOrbits, getOrbitData } from '../bodies/loadOrbits'
import { parseSystems } from '../utils/dataParser'
import { predictPositionKm } from '../orbit/gameModel.js'

export const useGalaxyStore = create((set, get) => ({
  stars: [], // [{ systemId, name, type, position: [x,y,z], massKg, sectorId }]
  planets: [], // [{ naturalId, systemId, orbit }]
  loaded: false,

  init: async () => {
    if (get().loaded) return
    await loadOrbits()
    const { planetOrbits, stars: starMasses } = getOrbitData()
    const systems = parseSystems()

    const stars = systems.map((s) => ({
      systemId: s.NaturalId,
      name: s.Name,
      type: s.Type,
      position: [s.PositionX, s.PositionY, s.PositionZ],
      massKg: starMasses.get(s.NaturalId)?.massKg ?? 0,
      sectorId: s.SectorId,
    }))
    const starBySystem = new Map(stars.map((s) => [s.systemId, s]))

    // 只保留能算出位置的：所属星系存在且恒星质量 > 0
    const planets = []
    for (const [naturalId, orbit] of planetOrbits) {
      const star = starBySystem.get(orbit.systemId)
      if (!star || star.massKg <= 0) continue
      planets.push({ naturalId, systemId: orbit.systemId, orbit })
    }

    set({ stars, planets, loaded: true })
  },

  getStar: (systemId) => {
    const star = get().stars.find((s) => s.systemId === systemId)
    return star
  },

  // 此刻全部行星的轨道坐标（相对恒星，km）。O(n)，n≈4155。
  currentBodiesAt: (gameTimeSec) => {
    const { stars, planets } = get()
    const starBySystem = new Map(stars.map((s) => [s.systemId, s]))
    const bodies = []
    for (const p of planets) {
      const star = starBySystem.get(p.systemId)
      if (!star) continue
      const posKm = predictPositionKm(p.orbit, star.massKg, gameTimeSec)
      bodies.push({ kind: 'planet', id: p.naturalId, systemId: p.systemId, posKm })
    }
    return bodies
  },
}))

// DEV 调试/性能分析用：window.__galaxyStore
if (import.meta.env.DEV) {
  window.__galaxyStore = useGalaxyStore
}
