// 行星系视图独立页面（M2）：只渲染当前聚焦恒星的天体（恒星/行星/轨道环/空间站）。
// 与星系页各自独立 Canvas：点击行星显示信息面板，Esc / 返回按钮回到星系图。
import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useViewStore } from '../stores/viewStore'
import { useGalaxyStore } from '../stores/galaxyStore'
import { useTimeStore } from '../stores/timeStore'
import { getOrbitData } from '../bodies/loadOrbits'
import { UI_THEME } from '../utils/colors'
import { gameSecToUnixMs } from '../orbit/time.js'
import { findConjunctions } from '../orbit/conjunction.js'
import TimeDriver from '../scene/TimeDriver'
import SystemScene from '../scene/SystemScene'
import CameraTween from '../scene/controls/CameraTween'
import TimeBar from '../hud/TimeBar'

// 行星信息面板（点击行星显示）
function PlanetInfoPanel({ info, onClose }) {
  const { name, id, radiusKm, tempC, gravity, pressure, fertility, isGas, isTripleGreen } = info
  const typeLabel = isTripleGreen ? '三绿行星' : isGas ? '气态行星' : '类地行星'
  const typeColor = isTripleGreen ? '#4ade80' : isGas ? '#ff9a6f' : '#9fd8ff'
  const row = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '11px', padding: '3px 0' }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ color: '#e8f4ff', fontFamily: 'Roboto Mono, monospace' }}>{value ?? '—'}</span>
    </div>
  )
  return (
    <div style={{
      position: 'absolute',
      left: 20,
      bottom: 100,
      width: '240px',
      background: 'rgba(8, 16, 32, 0.95)',
      border: `1px solid ${UI_THEME.border}`,
      borderRadius: '8px',
      padding: '14px 16px',
      color: '#e8f4ff',
      fontFamily: 'Roboto Mono, monospace',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 'bold' }}>{name}</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: UI_THEME.primary,
            cursor: 'pointer',
            fontSize: '13px',
            padding: '0 2px',
          }}
          title="关闭"
        >
          ✕
        </button>
      </div>
      <div style={{ fontSize: '10px', color: typeColor, marginBottom: '8px' }}>{typeLabel}</div>
      <div style={{ borderTop: `1px solid ${UI_THEME.border}`, paddingTop: '6px' }}>
        {row('编号', id)}
        {row('半径', radiusKm ? `${radiusKm.toLocaleString()} km` : '—')}
        {row('温度', tempC != null ? `${tempC.toFixed(1)} °C` : '—')}
        {row('重力', gravity != null ? `${gravity.toFixed(2)} g` : '—')}
        {row('压力', pressure != null ? `${pressure.toFixed(3)} atm` : '—')}
        {row('肥沃度', fertility)}
      </div>
    </div>
  )
}

// ── 交汇窗口面板（M2.5）：选两颗行星，展示未来 90 天内相对距离最小的会合时刻 ──
const CONJUNCTION_HORIZON_DAYS = 90

// 别名表（模块级缓存：NaturalId 大写 → Name）
let nameMapCache = null
function loadNameMap() {
  if (!nameMapCache) {
    nameMapCache = fetch('data/csv_systemplanets.csv')
      .then((r) => r.text())
      .then((text) => {
        const map = new Map()
        text.split('\n')
          .slice(1)
          .forEach((line) => {
            const i = line.indexOf(',')
            if (i > 0) map.set(line.slice(0, i).toUpperCase(), line.slice(i + 1))
          })
        return map
      })
  }
  return nameMapCache
}

