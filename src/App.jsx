import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useState, useRef, useEffect } from 'react'
import { parseSystems, parseLinks, getSystemFactionColor, getSystemFactionName, getPlanetsBySystem, loadAllData } from './utils/dataParser'
import { loadOrbits } from './bodies/loadOrbits'
import { groupBySector } from './utils/sectorCalculator'
import { useGalaxyStore } from './stores/galaxyStore'
import { useViewStore } from './stores/viewStore'
import TimeDriver from './scene/TimeDriver'
import GalaxyScene from './scene/GalaxyScene'
import CameraTween from './scene/controls/CameraTween'
import AxisGizmoHUD from './scene/controls/AxisGizmoHUD'
import PlanetSearch from './components/PlanetSearch'
import SectorNav from './components/SectorNav'
import Legend from './components/Legend'
import PlanetCard from './components/PlanetCard'
import SystemPage from './pages/SystemPage'

const SCALE = 1

export default function App() {
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [hoveredSystem, setHoveredSystem] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchedSystems, setSearchedSystems] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [dataReady, setDataReady] = useState(false)
  const controlsRef = useRef()

  const mode = useViewStore((s) => s.mode)

  useEffect(() => {
    async function init() {
      console.log('[App] Loading data from GitHub...')
      await Promise.all([loadAllData(), loadOrbits(), useGalaxyStore.getState().init()])
      setDataReady(true)
      setIsLoading(false)
      console.log('[App] Data loaded successfully')
    }
    init()
  }, [])

  // Esc 返回上一级视图（planet → system → galaxy）
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') useViewStore.getState().back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleSystemSelect = (system) => {
    setSelectedSystem(system)
  }

  const handleHover = (system) => {
    setHoveredSystem(system)
  }

  const systems = useMemo(() => {
    if (!dataReady) return []
    return parseSystems()
  }, [dataReady])

  const links = useMemo(() => {
    if (!dataReady) return []
    return parseLinks()
  }, [dataReady])

  const sectors = useMemo(() => {
    if (!dataReady) return {}
    return groupBySector(systems)
  }, [systems, dataReady])

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

  // 搜索结果点击 → 下钻到该星系
  const handleSearchSelect = (systemId) => {
    useViewStore.getState().goToStar(systemId)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f', position: 'relative' }}>
      {mode === 'galaxy' ? (
        <>
          <Canvas
            camera={{ position: [0, 0, 800], fov: 60, near: 0.1, far: 10000 }}
            gl={{ antialias: true }}
            onCreated={(state) => {
              // DEV 调试用：window.__scene / window.__cam
              if (import.meta.env.DEV) {
                window.__scene = state.scene
                window.__cam = state.camera
              }
            }}
          >
            <TimeDriver />
            <GalaxyScene
              onSystemSelect={handleSystemSelect}
              selectedSystem={selectedSystem}
              hoveredSystem={handleHover}
              searchedSystems={searchedSystems}
              systems={systems}
              links={links}
              sectors={sectors}
              isLoading={isLoading}
            />
            <CameraTween controlsRef={controlsRef} />
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
              {isLoading ? '正在从 GitHub 加载数据...' : '拖拽旋转 · 滚轮缩放 · 右键平移 · 双击恒星下钻 · Esc 返回'}
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
                setIsSearching(false)
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
              onSelect={handleSearchSelect}
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
                    color: getSystemFactionColor(selectedSystem || hoveredSystem),
                    fontWeight: 'bold'
                  }}>
                    {getSystemFactionName(selectedSystem || hoveredSystem)}
                  </span>
                </div>

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
            bottom: 28,
            right: 150,
            fontSize: '10px',
            opacity: 0.5,
            fontFamily: 'Roboto Mono, monospace',
            textAlign: 'right'
          }}>
            {isLoading ? '加载中...' : `系统数量: ${systems.length} | 连接数: ${links.length}`}
          </div>

          <AxisGizmoHUD controlsRef={controlsRef} />

          <Legend />
        </>
      ) : (
        <SystemPage />
      )}
    </div>
  )
}
