// 星系视图行星层（M1）：InstancedMesh 渲染全部行星。
// 行星轨道坐标（km，来自 galaxyStore.currentBodiesAt）按游戏坐标单位缩放，
// 叠加到所属恒星位置。星系视图下行星轨道（~1e7~1e9 km）远小于恒星间距
// （1 坐标单位 ≈ 2.57e12 km），故对显示半径做 clamp（方向真实、内部分布
// 相对精确）；M2 行星系视图将按 1:1 真实比例渲染。
import { useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { KM_PER_UNIT } from '../../orbit/constants.js'

const MIN_DISPLAY_RADIUS = 0.5 // 坐标单位
const MAX_DISPLAY_RADIUS = 8

function displayOffset(posKm) {
  const unit = { x: posKm.x / KM_PER_UNIT, y: posKm.y / KM_PER_UNIT, z: posKm.z / KM_PER_UNIT }
  const len = Math.hypot(unit.x, unit.y, unit.z)
  if (len < 1e-12) return unit
  const clamped = Math.min(MAX_DISPLAY_RADIUS, Math.max(MIN_DISPLAY_RADIUS, len))
  const f = clamped / len
  return { x: unit.x * f, y: unit.y * f, z: unit.z * f }
}

export default function PlanetLayer({ bodies, starPositions }) {
  const meshRef = useRef()

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    bodies.forEach((b, i) => {
      const star = starPositions.get(b.systemId)
      if (!star) {
        matrix.makeTranslation(0, 0, 0)
      } else {
        const off = displayOffset(b.posKm)
        matrix.makeTranslation(star[0] + off.x, star[1] + off.y, star[2] + off.z)
      }
      mesh.setMatrixAt(i, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [bodies, starPositions])

  return (
    <instancedMesh ref={meshRef} args={[null, null, bodies.length]} frustumCulled={false}>
      <sphereGeometry args={[0.35, 8, 8]} />
      <meshBasicMaterial color="#4aa8ff" transparent opacity={0.85} />
    </instancedMesh>
  )
}