function formatDistKm(km) {
  if (km >= 1e8) return `${(km / 1e8).toFixed(2)} 亿 km`
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)} 百万 km`
  if (km >= 1e4) return `${(km / 1e4).toFixed(1)} 万 km`
  return `${Math.round(km).toLocaleString()} km`
}

function formatGameTime(sec) {
  const d = new Date(gameSecToUnixMs(sec))
  const p = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function ConjunctionPanel({ bodies, starMassKg, onSelectWindow }) {
  const [fromId, setFromId] = useState(bodies[0]?.naturalId ?? '')
  const [toId, setToId] = useState(bodies[1]?.naturalId ?? bodies[0]?.naturalId ?? '')
  const [selectedTime, setSelectedTime] = useState(null)
  const [nameMap, setNameMap] = useState(null)
  // 基准时间 = 面板挂载时的游戏时间（快照，不随播放变动）
  const baseTimeRef = useRef(useTimeStore.getState().currentGameTime)

  useEffect(() => {
    let alive = true
    loadNameMap().then((m) => alive && setNameMap(m))
    return () => {
      alive = false
    }
  }, [])

  // 切换恒星时重置默认选择（最内两轨）
  useEffect(() => {
    setFromId(bodies[0]?.naturalId ?? '')
    setToId(bodies[1]?.naturalId ?? bodies[0]?.naturalId ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies])

  // 更换出发/目标天体时清除已选中的窗口与 3D 标记
  useEffect(() => {
    setSelectedTime(null)
    onSelectWindow?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId, toId])

  const orbitA = bodies.find((p) => p.naturalId === fromId)?.orbit
  const orbitB = bodies.find((p) => p.naturalId === toId)?.orbit

  const windows = useMemo(() => {
    if (!orbitA || !orbitB || !starMassKg || fromId === toId) return []
    return findConjunctions(orbitA, orbitB, starMassKg, baseTimeRef.current, CONJUNCTION_HORIZON_DAYS * 86400)
  }, [orbitA, orbitB, starMassKg, fromId, toId])

  const pickWindow = (w) => {
    const next = selectedTime === w.timeSec ? null : w.timeSec
    setSelectedTime(next)
    const bodyA = bodies.find((p) => p.naturalId === fromId)
    const bodyB = bodies.find((p) => p.naturalId === toId)
    onSelectWindow?.(
      next == null || !bodyA || !bodyB
        ? null
        : { timeSec: w.timeSec, idA: bodyA.naturalId, isStationA: bodyA.isStation, idB: bodyB.naturalId, isStationB: bodyB.isStation },
    )
  }

  const nameOf = (id) => nameMap?.get(id) || id
  const optionLabel = (b) => (b.isStation ? `${b.naturalId}（空间站）` : `${nameOf(b.naturalId)}（${b.naturalId}）`)
  const panelStyle = {
    position: 'absolute',
    top: 80,
    right: 20,
    width: '250px',
    background: 'rgba(8, 16, 32, 0.95)',
    border: `1px solid ${UI_THEME.border}`,
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#e8f4ff',
    fontFamily: 'Roboto Mono, monospace',
    zIndex: 10,
  }
  const selectStyle = {
    width: '100%',
    background: '#0a1428',
    color: '#e8f4ff',
    border: `1px solid ${UI_THEME.border}`,
    borderRadius: '4px',
    padding: '4px 6px',
    fontFamily: 'Roboto Mono, monospace',
    fontSize: '11px',
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 'bold' }}>交汇窗口</span>
        <span style={{ fontSize: '10px', opacity: 0.5 }}>未来 {CONJUNCTION_HORIZON_DAYS} 天</span>
      </div>
      {bodies.length < 2 ? (
        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '8px' }}>该星系不足 2 个运动天体，无法计算会合</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
            <div>
              <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '2px' }}>出发天体</div>
              <select value={fromId} onChange={(e) => setFromId(e.target.value)} style={selectStyle}>
                {bodies.map((b) => (
                  <option key={b.naturalId} value={b.naturalId}>
                    {optionLabel(b)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '2px' }}>目标天体</div>
              <select value={toId} onChange={(e) => setToId(e.target.value)} style={selectStyle}>
                {bodies.map((b) => (
                  <option key={b.naturalId} value={b.naturalId}>
                    {optionLabel(b)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${UI_THEME.border}`, paddingTop: '6px' }}>
            {fromId === toId ? (
              <div style={{ fontSize: '11px', opacity: 0.6 }}>出发与目标天体相同</div>
            ) : windows.length === 0 ? (
              <div style={{ fontSize: '11px', opacity: 0.6 }}>
                {CONJUNCTION_HORIZON_DAYS} 天内无会合（周期相近或数据缺失）
              </div>
            ) : (
              windows.map((w, i) => {
                const days = (w.timeSec - baseTimeRef.current) / 86400
                const active = selectedTime === w.timeSec
                return (
                  <div
                    key={w.timeSec}
                    onClick={() => pickWindow(w)}
                    style={{
                      padding: '4px 6px',
                      margin: '0 -6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: active ? 'rgba(0, 255, 255, 0.12)' : 'transparent',
                      borderLeft: active ? '2px solid #00ffff' : '2px solid transparent',
                      borderBottom: i < windows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}
                    title={active ? '点击取消标记' : '点击在 3D 视图中标记会合位置'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ opacity: 0.55 }}>#{i + 1} 会合</span>
                      <span style={{ color: '#9fffd0', fontFamily: 'Roboto Mono, monospace' }}>
                        {formatGameTime(w.timeSec)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.75 }}>
                      <span>距离 {formatDistKm(w.distKm)}</span>
                      <span>≈ {days.toFixed(1)} 天后</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function SystemPage() {
  const controlsRef = useRef()
  const [planetInfo, setPlanetInfo] = useState(null)
  // 交汇窗口 3D 标记：{ timeSec, idA, isStationA, idB, isStationB } | null
  const [conjunctionFocus, setConjunctionFocus] = useState(null)
  const focusedStarId = useViewStore((s) => s.focusedStarId)
  const star = useGalaxyStore((s) => (focusedStarId ? s.getStar(focusedStarId) : null))
  const goBack = () => useViewStore.getState().back()

  // 本星系天体（行星 + 有轨道的空间站，按半长轴升序），供交汇窗口面板选择。
  // 空间站需轨道根数才能预测位置：stations.json 中 6 座空间站均含轨道数据。
  const allPlanets = useGalaxyStore((s) => s.planets)
  const bodies = useMemo(() => {
    if (!focusedStarId) return []
    const base = allPlanets
      .filter((p) => p.systemId === focusedStarId)
      .map((p) => ({ ...p, isStation: false }))
    const stations = [...(getOrbitData().stationOrbits ?? new Map()).entries()]
      .filter(([, o]) => o.systemId === focusedStarId)
      .map(([id, o]) => ({ naturalId: id, systemId: o.systemId, orbit: o, isStation: true }))
    return [...base, ...stations].sort((a, b) => a.orbit.semiMajorAxis - b.orbit.semiMajorAxis)
  }, [allPlanets, focusedStarId])

  // DEV 调试用：window.__controls（配合 __scene / __cam）
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const t = setTimeout(() => {
      window.__controls = controlsRef.current
    }, 500) // 等待 R3F Canvas 内部挂载 OrbitControls 后再读取 ref
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f', position: 'relative' }}>
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
        <SystemScene onPlanetClick={setPlanetInfo} conjunctionFocus={conjunctionFocus} />
        <CameraTween controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
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
        <h1 style={{ fontSize: '20px', marginBottom: '10px', letterSpacing: '2px' }}>
          {star?.name ?? '未知'} 行星系
        </h1>
        <p style={{ fontSize: '12px', opacity: 0.7, fontFamily: 'Roboto Mono, monospace' }}>
          {star?.systemId ?? ''} · 拖拽旋转 · 滚轮缩放 · 点击行星查看信息 · Esc 返回
        </p>
      </div>

      <button
        onClick={goBack}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(10, 20, 40, 0.95)',
          border: '1px solid rgba(0, 255, 255, 0.5)',
          color: '#00ffff',
          borderRadius: '6px',
          padding: '8px 14px',
          cursor: 'pointer',
          fontFamily: 'Roboto Mono, monospace',
          fontSize: '12px'
        }}
      >
        ← 返回星系图
      </button>

      {star && (
        <ConjunctionPanel bodies={bodies} starMassKg={star.massKg} onSelectWindow={setConjunctionFocus} />
      )}

      {planetInfo && <PlanetInfoPanel info={planetInfo} onClose={() => setPlanetInfo(null)} />}

      <TimeBar />
    </div>
  )
}
