// 每帧推进时间轴（timeStore.tick 内部处理 playing/rate）。
import { useFrame } from '@react-three/fiber'
import { useTimeStore } from '../stores/timeStore'

export default function TimeDriver() {
  useFrame((_, dt) => useTimeStore.getState().tick(dt))
  return null
}
