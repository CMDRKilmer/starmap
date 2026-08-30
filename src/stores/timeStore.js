// 时间轴状态（M2）：currentGameTime（游戏世界秒，与 GAME_REF 同源）/ playing / rate。
import { create } from 'zustand'
import { unixMsToGameSec } from '../orbit/time.js'

export const useTimeStore = create((set, get) => ({
  currentGameTime: unixMsToGameSec(Date.now()),
  playing: true, // 默认播放
  rate: 20, // 游戏时间倍数：1 现实秒 = 20 游戏秒（文档 GAME_MOTION_FACTOR=20）

  setTime: (gameTimeSec) => set({ currentGameTime: gameTimeSec, playing: false }),
  goNow: () => set({ currentGameTime: unixMsToGameSec(Date.now()), playing: true }),
  setRate: (rate) => set({ rate }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  tick: (dtSec) => {
    if (!get().playing) return
    set((s) => ({ currentGameTime: s.currentGameTime + dtSec * s.rate }))
  },
}))

// DEV 调试用：window.__timeStore
if (import.meta.env.DEV) {
  window.__timeStore = useTimeStore
}
