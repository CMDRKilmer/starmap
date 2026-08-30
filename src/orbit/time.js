import { GAME_REF, GAME_MOTION_FACTOR } from './constants.js'

// Unix ms ↔ gameTime（秒，与 GAME_REF 同源）
export function unixMsToGameSec(ms) {
  const unixSec = ms / 1000
  return GAME_REF + (unixSec - GAME_REF) * GAME_MOTION_FACTOR
}

export function gameSecToUnixMs(sec) {
  return (GAME_REF + (sec - GAME_REF) / GAME_MOTION_FACTOR) * 1000
}
