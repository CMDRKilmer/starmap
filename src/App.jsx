import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Text, Line } from '@react-three/drei'
import { useMemo, useState, useRef, memo, useCallback, useEffect } from 'react'
import { parseSystems, parseLinks, getSystemFactionColor, getSystemFactionName, getPlanetsBySystem } from './utils/dataParser'
import { groupBySector, getSectorColor } from './utils/sectorCalculator'
import { FACTION_COLORS, UI_THEME } from './utils/colors'
import PlanetSearch from './components/PlanetSearch'
import SectorNav from './components/SectorNav'
import Legend from './components/Legend'
import PlanetCard from './components/PlanetCard'

const SCALE = 1

const Star = memo(function Star({ system, onClick, isSelected, onHover, isSearched }) {
  const color = useMemo(() => getSystemFactionColor(system.SystemId), [system.SystemId])
  const position = useMemo(() => [
    system.PositionX / SCALE,
    system.PositionY / SCALE,
    system.PositionZ / SCALE
  ], [system.PositionX, system.PositionY, system.PositionZ])

  const radius = useMemo(() => isSearched ? 12 : (isSelected ? 10.4 : 7.8), [isSearched, isSelected])
  const lightColor = isSearched ? '#FF00FF' : color
  const intensity = isSearched ? 3 : (isSelected ? 2 : 0.5)

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onClick(system)
  }, [onClick, system])

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation()
    onHover(system)
    document.body.style.cursor = 'pointer'
  }, [onHover, system])

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
      position={position}
      onClick={handleClick}
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

const SystemLinks = memo(function SystemLinks({ links, systems }) {
  const lines = useMemo(() => {
    const systemMap = {}
    systems.forEach(s => { systemMap[s.NaturalId] = s })

    return links.map((link, i) => {
      const from = systemMap[link.Left]
      const to = systemMap[link.Right]
      if (!from || !to) return null

      return {
        key: i,
        start: [from.PositionX / SCALE, from.PositionY / SCALE, from.PositionZ / SCALE],
        end: [to.PositionX / SCALE, to.PositionY / SCALE, to.PositionZ / SCALE]
      }
    }).filter(Boolean)
  }, [links, systems])

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
      {Object.values(sectors).map(sector => {
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

function GalaxyMap({ onSystemSelect, selectedSystem, hoveredSystem, searchedSystems }) {
  const systems = useMemo(() => parseSystems(), [])
  const links = useMemo(() => parseLinks(), [])
  const sectors = useMemo(() => groupBySector(systems), [systems])

  return (
    <>
      <Stars radius={5000} depth={100} count={10000} factor={10} saturation={0} fade speed={1} />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={0.2} color="#ffffff" />

      <SectorBounds sectors={sectors} />
      <SystemLinks links={links} systems={systems} />

      {systems.map((system) => (
        <Star
          key={system.NaturalId}
          system={system}
          onClick={onSystemSelect}
          isSelected={selectedSystem?.NaturalId === system.NaturalId}
          isSearched={searchedSystems?.has(system.NaturalId) || false}
          onHover={hoveredSystem ? (s) => hoveredSystem(s) : () => {}}
        />
      ))}
    </>
  )
}

export default function App() {
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [hoveredSystem, setHoveredSystem] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchedSystems, setSearchedSystems] = useState(new Set())
  const controlsRef = useRef()

  const handleSystemSelect = (system) => {
    setSelectedSystem(system)
  }

  const handleHover = (system) => {
    setHoveredSystem(system)
  }

  const sectors = useMemo(() => {
    const systems = parseSystems()
    return groupBySector(systems)
  }, [])

  const handleSectorClick = (sectorId) => {
    const sector = sectors[sectorId]
    if (sector && controlsRef.current) {
      controlsRef.current.target.set(
        sector.bounds.centerX / SCALE,
        sector.bounds.centerY / SCALE,
        sector.bounds.centerZ / SCALE
      )
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 800], fov: 60, near: 0.1, far: 10000 }}
        gl={{ antialias: true }}
      >
        <GalaxyMap
          onSystemSelect={handleSystemSelect}
          selectedSystem={selectedSystem}
          hoveredSystem={handleHover}
          searchedSystems={searchedSystems}
        />
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={50}
          maxDistance={3000}
        />
      </Canvas>

      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        fontFamily: 'Orbitron, sans-serif',
        color: '#00ffff',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px', letterSpacing: '2px' }}>
          ★ 星系地图 / STAR MAP
        </h1>
        <p style={{ fontSize: '12px', opacity: 0.7, fontFamily: 'Roboto Mono, monospace' }}>
          拖拽旋转 · 滚轮缩放 · 右键平移 · 点击查看详情
        </p>
      </div>
      
      <div style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100
      }}>
        <PlanetSearch
          onSearch={(result) => {
            setSearchResults(result)
            setIsSearching(false)
            // 更新搜索到的系统集合
            const systemIds = new Set()
            if (result?.results) {
              result.results.forEach(item => {
                if (item.NaturalId) {
                  systemIds.add(item.NaturalId)
                }
              })
            }
            setSearchedSystems(systemIds)
          }}
          isSearching={isSearching}
        />
      </div>

      <SectorNav
        sectors={sectors}
        onSectorClick={handleSectorClick}
      />

      {(selectedSystem || hoveredSystem) && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          width: '420px',
          background: 'rgba(10, 20, 40, 0.95)',
          border: '1px solid rgba(0, 255, 255, 0.5)',
          borderRadius: '8px',
          padding: '20px',
          fontFamily: 'Roboto Mono, monospace',
          color: '#00ffff',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)'
        }}>
          <h3 style={{
            fontSize: '18px',
            marginBottom: '15px',
            fontFamily: 'Orbitron, sans-serif',
            color: '#ffffff'
          }}>
            {(selectedSystem || hoveredSystem).Name}
          </h3>
          <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
            <div><span style={{ color: '#88ccff' }}>类型:</span> {(selectedSystem || hoveredSystem).Type}型星</div>
            <div><span style={{ color: '#88ccff' }}>ID:</span> {(selectedSystem || hoveredSystem).NaturalId}</div>
            <div>
              <span style={{ color: '#88ccff' }}>派系:</span>
              <span style={{ 
                color: getSystemFactionColor((selectedSystem || hoveredSystem).SystemId),
                fontWeight: 'bold'
              }}>
                {getSystemFactionName((selectedSystem || hoveredSystem).SystemId)}
              </span>
            </div>
            
            {/* 星球列表 */}
            {selectedSystem && (
              <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid rgba(0, 255, 255, 0.3)' }}>
                <div style={{ color: '#88ccff', marginBottom: '8px' }}>星球 ({getPlanetsBySystem(selectedSystem.NaturalId).length}个):</div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden', fontSize: '13px' }}>
                  {getPlanetsBySystem(selectedSystem.NaturalId).map((planet, index) => (
                    <PlanetCard key={index} planet={planet} />
                  ))}
                </div>
              </div>
            )}

          </div>
          {selectedSystem && (
            <div style={{
              marginTop: '15px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(0, 255, 255, 0.3)',
              fontSize: '10px',
              opacity: 0.7
            }}>
              点击扇区导航可飞转到其他位置
            </div>
          )}
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        fontSize: '10px',
        opacity: 0.5,
        fontFamily: 'Roboto Mono, monospace'
      }}>
        系统数量: {parseSystems().length} | 连接数: {parseLinks().length}
      </div>

      <Legend />
    </div>
  )
}