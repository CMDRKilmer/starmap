// 屏幕右下角 XYZ 标尺 HUD。
// - 真 gizmo 行为：每帧读取 OrbitControls camera quaternion，
//   渲染 3 根 SVG 箭头 + 标签，箭头方向随相机旋转。
// - 颜色：X 红 #ff5555 / Y 绿 #55ff55 / Z 蓝 #5599ff
// - 位置：固定 bottom: 20, right: 20；pointer-events: none 不挡操作。
//
// 用法：放在 <App/> 和 <SystemPage/> 各自的根 div 里（position: relative 的祖先）即可。
// 通过 ref 拿到 OrbitControls 的 camera，再读 quaternion。
import { useEffect, useState } from 'react'
import { UI_THEME } from '../../utils/colors'

const SIZE = 110 // SVG 视口大小
const CENTER = SIZE / 2
const LEN = 42 // 箭头线段长度
const HEAD = 9 // 箭头头部三角

// 颜色
const COLOR_X = '#ff5555'
const COLOR_Y = '#55ff55'
const COLOR_Z = '#5599ff'

// 在 3D 里默认 X=(1,0,0), Y=(0,1,0), Z=(0,0,1)，
// 经过 camera 的 quaternion 旋转后投影到屏幕。
// 用 v' = q * v * q⁻¹ 展开（标准四元数点旋转公式）
function applyQuat(v, q) {
  const x = v[0], y = v[1], z = v[2]
  const qx = q.x, qy = q.y, qz = q.z, qw = q.w
  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (qy * z - qz * y)
  const ty = 2 * (qz * x - qx * z)
  const tz = 2 * (qx * y - qy * x)
  return [
    x + qw * tx + (qy * tz - qz * ty),
    y + qw * ty + (qz * tx - qx * tz),
    z + qw * tz + (qx * ty - qy * tx),
  ];
}

function projectArrow(axisVec, q) {
  const [x, y, z] = applyQuat(axisVec, q)
  const screenX = CENTER + x * LEN
  const screenY = CENTER - y * LEN // SVG y 向下 → 反转
  return { x: screenX, y: screenY, depth: z }
}

function Arrow({ axisVec, q, color, label }) {
  const end = projectArrow(axisVec, q)
  const faded = end.depth < 0 // 朝向相机后方的轴淡化
  const stroke = faded ? color : color
  const opacity = faded ? 0.35 : 1
  // 计算头部三角方向
  const dx = end.x - CENTER
  const dy = end.y - CENTER
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / len
  const uy = dy / len
  // 头部基底点（在线段终点反向一段距离）
  const baseX = end.x - ux * HEAD
  const baseY = end.y - uy * HEAD
  // 垂直方向
  const px = -uy
  const py = ux
  const lx = baseX + px * (HEAD * 0.55)
  const ly = baseY + py * (HEAD * 0.55)
  const rx = baseX - px * (HEAD * 0.55)
  const ry = baseY - py * (HEAD * 0.55)
  return (
    <g opacity={opacity}>
      <line
        x1={CENTER}
        y1={CENTER}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      <polygon
        points={`${end.x},${end.y} ${lx},${ly} ${rx},${ry}`}
        fill={color}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      <text
        x={end.x + ux * 4 + px * 1}
        y={end.y + uy * 4 + py * 1}
        fontSize="11"
        fontFamily="Orbitron, sans-serif"
        fontWeight="700"
        fill={color}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      >
        {label}
      </text>
    </g>
  )
}

export default function AxisGizmoHUD({ controlsRef }) {
  const [q, setQ] = useState({ x: 0, y: 0, z: 0, w: 1 })

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const cam = controlsRef?.current?.object ?? window.__cam
      if (cam) {
        // 仅当变化超过阈值时 setState 触发重渲染
        setQ((prev) => {
          const nq = cam.quaternion
          if (
            Math.abs(prev.x - nq.x) < 1e-4 &&
            Math.abs(prev.y - nq.y) < 1e-4 &&
            Math.abs(prev.z - nq.z) < 1e-4 &&
            Math.abs(prev.w - nq.w) < 1e-4
          ) {
            return prev
          }
          return { x: nq.x, y: nq.y, z: nq.z, w: nq.w }
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [controlsRef])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: SIZE + 16,
        height: SIZE + 16,
        background: UI_THEME.background,
        border: `1px solid ${UI_THEME.border}`,
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 0 12px rgba(0, 255, 255, 0.15)',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* 中心圆点 */}
        <circle cx={CENTER} cy={CENTER} r="2" fill={UI_THEME.textSecondary} opacity="0.6" />
        <Arrow axisVec={[1, 0, 0]} q={q} color={COLOR_X} label="X" />
        <Arrow axisVec={[0, 1, 0]} q={q} color={COLOR_Y} label="Y" />
        <Arrow axisVec={[0, 0, 1]} q={q} color={COLOR_Z} label="Z" />
      </svg>
    </div>
  )
}