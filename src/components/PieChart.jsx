import { useState } from 'react'
import { MINERAL_COLORS } from '../utils/colors'
import { getResourceName } from '../utils/resourceUtils'

export default function PieChart({ data, size = 120, onSegmentClick }) {
  const [hoveredSegment, setHoveredSegment] = useState(null)
  const [activeSegment, setActiveSegment] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '50%',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '11px'
      }}>
        暂无数据
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  let currentAngle = -90
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100
    const angle = (percentage / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 4

    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)

    const largeArcFlag = angle > 180 ? 1 : 0

    const pathData = `
      M ${centerX} ${centerY}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      Z
    `

    return {
      ...item,
      path: pathData,
      percentage,
      startAngle,
      endAngle,
      color: MINERAL_COLORS[item.code] || '#888888',
      name: getResourceName(item.code)
    }
  })

  const handleSegmentClick = (segment) => {
    if (onSegmentClick) {
      onSegmentClick(segment.code)
    }
    setActiveSegment(activeSegment === segment.code ? null : segment.code)
  }

  const hoveredData = hoveredSegment 
    ? segments.find(s => s.code === hoveredSegment)
    : null

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={size} height={size} style={{ cursor: 'pointer' }}>
        {segments.map((segment, index) => (
          <path
            key={segment.code || index}
            d={segment.path}
            fill={segment.color}
            stroke="rgba(10, 20, 40, 0.8)"
            strokeWidth="2"
            opacity={
              activeSegment && activeSegment !== segment.code ? 0.4 : 
              hoveredSegment && hoveredSegment !== segment.code ? 0.6 : 1
            }
            onMouseEnter={() => setHoveredSegment(segment.code)}
            onMouseLeave={() => setHoveredSegment(null)}
            onClick={() => handleSegmentClick(segment)}
            style={{
              transition: 'opacity 0.2s, transform 0.2s',
              transform: hoveredSegment === segment.code ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: 'center'
            }}
          />
        ))}
        
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 6}
          fill="rgba(10, 20, 40, 0.9)"
        />
        
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#FFFFFF"
          fontSize="10"
          fontWeight="bold"
        >
          {data.length}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255, 255, 255, 0.6)"
          fontSize="8"
        >
          资源
        </text>
      </svg>

      {hoveredData && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-80px',
            background: 'rgba(10, 20, 40, 0.95)',
            border: `1px solid ${hoveredData.color}`,
            borderRadius: '6px',
            padding: '8px 10px',
            minWidth: '70px',
            zIndex: 100,
            boxShadow: `0 0 10px ${hoveredData.color}44`
          }}
        >
          <div style={{
            color: hoveredData.color,
            fontWeight: 'bold',
            fontSize: '12px',
            marginBottom: '4px'
          }}>
            {hoveredData.code}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '10px', marginBottom: '4px' }}>
            {hoveredData.name}
          </div>
          <div style={{ color: '#FFFFFF', fontSize: '11px' }}>
            {hoveredData.value.toFixed(2)}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '10px' }}>
            {hoveredData.percentage.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  )
}