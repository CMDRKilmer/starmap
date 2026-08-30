// 游戏轨道模型常量（抄自 RUNCN src/infrastructure/fio/orbit.ts:49-51，与 FIO 一致）
export const GAME_G = 6.67384e-11 // SI 引力常数
export const GAME_REF = 1451690603 // 游戏世界时间参考历元（Unix 秒）
export const GAME_MOTION_FACTOR = 20 // PlanetaryMotionFactor（FIO /global/simulationdata）
export const PARSEC_LENGTH = 12 // 1 pc = 12 坐标单位（游戏约定，实测 ParsecLength=12）
export const KM_PER_PARSEC = 3.085677581491367e13 // 1 pc = km
export const KM_PER_UNIT = KM_PER_PARSEC / PARSEC_LENGTH // 1 坐标单位 ≈ 2.571e12 km
