// 单星系视图（M2）：以恒星为原点（group 置于 galaxy 恒星坐标），行星/空间站/
// 轨道环按 km 缩放显示。单位换算：posUnit = posKm / scale，scale 使最远轨道
// 映射到 SYSTEM_VIEW_MAX_RADIUS 个坐标单位（保证不同星系的显示尺度一致）。
// 外观按真实数据（M2.5）：行星半径 planet-env.json 的 r、颜色按温度(csv_planetdetail)；
// 恒星颜色按光谱 Type、大小按质量(MassSol)。
import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture } from 'three'
import { Html, Line } from '@react-three/drei'
import { useGalaxyStore } from '../stores/galaxyStore'
import { useViewStore } from '../stores/viewStore'
import { useTimeStore } from '../stores/timeStore'
import { getOrbitData } from '../bodies/loadOrbits'
import { predictPositionKm } from '../orbit/gameModel.js'
import Star from './bodies/Star'
import OrbitRing from './bodies/OrbitRing'

export const SYSTEM_VIEW_MAX_RADIUS = 60 // 最远轨道显示的坐标单位（留余量使行星可辨）

const SOLAR_MASS = 1.989e30 // kg
const ORBIT_COLOR = [0.29, 0.66, 1] // 轨道环颜色（淡蓝）
const DEFAULT_PLANET_COLOR = [0.53, 0.53, 0.67] // 灰紫（无温度数据时）
const GAS_BASE_COLOR = '#c8a06a' // 气态行星基底色（橙棕条纹主色）
const GREEN_BASE_COLOR = '#2f8f5b' // 三绿行星基底色（地球蓝绿）
const PLANET_UNIT = 0.9 // 行星/空间站统一显示大小（场景单位）
const POSITION_WINDOW = 10 // 行星位置窗口：游戏秒；20 倍速下 ≈ 现实 0.5s 重算一次

// 天体名字标签样式（Html 悬浮于 3D 位置上方）
const labelStyle = {
  fontSize: '9px',
  color: '#9fd8ff',
  fontFamily: 'Roboto Mono, monospace',
  textShadow: '0 0 4px rgba(0, 0, 0, 0.9)',
  background: 'rgba(0, 0, 0, 0.4)',
  padding: '1px 5px',
  borderRadius: '3px',
  whiteSpace: 'nowrap',
  userSelect: 'none',
}

// 光谱类型 → 恒星颜色（标准主序色）
const SPECTRAL_COLORS = {
  O: '#9bb0ff',
  B: '#aabfff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4e8',
  K: '#ffd2a1',
  M: '#ff9a6f',
}

// 温度(K) → 行星颜色（分段线性插值）
const TEMP_STOPS = [
  [-300, [0.49, 0.78, 1.0]],
  [-100, [0.44, 0.85, 0.82]],
  [0, [0.29, 0.85, 0.54]],
  [100, [0.66, 0.85, 0.31]],
  [200, [0.9, 0.78, 0.31]],
  [400, [1.0, 0.6, 0.3]],
  [800, [1.0, 0.35, 0.24]],
  [1500, [1.0, 0.2, 0.33]],
]

// 温度(K) → 颜色数组 [r,g,b]
function colorFromTemp(t) {
  if (t == null || Number.isNaN(t)) return DEFAULT_PLANET_COLOR
  if (t <= TEMP_STOPS[0][0]) return TEMP_STOPS[0][1]
  if (t >= TEMP_STOPS[TEMP_STOPS.length - 1][0]) return TEMP_STOPS[TEMP_STOPS.length - 1][1]
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    const [t1, c1] = TEMP_STOPS[i - 1]
    const [t2, c2] = TEMP_STOPS[i]
    if (t <= t2) {
      const k = (t - t1) / (t2 - t1)
      return c1.map((v, j) => v + (c2[j] - v) * k)
    }
  }
  return DEFAULT_PLANET_COLOR
}

