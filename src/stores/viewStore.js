// 视图状态机（M2）：galaxy / system / planet 三模式切换。
import { create } from 'zustand'

export const useViewStore = create((set, get) => ({
  mode: 'galaxy', // 'galaxy' | 'system' | 'planet'
  focusedStarId: null,
  focusedPlanetId: null,

  goToStar: (id) => set({ mode: 'system', focusedStarId: id, focusedPlanetId: null }),
  goToPlanet: (id) => set({ mode: 'planet', focusedPlanetId: id }),
  back: () => {
    const s = get()
    if (s.mode === 'planet') set({ mode: 'system', focusedPlanetId: null })
    else if (s.mode === 'system') set({ mode: 'galaxy', focusedStarId: null })
  },
}))

// DEV 调试用：window.__viewStore
if (import.meta.env.DEV) {
  window.__viewStore = useViewStore
}
