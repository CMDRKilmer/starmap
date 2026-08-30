// 星系视图场景（M1）：恒星点 + 连接线 + 扇区边界 + 行星层。
// 恒星位置由 galaxyStore 提供；行星位置由 currentBodiesAt(gameTimeSec) 计算。
import { useMemo } from 'react'
import { Stars, Line, Text } from '@react-three/drei'
import { memo } from 'react'
import { useGalaxyStore } from '../stores/galaxyStore'
import { useViewStore } from '../stores/viewStore'
import { useTimeStore } from '../stores/timeStore'
import { getSectorColor } from '../utils/sectorCalculator'
import Star from './bodies/Star'
import PlanetLayer from './bodies/Planet'

const SCALE = 1

const SystemLinks = memo(function SystemLinks({ links, systems, starPositions }) {
  const lines = useMemo(() => {
    return links.map((link, i) => {
      const from = systems.find((s) => s.NaturalId === link.Left)
      const to = systems.find((s) => s.NaturalId === link.Right)
      if (!from || !to) return null
      const start = starPositions.get(from.NaturalId) ?? [from.PositionX / SCALE, from.PositionY / SCALE, from.PositionZ / SCALE]
      const end = starPositions.get(to.NaturalId) ?? [to.PositionX / SCALE, to.PositionY / SCALE, to.PositionZ / SCALE]
      return { key: i, start, end }
    }).filter(Boolean)
  }, [links, systems, starPositions])

  return (
    <>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={[line.start, line.end]}
          color="#ffffff"
          lineWidth={1}
          transparent
          opacity={0.4}
        />
      ))}
    </>
  )
})

const SectorBounds = memo(function SectorBounds({ sectors }) {
  return (
    <>
      {Object.values(sectors).map((sector) => {
        const sizeX = (sector.bounds.maxX - sector.bounds.minX) / SCALE
        const sizeY = (sector.bounds.maxY - sector.bounds.minY) / SCALE
        const sizeZ = (sector.bounds.maxZ - sector.bounds.minZ) / SCALE
        const height = sizeZ
        const radius = (sector.bounds.compactRadius || Math.sqrt(sizeX * sizeX + sizeY * sizeY) / 2) * 1.1 / SCALE
        const centerY = sector.bounds.centerY / SCALE

        return (
          <group key={sector.id}>
            <mesh
              position={[sector.bounds.centerX / SCALE, centerY, sector.bounds.centerZ / SCALE]}
              rotation={[Math.PI / 2, Math.PI / 6, 0]}
            >
              <cylinderGeometry args={[radius, radius, height, 6]} />
              <meshBasicMaterial
                color={getSectorColor(sector.id)}
                transparent
                opacity={0.1}
                side={2}
                depthWrite={false}
              />
            </mesh>
            <Text
              position={[sector.bounds.centerX / SCALE, centerY, sector.bounds.minZ / SCALE]}
              fontSize={radius * 0.5}
              color="#666666"
              anchorX="center"
              anchorY="middle"
              billboard
            >
              {sector.name}
            </Text>
          </group>
        )
      })}
    </>
  )
})

export default function GalaxyScene({
  systems, links, sectors, onSystemSelect, selectedSystem, hoveredSystem, searchedSystems, isLoading,
}) {
  const stars = useGalaxyStore((s) => s.stars)
  const planets = useGalaxyStore((s) => s.planets)
  const loaded = useGalaxyStore((s) => s.loaded)
  const currentGameTime = useTimeStore((s) => s.currentGameTime)

  const starPositions = useMemo(() => new Map(stars.map((s) => [s.systemId, s.position])), [stars])

  const bodies = useMemo(() => {
    if (!loaded || !planets.length) return []
    return useGalaxyStore.getState().currentBodiesAt(currentGameTime)
  }, [loaded, planets.length, currentGameTime])

  if (isLoading) {
    return (
      <mesh>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial color="#00ffff" wireframe />
      </mesh>
    )
  }

  return (
    <>
      <Stars radius={5000} depth={100} count={10000} factor={10} saturation={0} fade speed={1} />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={0.2} color="#ffffff" />

      <SectorBounds sectors={sectors} />
      <SystemLinks links={links} systems={systems} starPositions={starPositions} />

      {systems.map((system) => (
        <Star
          key={system.NaturalId}
          system={system}
          position={starPositions.get(system.NaturalId)}
          onClick={onSystemSelect}
          isSelected={selectedSystem?.NaturalId === system.NaturalId}
          isSearched={searchedSystems?.has(system.NaturalId) || false}
          onHover={hoveredSystem ? (s) => hoveredSystem(s) : () => {}}
          onDoubleClick={() => useViewStore.getState().goToStar(system.NaturalId)}
        />
      ))}

      <PlanetLayer bodies={bodies} starPositions={starPositions} />
    </>
  )
}
