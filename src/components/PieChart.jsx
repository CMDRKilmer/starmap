import { useState } from 'react'

const MINERAL_COLORS = {
  'GAL': '#B8860B', 'BRM': '#CD853F', 'SIO': '#808080', 'H2O': '#4169E1',
  'TAI': '#C0C0C0', 'HE': '#FFB6C1', 'FEO': '#8B4513', 'MAG': '#90EE90',
  'CU': '#B87333', 'AU': '#FFD700', 'AG': '#C0C0C0', 'PT': '#E5E4E2',
  'NI': '#727472', 'CO': '#0047AB', 'WI': '#2F4F4F', 'MN': '#9B59B6',
  'CR': '#A29BFE', 'HG': '#E74C3C', 'PB': '#34495E', 'UR': '#27AE60',
  'TH': '#16A085', 'LI': '#F1C40F', 'SI': '#95A5A6', 'NA': '#9B59B6',
  'K': '#8E44AD'
}

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
      color: MINERAL_COLORS[item.code] || '#888888'
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
          矿产
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