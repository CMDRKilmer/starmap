// 恒星点（从原 App.jsx 抽出，M1）。
// position 由 galaxyStore 提供（[x, y, z]），fallback 到 system 原始坐标。
// radiusOverride / colorOverride：行星系视图按真实数据（质量/光谱）覆盖默认外观。
import { memo, useMemo, useCallback, useEffect } from 'react'
import { getSystemFactionColor } from '../../utils/dataParser'

const Star = memo(function Star({ system, position, onClick, onDoubleClick, isSelected, onHover, isSearched, radiusOverride, colorOverride }) {
  const color = useMemo(
    () => colorOverride ?? getSystemFactionColor(system),
    [colorOverride, system],
  )
  const pos = useMemo(
    () => position ?? [system.PositionX, system.PositionY, system.PositionZ],
    [position, system.PositionX, system.PositionY, system.PositionZ],
  )

  const radius = useMemo(
    () => radiusOverride ?? (isSearched ? 12 : isSelected ? 10.4 : 7.8),
    [radiusOverride, isSearched, isSelected],
  )
  const lightColor = isSearched ? '#FF00FF' : color
  const intensity = isSearched ? 3 : isSelected ? 2 : 0.5

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      onClick?.(system)
    },
    [onClick, system],
  )

  const handleDoubleClick = useCallback(
    (e) => {
      e.stopPropagation()
      onDoubleClick?.(system)
    },
    [onDoubleClick, system],
  )

  const handlePointerOver = useCallback(
    (e) => {
      e.stopPropagation()
      onHover(system)
      document.body.style.cursor = 'pointer'
    },
    [onHover, system],
  )

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'auto'
  }, [])

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [])

  return (
    <mesh
      position={pos}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[radius, 12, 12]} />
      <meshBasicMaterial
        color={lightColor}
        transparent
        opacity={isSelected || isSearched ? 1 : 0.9}
      />
      <pointLight
        color={lightColor}
        intensity={intensity}
        distance={isSearched ? 30 : 20}
      />
    </mesh>
  )
})

export default Star