// 行星真实外观数据（planet-env 半径 + csv 温度/环境 + csv 名称别名 + 基建需求），模块级缓存只加载一次
let appearanceCache = null
async function loadAppearance() {
  if (appearanceCache) return appearanceCache
  const [env, csv, names, buildReq] = await Promise.all([
    fetch('orbit/planet-env.json').then((r) => r.json()),
    fetch('data/csv_planetdetail.csv').then((r) => r.text()),
    fetch('data/csv_systemplanets.csv').then((r) => r.text()),
    fetch('data/planet-buildreq.json')
      .then((r) => r.json())
      .catch(() => ({})), // 数据缺失时全部视为非三绿
  ])
  const radiusMap = new Map()
  for (const [k, v] of Object.entries(env)) radiusMap.set(k.toUpperCase(), v.r)
  const tempMap = new Map()
  const surfaceMap = new Map()
  const detailMap = new Map()
  csv
    .split('\n')
    .slice(1)
    .forEach((line) => {
      const c = line.split(',')
      if (c.length > 7 && c[0]) {
        const key = c[0].toUpperCase()
        tempMap.set(key, parseFloat(c[7]))
        // 完整环境信息：Gravity(6) Temperature(7) Pressure(8) Fertility(9) Surface(10)
        detailMap.set(key, {
          gravity: parseFloat(c[6]),
          temperature: parseFloat(c[7]),
          pressure: parseFloat(c[8]),
          fertility: parseFloat(c[9]),
          surface: c[10],
        })
        // Surface 列（index 10）：True=类地（有固体表面），False=气态
        if (c[10] !== undefined) surfaceMap.set(key, c[10])
      }
    })
  // 名称别名表：NaturalId(小写) → Name（有别名时优先显示）
  const nameMap = new Map()
  names
    .split('\n')
    .slice(1)
    .forEach((line) => {
      const i = line.indexOf(',')
      if (i > 0) nameMap.set(line.slice(0, i).toUpperCase(), line.slice(i + 1))
    })
  // 基建需求：naturalId(大写) → 环境额外材料 tickers（空=三绿行星，基建无需额外材料）
  const buildReqMap = new Map(Object.entries(buildReq))
  appearanceCache = { radiusMap, tempMap, surfaceMap, detailMap, nameMap, buildReqMap }
  return appearanceCache
}

// 气态行星条纹纹理（横向色带，经典 gas giant 外观，高对比度版本），模块级缓存
let gasTex = null
function getGasGiantTex() {
  if (gasTex) return gasTex
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  // 强对比横带：深棕 / 浅奶 / 中棕循环，模拟木星/土星条纹
  const bands = ['#7a4a2a', '#f5e4c1', '#a06545', '#f0d6a8', '#5e3520', '#e8c896', '#8a5638', '#fff0d2']
  for (let y = 0; y < 8; y++) {
    ctx.fillStyle = bands[y % bands.length]
    ctx.fillRect(0, y * 8, 64, 8)
  }
  // 添加一个椭圆「风暴」标记增强辨识度
  ctx.fillStyle = '#d04020'
  ctx.beginPath()
  ctx.ellipse(20, 24, 6, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  const tex = new CanvasTexture(c)
  tex.colorSpace = 'srgb'
  gasTex = tex
  return gasTex
}

// 地球化（三绿）行星纹理：深蓝海洋 + 翠绿陆地块 + 白色云层（高对比度，小尺寸下可辨）
let earthTex = null
function getEarthLikeTex() {
  if (earthTex) return earthTex
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0d3b8c' // 深蓝海洋（提高对比）
  ctx.fillRect(0, 0, 128, 64)
  ctx.fillStyle = '#2d8f3c' // 翠绿陆地
  for (const [x, y, w, h] of [
    [18, 22, 32, 14],
    [55, 12, 26, 18],
    [88, 30, 32, 14],
    [35, 42, 22, 12],
    [70, 48, 18, 10],
  ]) {
    ctx.beginPath()
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(245, 245, 255, 0.6)' // 云层
  for (const [x, y, w, h] of [
    [35, 18, 22, 7],
    [85, 22, 20, 6],
    [50, 38, 24, 7],
    [10, 8, 16, 5],
    [105, 52, 18, 6],
  ]) {
    ctx.beginPath()
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2)
    ctx.fill()
  }
 const tex = new CanvasTexture(c)
  tex.colorSpace = 'srgb'
  earthTex = tex
  return earthTex
}

// 恒星光晕纹理（径向渐变，强化恒星颜色感知）
let starGlowTex = null
function getStarGlowTex() {
  if (starGlowTex) return starGlowTex
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
  grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.35)')
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  starGlowTex = new CanvasTexture(c)
  starGlowTex.colorSpace = 'srgb'
  return starGlowTex
}

