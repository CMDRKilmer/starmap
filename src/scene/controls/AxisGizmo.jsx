// 三维坐标轴指示器。
//
// 设计目标：
// 1. 方向：默认 Three.js 约定（X 红 / Y 绿 / Z 蓝），不旋转。
// 2. 大小：屏幕常量大小 —— 不论相机距离（galaxy 50~3000 / system 10~3000），
//    每帧根据相机距离把坐标轴缩放到视野中 ~80px 长。
// 3. 位置：anchor world origin (galaxy 世界中心 / system 恒星处)。
// 4. 文字：使用 drei <Text/> 在每根轴的端点画 X / Y / Z 字符。
//
// GalaxyAxes：放在 galaxy 世界原点 (0,0,0)，坐标系=原始游戏坐标，1 单位 ≈ 1/12 pc。
// SystemAxes：放在 SystemScene 内层 group 的局部原点 (0,0,0)（即恒星处）。
import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { GridHelper, MathUtils } from 'three'
import { Text } from '@react-three/drei'

export const SYSTEM_AXIS_LENGTH = 15
export const GALAXY_GRID_SIZE = 1000
export const GALAXY_GRID_DIVISIONS = 40

// 屏幕常量长度（像素）。fov=60° 时 1 世界单位在距离 d 处的屏幕高度 ≈
//   pxPerUnit = viewportHeight / (2 * d * tan(fov/2))
// 反推 worldLen = TARGET_PX / pxPerUnit
const TARGET_AXIS_PX = 80
const TARGET_GRID_PX = 60

function pxToWorld(camera, px, viewportH) {
  const d = camera.position.length() || 1
  const fovRad = (camera.fov * Math.PI) / 180
  return (px * 2 * d * Math.tan(fovRad / 2)) / viewportH
}

// 让 group 随相机距离保持屏幕常量长度（世界单位）
function useScreenConstantScale(groupRef, targetPx) {
  const { camera, size } = useThree()
  useFrame(() => {
    if (!groupRef.current) return
    const world = pxToWorld(camera, targetPx, size.height)
    if (world > 0) groupRef.current.scale.setScalar(world)
  })
}

function AxisLabels({ size = 1 }) {
  // size 是归一化尺寸 1；实际渲染长度由外层 group 决定（世界单位）
  const offset = size * 1.25
  return (
    <>
      <Text position={[offset, 0, 0]} fontSize={size * 0.45} color="#ff5555" anchorX="center" anchorY="middle">X</Text>
      <Text position={[0, offset, 0]} fontSize={size * 0.45} color="#55ff55" anchorX="center" anchorY="middle">Y</Text>
      <Text position={[0, 0, offset]} fontSize={size * 0.45} color="#5599ff" anchorX="center" anchorY="middle">Z</Text>
    </>
  )
}

export function GalaxyAxes() {
  const axesRef = useRef()
  const gridRef = useRef()
  const labelsRef = useRef()
  useScreenConstantScale(axesRef, TARGET_AXIS_PX)
  useScreenConstantScale(gridRef, TARGET_GRID_PX * 2)
  useScreenConstantScale(labelsRef, TARGET_AXIS_PX)

  // 用 useMemo 缓存 GridHelper，避免每次重渲染都 new 一个
  const grid = useMemo(
    () => new GridHelper(GALAXY_GRID_SIZE, GALAXY_GRID_DIVISIONS, 0x88ccff, 0x1a3a55),
    [],
  )
  useEffect(() => () => grid.dispose?.(), [grid])

  return (
    <>
      <group ref={axesRef}>
        <axesHelper args={[1]} />
      </group>
      <group ref={gridRef}>
        <primitive object={grid} />
      </group>
      <group ref={labelsRef}>
        <AxisLabels size={1} />
      </group>
    </>
  )
}

export function SystemAxes({ length = SYSTEM_AXIS_LENGTH } = {}) {
  const axesRef = useRef()
  const labelsRef = useRef()
  useScreenConstantScale(axesRef, TARGET_AXIS_PX)
  useScreenConstantScale(labelsRef, TARGET_AXIS_PX)

  return (
    <>
      <group ref={axesRef}>
        <axesHelper args={[length]} />
      </group>
      <group ref={labelsRef}>
        <AxisLabels size={length} />
      </group>
    </>
  )
}

// 暴露给窗口尺寸自适应/调试用：弧度转 deg
export function radToDeg(rad) {
  return MathUtils.radToDeg(rad)
}