// 单星系轨道环（M2）：单 BufferGeometry LineSegments，每条轨道 128 段采样一次并缓存。
// 采样方式：平近点角 0→2π 均匀（轨道形状仅依赖根数，不随播放时间变化）。
// radii 提供时改为等间距圆轨道（显示层：忽略真实半长轴，按序号均匀分布）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { predictPositionKm } from '../../orbit/gameModel.js'
import { GAME_G } from '../../orbit/constants.js'

const SEGMENTS = 128

export default function OrbitRing({ orbits, scale, radii }) {
  const geometry = useMemo(() => {
    const positions = []
    const colors = []
    const color = orbits[0]?.color ?? [0.29, 0.66, 1]
    if (radii) {
      // 等间距圆轨道（x-y 平面）
      for (const r of radii) {
        for (let i = 0; i < SEGMENTS; i++) {
          const a1 = (2 * Math.PI * i) / SEGMENTS
          const a2 = (2 * Math.PI * (i + 1)) / SEGMENTS
          positions.push(r * Math.cos(a1), r * Math.sin(a1), 0)
          positions.push(r * Math.cos(a2), r * Math.sin(a2), 0)
          colors.push(...color, ...color)
        }
      }
    } else {
      for (const { orbit, massKg, color: oColor } of orbits) {
        if (!massKg || massKg <= 0) continue
        const n = Math.sqrt((GAME_G * massKg) / Math.pow(orbit.semiMajorAxis, 3))
        const T = (2 * Math.PI) / n
        const pts = []
        for (let i = 0; i <= SEGMENTS; i++) {
          const p = predictPositionKm(orbit, massKg, (T * i) / SEGMENTS)
          pts.push(p)
        }
        for (let i = 0; i < SEGMENTS; i++) {
          positions.push(pts[i].x / scale, pts[i].y / scale, pts[i].z / scale)
          positions.push(pts[i + 1].x / scale, pts[i + 1].y / scale, pts[i + 1].z / scale)
          colors.push(...oColor, ...oColor)
        }
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geo
  }, [orbits, scale, radii])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.35} />
    </lineSegments>
  )
}