// 空间站图标纹理（Canvas 绘制：主体竖杆 + 两侧太阳能板），模块级缓存
let stationIconTex = null
function getStationIconTex() {
  if (stationIconTex) return stationIconTex
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 64, 64)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(27, 14, 10, 36) // 主体
  ctx.fillRect(6, 20, 18, 6) // 太阳能板（左）
  ctx.fillRect(40, 20, 18, 6) // 太阳能板（右）
  ctx.fillRect(6, 38, 18, 6)
  ctx.fillRect(40, 38, 18, 6)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = 'srgb'
  stationIconTex = tex
  return stationIconTex
}

function getSystemViewParams(starId) {
  // 按半长轴升序（内→外轨道）排序，使 planetPositions 顺序确定
  const planets = useGalaxyStore
    .getState()
    .planets.filter((p) => p.systemId === starId)
    .sort((a, b) => a.orbit.semiMajorAxis - b.orbit.semiMajorAxis)
  const maxKm = planets.reduce((m, p) => Math.max(m, p.orbit.semiMajorAxis / 1e3), 0)
  const scale = maxKm > 0 ? maxKm / SYSTEM_VIEW_MAX_RADIUS : 1
  return { planets, scale }
}

export default function SystemScene({ onPlanetClick, conjunctionFocus = null }) {
  const focusedStarId = useViewStore((s) => s.focusedStarId)
  const currentGameTime = useTimeStore((s) => s.currentGameTime)
  const star = useGalaxyStore((s) => (focusedStarId ? s.getStar(focusedStarId) : null))
  const starPos = star?.position ?? [0, 0, 0]

  // 行星真实外观数据（半径/温度）
  const [appearance, setAppearance] = useState(null)
  useEffect(() => {
    let alive = true
    loadAppearance().then((a) => {
      if (alive) setAppearance(a)
    })
    return () => {
      alive = false
    }
  }, [])

  const { planets, scale } = useMemo(
    () => (focusedStarId ? getSystemViewParams(focusedStarId) : { planets: [], scale: 1 }),
    [focusedStarId],
  )

  // 行星 + 空间站按真实半长轴统一升序，决定等距轨道的先后（空间站按其真实轨道位置插入）
  const merged = useMemo(() => {
    const { stationOrbits } = getOrbitData()
    const items = [
      ...planets.map((p) => ({ kind: 'planet', id: p.naturalId, a: p.orbit.semiMajorAxis })),
      ...[...stationOrbits.entries()]
        .filter(([, o]) => o.systemId === focusedStarId)
        .map(([id, o]) => ({ kind: 'station', id, a: o.semiMajorAxis })),
    ].sort((x, y) => x.a - y.a)
    const N = items.length
    const rank = new Map(items.map((it, i) => [`${it.kind}:${it.id}`, i]))
    return { N, rank }
  }, [planets, focusedStarId])

  // 等间距圆轨道半径（坐标单位）：按 merged 排序后的序号均匀分布
  const orbitRadii = useMemo(
    () => Array.from({ length: merged.N }, (_, i) => (SYSTEM_VIEW_MAX_RADIUS * (i + 1)) / (merged.N || 1)),
    [merged],
  )

  // 行星位置窗口计算：游戏时间每帧变化，但开普勒解算结果在 POSITION_WINDOW（游戏秒）
  // 内几乎不变——窗口内复用上次结果（数组引用稳定，下游 mesh 不重建），到期才重算。
  const posTickRef = useRef({ starId: null, time: null })
  const planetsCacheRef = useRef(null)
  const stationsCacheRef = useRef(null)
  const isInWindow = (starId, time) =>
    posTickRef.current.starId === starId && Math.abs(time - posTickRef.current.time) < POSITION_WINDOW

  const planetPositions = useMemo(() => {
    if (!star || star.massKg <= 0) return []
    if (isInWindow(focusedStarId, currentGameTime) && planetsCacheRef.current) {
      return planetsCacheRef.current
    }
    // 等间距圆轨道半径（显示层）：行星按其真实半长轴在 merged 中的序号取半径，
    // 方位角取真实预测位置的方向（随时间运动），仅半径改等距。
    const result = planets.map((p) => {
      const pos = predictPositionKm(p.orbit, star.massKg, currentGameTime)
      const ang = Math.atan2(pos.y, pos.x)
      const r = (SYSTEM_VIEW_MAX_RADIUS * (merged.rank.get(`planet:${p.naturalId}`) + 1)) / (merged.N || 1)
      return { id: p.naturalId, x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 }
    })
    planetsCacheRef.current = result
    posTickRef.current = { starId: focusedStarId, time: currentGameTime }
    return result
  }, [planets, star, currentGameTime, merged])

  // 空间站（有轨道根数的）：按 merged 序号取等距半径
  const stationMeshes = useMemo(() => {
    if (!focusedStarId) return []
    if (isInWindow(focusedStarId, currentGameTime) && stationsCacheRef.current) {
      return stationsCacheRef.current
    }
    const { stationOrbits } = getOrbitData()
    const out = []
    for (const [id, orbit] of stationOrbits) {
      if (orbit.systemId !== focusedStarId) continue
      const pos = predictPositionKm(orbit, star?.massKg ?? 0, currentGameTime)
      const ang = Math.atan2(pos.y, pos.x)
      const r = (SYSTEM_VIEW_MAX_RADIUS * (merged.rank.get(`station:${id}`) + 1)) / (merged.N || 1)
      out.push({ id, pos: { x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 } })
    }
    stationsCacheRef.current = out
    posTickRef.current = { starId: focusedStarId, time: currentGameTime }
    return out
  }, [focusedStarId, star, currentGameTime, merged])

  const orbitRings = useMemo(
    () =>
      planets.map((p) => ({
        orbit: p.orbit,
        massKg: star?.massKg ?? 0,
        color: ORBIT_COLOR,
      })),
    [planets, star],
  )

  // 纹理（模块级缓存，useMemo 仅取引用）——必须在早期 return 之前，保证 hooks 数量恒定
  const stationIcon = useMemo(() => getStationIconTex(), [])
  const gasGiantTex = useMemo(() => getGasGiantTex(), [])
  const earthLikeTex = useMemo(() => getEarthLikeTex(), [])
  const starGlow = useMemo(() => getStarGlowTex(), [])

  // 交汇窗口 3D 标记：会合时刻两星在显示坐标系（等距轨道 + 真实方位角）的位置
  const focusMarkers = useMemo(() => {
    if (!conjunctionFocus || !star) return null
    const stationOrbitMap = getOrbitData().stationOrbits ?? new Map()
    const locate = (id, isStation) => {
      const orbit = isStation ? stationOrbitMap.get(id) ?? null : planets.find((p) => p.naturalId === id)?.orbit ?? null
      const key = `${isStation ? 'station' : 'planet'}:${id}`
      const rank = merged.rank.get(key)
      const r = rank != null ? orbitRadii[rank] : null
      if (!orbit || r == null) return null
      const pos = predictPositionKm(orbit, star.massKg, conjunctionFocus.timeSec)
      const ang = Math.atan2(pos.y, pos.x)
      return { x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 }
    }
    const a = locate(conjunctionFocus.idA, conjunctionFocus.isStationA)
    const b = locate(conjunctionFocus.idB, conjunctionFocus.isStationB)
    return a && b ? { a, b } : null
  }, [conjunctionFocus, star, planets, merged, orbitRadii])

  if (!star) {
    return (
      <mesh>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial color="#00ffff" wireframe />
      </mesh>
    )
  }

  // 恒星外观：颜色按光谱 Type，大小按质量（MassSol，clamp 1.5~2.5，始终大于行星上限 1.2）
  const starColor = SPECTRAL_COLORS[String(star.type || '').toUpperCase()] ?? SPECTRAL_COLORS.G
  const starRadius = Math.min(2.5, 1.5 + Math.sqrt(star.massKg / SOLAR_MASS) * 0.35)
  // 光晕大小按辐射强度（光度 L/Lsun = (M/Msun)^3.5 主序星近似），照亮范围 ∝ sqrt(L)，clamp 3~14
  const luminosity = Math.pow(star.massKg / SOLAR_MASS, 3.5)
  const starGlowSize = Math.min(14, Math.max(3, 3 + 4 * Math.log10(luminosity)))

  return (
    <group position={starPos}>
      {/* 点击恒星不返回星系图，仅用于观赏 */}
      <Star
        system={{ ...star, SystemId: star.systemId, NaturalId: star.systemId, PositionX: 0, PositionY: 0, PositionZ: 0 }}
        position={[0, 0, 0]}
        isSelected={false}
        isSearched={false}
        onHover={() => {}}
        radiusOverride={starRadius}
        colorOverride={starColor}
      />
      {/* 恒星光晕：大小按辐射强度（光度 L∝M^3.5），表示照亮范围 */}
      <sprite scale={[starGlowSize, starGlowSize, 1]}>
        <spriteMaterial map={starGlow} color={starColor} transparent opacity={0.55} depthWrite={false} />
      </sprite>

      <Html position={[0, starRadius + 0.35, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ ...labelStyle, fontSize: '12px', color: '#ffffff' }}>{star.name}</div>
      </Html>

      <OrbitRing orbits={orbitRings} scale={scale} radii={orbitRadii} />

      {planetPositions.map((p) => {
        const rKm = appearance?.radiusMap.get(p.id) ?? 0
        const detail = appearance?.detailMap.get(p.id)
        // 行星视觉半径：统一大小（与空间站一致），仅受轨道半径 20% 限制避免内圈密集重叠
        const dist = Math.hypot(p.x, p.y, p.z)
        const rUnit = Math.min(PLANET_UNIT, Math.max(0.15, dist * 0.2))
        const name = appearance?.nameMap.get(p.id) || p.id
        // 气态（无固体表面）：条纹纹理
        const isGas = appearance?.surfaceMap.get(p.id) === 'False'
        // 三绿行星（基建无需额外材料）：地球化渲染
        const isTripleGreen = !isGas && (appearance?.buildReqMap.get(p.id)?.length ?? 1) === 0
        return (
          <mesh
            key={p.id}
            position={[p.x, p.y, p.z]}
            onClick={(e) => {
              e.stopPropagation()
              onPlanetClick?.({
                id: p.id,
                name,
                radiusKm: rKm,
                tempC: detail?.temperature,
                gravity: detail?.gravity,
                pressure: detail?.pressure,
                fertility: detail?.fertility,
                isGas,
                isTripleGreen,
              })
            }}
          >
            <sphereGeometry args={[rUnit, 12, 12]} />
            {/* 基底色保证小尺寸/纹理不可见时仍有明确颜色；纹理仅增强细节 */}
            <meshBasicMaterial
              color={isGas ? GAS_BASE_COLOR : isTripleGreen ? GREEN_BASE_COLOR : colorFromTemp(detail?.temperature)}
              map={isGas ? gasGiantTex : isTripleGreen ? earthLikeTex : null}
              toneMapped={false}
            />
            <Html position={[0, rUnit + 0.2, 0]} center style={{ pointerEvents: 'none' }}>
              <div style={labelStyle}>{name}</div>
            </Html>
            {/* 纹理球：toneMapped=false 跳过 ACES 色调映射，纹理原色直接显示 */}
          </mesh>
        )
      })}

      {stationMeshes.map((st) => (
        <group key={st.id} position={[st.pos.x, st.pos.y, st.pos.z]}>
          <sprite scale={[0.9, 0.9, 1]}>
            <spriteMaterial map={stationIcon} transparent depthWrite={false} color="#ffc07a" />
          </sprite>
          <Html position={[0, 1.1, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{ ...labelStyle, color: '#ffc07a' }}>{st.id}</div>
          </Html>
        </group>
      ))}

      {/* 交汇窗口标记：会合时刻两星位置 + 连线（点击面板窗口行触发） */}
      {focusMarkers && (
        <group>
          <Line
            points={[
              [focusMarkers.a.x, focusMarkers.a.y, focusMarkers.a.z],
              [focusMarkers.b.x, focusMarkers.b.y, focusMarkers.b.z],
            ]}
            color="#00ffff"
            lineWidth={2}
          />
          {[focusMarkers.a, focusMarkers.b].map((p, i) => (
            <group key={i} position={[p.x, p.y, p.z]}>
              <mesh>
                <sphereGeometry args={[0.6, 16, 16]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.5} depthWrite={false} />
              </mesh>
              <Html position={[0, 0.9, 0]} center style={{ pointerEvents: 'none' }}>
                <div style={{ ...labelStyle, color: '#00ffff' }}>
                  {i === 0 ? '出发天体 · 会合位置' : '目标天体 · 会合位置'}
                </div>
              </Html>
            </group>
          ))}
        </group>
      )}
    </group>
  )
}
