// 相机缓动（M2）：mode / 焦点切换时，把相机位置与 OrbitControls.target
// 从当前值缓动到目标值（不 teleport）。坐标系统一为 galaxy 世界坐标
// （SystemScene 以 <group position={恒星坐标}> 渲染），因此过渡平滑。
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useViewStore } from '../../stores/viewStore'
import { useGalaxyStore } from '../../stores/galaxyStore'
import { SYSTEM_VIEW_MAX_RADIUS } from '../SystemScene'

const DURATION = 1.2
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)

export default function CameraTween({ controlsRef }) {
  const mode = useViewStore((s) => s.mode)
  const focusedStarId = useViewStore((s) => s.focusedStarId)
  const camera = useThree((s) => s.camera)
  const tweenRef = useRef(null)

  useEffect(() => {
    const view = useViewStore.getState()
    let endPos
    let endTarget
    if (view.mode === 'system') {
      const star = useGalaxyStore.getState().getStar(view.focusedStarId)
      if (!star) return
      // 相机距离 = 最远轨道显示半径 × 1.2（SystemScene 内行星已按 posKm/scale
      // 缩放渲染，最远轨道即 SYSTEM_VIEW_MAX_RADIUS 单位，故无需再乘 scale）。
      // 初始视角从 +Y 轴向下俯视行星盘面（之前是 +Z 方向斜视）。
      const dist = SYSTEM_VIEW_MAX_RADIUS * 1.2
      endTarget = new THREE.Vector3(star.position[0], star.position[1], star.position[2])
      // 略微偏离纯 +Y 方向（加入 +Z 偏移），避免 OrbitControls.up 与视线共线
      endPos = new THREE.Vector3(star.position[0], star.position[1] + dist, star.position[2] + dist * 0.15)
    } else {
      endTarget = new THREE.Vector3(0, 0, 0)
      endPos = new THREE.Vector3(0, 0, 800)
    }
    tweenRef.current = {
      startPos: camera.position.clone(),
      endPos,
      startTarget: controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(),
      endTarget,
      elapsed: 0,
    }
  }, [mode, focusedStarId, camera, controlsRef])

  useFrame((_, dt) => {
    const tween = tweenRef.current
    if (!tween) return
    tween.elapsed += dt
    const t = easeInOut(Math.min(1, tween.elapsed / DURATION))
    camera.position.lerpVectors(tween.startPos, tween.endPos, t)
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(tween.startTarget, tween.endTarget, t)
      controlsRef.current.update()
    }
    if (t >= 1) tweenRef.current = null
  })

  return null
}
