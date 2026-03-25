import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Text, Line } from '@react-three/drei'
import { useMemo, useState, useRef } from 'react'
import { parseSystems, parseLinks, getSystemFactionColor, getSystemFactionName, getPlanetsBySystem } from './utils/dataParser'
import { groupBySector, getSectorColor } from './utils/sectorCalculator'

const SCALE = 1

function Star({ system, onClick, isSelected, onHover }) {
  const color = getSystemFactionColor(system.SystemId)
  const [hovered, setHovered] = useState(false)

  return (
    <mesh
      position={[system.PositionX / SCALE, system.PositionY / SCALE, system.PositionZ / SCALE]}
      onClick={(e) => {
        e.stopPropagation()
        onClick(system)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        onHover(system)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      <sphereGeometry args={[hovered ? 10.4 : 7.8, 16, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={isSelected ? 1 : 0.9}
      />
      <pointLight
        color={color}
        intensity={isSelected ? 2 : 0.5}
        distance={20}
      />
    </mesh>
  )
}

function SystemLinks({ links, systems }) {
  const systemMap = useMemo(() => {
    const map = {}
    systems.forEach(s => { map[s.NaturalId] = s })
    return map
  }, [systems])

  const lines = useMemo(() => {
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
  }, [links, systemMap])

  return (
    <>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={[line.start, line.end]}
          color="#ffffff"
          lineWidth={2}
          transparent
          opacity={0.6}
        />
      ))}
    </>
  )
}

function SectorBounds({ sectors }) {
  return (
    <>
      {Object.values(sectors).map(sector => {
        const sizeX = (sector.bounds.maxX - sector.bounds.minX) / SCALE
        const sizeY = (sector.bounds.maxY - sector.bounds.minY) / SCALE
        const sizeZ = (sector.bounds.maxZ - sector.bounds.minZ) / SCALE
        const height = sizeZ
        // 使用紧凑半径，基于系统到中心的实际最大距离
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
                opacity={0.15}
                side={2}
                depthWrite={false}
              />
            </mesh>
            <Text
              position={[sector.bounds.centerX / SCALE, centerY, sector.bounds.minZ / SCALE]}
              fontSize={radius * 0.6}
              color="#aaaaaa"
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
}

function GalaxyMap({ onSystemSelect, selectedSystem, hoveredSystem }) {
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
          onHover={hoveredSystem ? (s) => hoveredSystem(s) : () => {}}
        />
      ))}
    </>
  )
}

export default function App() {
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [hoveredSystem, setHoveredSystem] = useState(null)
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
        right: 20,
        width: '280px',
        maxHeight: '80vh',
        overflow: 'auto',
        background: 'rgba(10, 20, 40, 0.9)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '8px',
        padding: '15px',
        fontFamily: 'Roboto Mono, monospace',
        color: '#00ffff'
      }}>
        <h2 style={{
          fontSize: '14px',
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
          fontFamily: 'Orbitron, sans-serif',
          letterSpacing: '1px'
        }}>
          扇区导航 / SECTORS
        </h2>
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {Object.keys(sectors).sort().map(sectorId => (
            <div
              key={sectorId}
              onClick={() => handleSectorClick(sectorId)}
              style={{
                padding: '8px',
                marginBottom: '5px',
                background: 'rgba(0, 255, 255, 0.1)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(0, 255, 255, 0.25)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(0, 255, 255, 0.1)'}
            >
              <span style={{ color: '#88ccff' }}>{sectors[sectorId].name}</span>
              <span style={{ float: 'right', opacity: 0.7 }}>
                {sectors[sectorId].systems.length} 系统
              </span>
            </div>
          ))}
        </div>
      </div>

      {(selectedSystem || hoveredSystem) && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          width: '320px',
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
                <div style={{ maxHeight: '250px', overflow: 'auto', fontSize: '13px' }}>
                  {getPlanetsBySystem(selectedSystem.NaturalId).map((planet, index) => (
                    <div key={index} style={{ 
                      padding: '10px 12px', 
                      marginBottom: '6px',
                      background: 'rgba(0, 255, 255, 0.05)',
                      borderRadius: '4px'
                    }}>
                      <div style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                        {planet.Name}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', opacity: 0.9 }}>
                        <span>重力: {parseFloat(planet.Gravity).toFixed(2)}g</span>
                        <span>温度: {parseFloat(planet.Temperature).toFixed(0)}°C</span>
                        <span>压力: {parseFloat(planet.Pressure).toFixed(2)}</span>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '11px' }}>
                        设施: 
                        {planet.HasLocalMarket && <span style={{ color: '#00FF00', marginRight: '6px', textShadow: '0 0 5px rgba(0,255,0,0.5)' }}>本地市场</span>}
                        {planet.HasChamberOfCommerce && <span style={{ color: '#00FFFF', marginRight: '6px', textShadow: '0 0 5px rgba(0,255,255,0.5)' }}>商会</span>}
                        {planet.HasWarehouse && <span style={{ color: '#FFD700', marginRight: '6px', textShadow: '0 0 5px rgba(255,215,0,0.5)' }}>仓库</span>}
                        {planet.HasAdministrationCenter && <span style={{ color: '#FF00FF', marginRight: '6px', textShadow: '0 0 5px rgba(255,0,255,0.5)' }}>行政中心</span>}
                        {planet.HasShipyard && <span style={{ color: '#FF4500', marginRight: '6px', textShadow: '0 0 5px rgba(255,69,0,0.5)' }}>造船厂</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 空间站信息 */}
            {selectedSystem && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0, 255, 255, 0.3)' }}>
                <div style={{ color: '#88ccff', marginBottom: '8px' }}>空间站 (CX):</div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                  暂无空间站数据
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

      {/* 派系图例 */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 20, 40, 0.9)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '8px',
        padding: '10px 20px',
        fontFamily: 'Roboto Mono, monospace',
        color: '#00ffff',
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', marginRight: '10px' }}>派系:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4CAF50' }}></div>
          <span style={{ fontSize: '10px' }}>IC</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FFEB3B' }}></div>
          <span style={{ fontSize: '10px' }}>CI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2196F3' }}></div>
          <span style={{ fontSize: '10px' }}>NC</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F44336' }}></div>
          <span style={{ fontSize: '10px' }}>AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FFFFFF' }}></div>
          <span style={{ fontSize: '10px' }}>无</span>
        </div>
      </div>
    </div>
  )
}