import { useState } from 'react'
import PieChart from './PieChart'

const MINERAL_COLORS = {
  'GAL': '#B8860B', 'BRM': '#CD853F', 'SIO': '#808080', 'H2O': '#4169E1',
  'TAI': '#C0C0C0', 'HE': '#FFB6C1', 'FEO': '#8B4513', 'MAG': '#90EE90',
  'CU': '#B87333', 'AU': '#FFD700', 'AG': '#C0C0C0', 'PT': '#E5E4E2',
  'NI': '#727472', 'CO': '#0047AB', 'WI': '#2F4F4F', 'MN': '#9B59B6',
  'CR': '#A29BFE', 'HG': '#E74C3C', 'PB': '#34495E', 'UR': '#27AE60',
  'TH': '#16A085', 'LI': '#F1C40F', 'SI': '#95A5A6', 'NA': '#9B59B6',
  'K': '#8E44AD'
}

export default function SearchResults({ results, onSystemClick, onPlanetClick }) {
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [filterMineral, setFilterMineral] = useState(null)

  if (!results || results.length === 0) {
    return (
      <div style={{
        background: 'rgba(10, 20, 40, 0.95)',
        borderRadius: '8px',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        padding: '40px',
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.6)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💎</div>
        <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无搜索结果</div>
        <div style={{ fontSize: '12px' }}>请先在左侧选择矿产类型进行搜索</div>
      </div>
    )
  }

  const handleSystemClick = (system) => {
    setSelectedSystem(selectedSystem === system.NaturalId ? null : system.NaturalId)
    if (onSystemClick) {
      onSystemClick(system)
    }
  }

  const filteredPlanets = selectedSystem 
    ? results.find(s => s.NaturalId === selectedSystem)?.planets || []
    : []

  const filteredPlanetResources = filterMineral
    ? filteredPlanets.filter(p => 
        p.Resources?.some(r => r.Ticker === filterMineral)
      )
    : filteredPlanets

  return (
    <div style={{
      background: 'rgba(10, 20, 40, 0.95)',
      borderRadius: '8px',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      padding: '16px',
      maxHeight: '500px',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(0, 255, 255, 0.2)'
      }}>
        <div style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '14px' }}>
          搜索结果
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
          共找到 <span style={{ color: '#00FFFF', fontWeight: 'bold' }}>{results.length}</span> 个系统，
          <span style={{ color: '#00FFFF', fontWeight: 'bold' }}>
            {results.reduce((sum, s) => sum + s.matchedPlanetCount, 0)}
          </span> 个星球
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedSystem ? '1fr 1fr' : '1fr',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {results.map(system => (
            <div
              key={system.NaturalId}
              onClick={() => handleSystemClick(system)}
              style={{
                padding: '12px',
                background: selectedSystem === system.NaturalId 
                  ? 'rgba(0, 255, 255, 0.15)' 
                  : 'rgba(0, 0, 0, 0.2)',
                border: `2px solid ${selectedSystem === system.NaturalId ? '#00FFFF' : 'rgba(0, 255, 255, 0.2)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px' }}>
                    {system.Name || system.NaturalId}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px' }}>
                    {system.NaturalId}
                  </div>
                </div>
                <PieChart 
                  data={Object.entries(system.mineralData)
                    .filter(([_, data]) => data.count > 0)
                    .map(([code, data]) => ({
                      code,
                      value: data.totalFactor,
                      count: data.count
                    }))
                  }
                  size={70}
                  onSegmentClick={(code) => setFilterMineral(filterMineral === code ? null : code)}
                />
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                fontSize: '10px'
              }}>
                {Object.entries(system.mineralData)
                  .filter(([_, data]) => data.count > 0)
                  .map(([code, data]) => (
                    <span
                      key={code}
                      onClick={(e) => {
                        e.stopPropagation()
                        setFilterMineral(filterMineral === code ? null : code)
                      }}
                      style={{
                        padding: '2px 6px',
                        background: filterMineral === code 
                          ? `${MINERAL_COLORS[code]}44` 
                          : 'rgba(0, 0, 0, 0.3)',
                        border: `1px solid ${MINERAL_COLORS[code] || '#888'}`,
                        borderRadius: '8px',
                        color: MINERAL_COLORS[code] || '#888',
                        cursor: 'pointer'
                      }}
                    >
                      {code}: {data.count}
                    </span>
                  ))
                }
              </div>
            </div>
          ))}
        </div>

        {selectedSystem && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            border: '1px solid rgba(0, 255, 255, 0.2)'
          }}>
            <div style={{
              color: '#88ccff',
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '10px'
            }}>
              星球详情 {filterMineral && `- 筛选: ${filterMineral}`}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '350px',
              overflowY: 'auto'
            }}>
              {filteredPlanetResources.map((planet, idx) => (
                <div
                  key={idx}
                  onClick={() => onPlanetClick?.(planet)}
                  style={{
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                    cursor: onPlanetClick ? 'pointer' : 'default',
                    border: planet.Resources?.some(r => r.Ticker === filterMineral)
                      ? `1px solid ${MINERAL_COLORS[filterMineral] || '#888'}`
                      : '1px solid transparent'
                  }}
                >
                  <div style={{
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '6px'
                  }}>
                    {planet.NaturalId}
                    {planet.Surface === 'True' && (
                      <span style={{ color: '#FFA500', marginLeft: '6px', fontSize: '10px' }}>岩质</span>
                    )}
                    {planet.Surface === 'False' && (
                      <span style={{ color: '#87CEEB', marginLeft: '6px', fontSize: '10px' }}>气态</span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '3px'
                  }}>
                    {planet.Resources
                      ?.filter(r => !filterMineral || r.Ticker === filterMineral)
                      .map((resource, rIdx) => (
                        <span
                          key={rIdx}
                          style={{
                            padding: '2px 5px',
                            background: `${MINERAL_COLORS[resource.Ticker] || '#888'}22`,
                            borderRadius: '4px',
                            color: MINERAL_COLORS[resource.Ticker] || '#888',
                            fontSize: '9px'
                          }}
                        >
                          {resource.Ticker} {(resource.Factor * 100).toFixed(0)}%
                        </span>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}