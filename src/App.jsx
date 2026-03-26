import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Text, Line } from '@react-three/drei'
import { useMemo, useState, useRef } from 'react'
import { parseSystems, parseLinks, getSystemFactionColor, getSystemFactionName, getPlanetsBySystem, FACTION_COLORS } from './utils/dataParser'
import { groupBySector, getSectorColor } from './utils/sectorCalculator'
import PlanetSearch from './components/PlanetSearch'

// 根据环境参数值获取颜色
function getEnvColor(value, normalValue, lowThreshold, highThreshold) {
  if (value > highThreshold) return '#FF4500' // 高值红色
  if (value < lowThreshold) return '#1E90FF' // 低值蓝色
  return '#32CD32' // 正常值绿色
}

const SCALE = 1

function Star({ system, onClick, isSelected, onHover, isSearched }) {
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
      <sphereGeometry args={[isSearched ? 12 : (hovered ? 10.4 : 7.8), 16, 16]} />
      <meshBasicMaterial
        color={isSearched ? '#FF00FF' : color}
        transparent
        opacity={isSelected || isSearched ? 1 : 0.9}
      />
      <pointLight
        color={isSearched ? '#FF00FF' : color}
        intensity={isSearched ? 3 : (isSelected ? 2 : 0.5)}
        distance={isSearched ? 30 : 20}
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
        top: 25,
        left: 20,
        right: 20,
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
                    <div key={index} style={{ 
                      padding: '20px 22px', 
                      marginBottom: '12px',
                      background: 'rgba(0, 255, 255, 0.05)',
                      borderRadius: '6px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
                        {planet.Name}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', opacity: 0.9, fontSize: '14px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#FFFFFF' }}>重力: <span style={{ color: getEnvColor(parseFloat(planet.Gravity), 1, 0.5, 1.5) }}>{parseFloat(planet.Gravity).toFixed(2)}g</span></span>
                        <span style={{ color: '#FFFFFF' }}>温度: <span style={{ color: getEnvColor(parseFloat(planet.Temperature), 20, -50, 50) }}>{parseFloat(planet.Temperature).toFixed(0)}°C</span></span>
                        <span style={{ color: '#FFFFFF' }}>压力: <span style={{ color: getEnvColor(parseFloat(planet.Pressure), 1, 0.1, 2) }}>{parseFloat(planet.Pressure).toFixed(2)}</span></span>
                        {planet.Fertility && planet.Fertility !== '-1' && (
                          <span style={{ color: '#FFFFFF' }}>肥沃度: <span style={{ color: getEnvColor(parseFloat(planet.Fertility), 0, -0.5, 0.5) }}>{parseFloat(planet.Fertility).toFixed(2)}</span></span>
                        )}
                        {planet.Surface && (
                          <span style={{ color: '#FFFFFF' }}>类型: <span style={{ color: planet.Surface === 'True' ? '#FFA500' : '#87CEEB' }}>{planet.Surface === 'True' ? '岩质' : '气态'}</span></span>
                        )}
                        {/* COGC 信息已注释掉 */}
                        {/* {planet.COGCStatus && (
                          <span style={{ color: '#FFFFFF' }}>COGC: <span style={{ color: '#00FFFF' }}>{planet.COGCStatus}</span></span>
                        )}
                        {planet.COGCCategory && (
                          <span style={{ color: '#FFFFFF' }}>类别: <span style={{ color: '#00FFFF' }}>{planet.COGCCategory}</span></span>
                        )} */}
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ color: '#FFFFFF' }}>设施: </span>
                        {planet.HasLocalMarket && <span style={{ color: '#FFFFFF', textShadow: '0 0 5px rgba(255,255,255,0.5)' }}>本地市场</span>}
                        {planet.HasChamberOfCommerce && <span style={{ color: '#FFFFFF', textShadow: '0 0 5px rgba(255,255,255,0.5)' }}>商会</span>}
                        {planet.HasWarehouse && <span style={{ color: '#FFFFFF', textShadow: '0 0 5px rgba(255,255,255,0.5)' }}>仓库</span>}
                        {planet.HasAdministrationCenter && <span style={{ color: '#FFFFFF', textShadow: '0 0 5px rgba(255,255,255,0.5)' }}>行政中心</span>}
                        {planet.HasShipyard && <span style={{ color: '#FFFFFF', textShadow: '0 0 5px rgba(255,255,255,0.5)' }}>造船厂</span>}
                      </div>
                      {planet.Resources && planet.Resources.length > 0 && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(0, 255, 255, 0.3)' }}>
                          <div style={{ color: '#88ccff', marginBottom: '8px', fontSize: '13px' }}>矿产:</div>
                          <div style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
                            {planet.Resources.map((resource, index) => (
                              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                  <span style={{ color: '#FFFFFF' }}>{resource.Ticker} ({resource.Type})</span>
                                  <span style={{ color: '#FFFFFF' }}>{(resource.Factor * 100).toFixed(1)}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(0, 255, 255, 0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div 
                                    style={{
                                      width: `${Math.min(resource.Factor * 100, 100)}%`, 
                                      height: '100%', 
                                      background: '#00FFFF',
                                      borderRadius: '3px'
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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

      {/* 图例 */}
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
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* 派系图例 */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', opacity: 0.7 }}>派系</span>
          {Object.entries(FACTION_COLORS).map(([code, color]) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 4px ${color}` }}></div>
              <span style={{ fontSize: '9px' }}>{code}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FFFFFF' }}></div>
            <span style={{ fontSize: '9px' }}>无</span>
          </div>
        </div>

        {/* 分隔线 */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(0, 255, 255, 0.3)' }}></div>

        {/* 搜索结果图例 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', opacity: 0.7 }}>搜索结果</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FF00FF', boxShadow: '0 0 6px #FF00FF' }}></div>
            <span style={{ fontSize: '9px', color: '#FF00FF' }}>匹配</span>
          </div>
        </div>
      </div>
    </div>
  )
}