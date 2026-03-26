import { useState, useEffect, useRef, useMemo } from 'react'
import { parseSystems, getPlanetsBySystem, parsePlanetResources } from '../utils/dataParser'

const MINERAL_COLORS = {
  'GAL': '#B8860B',
  'BRM': '#CD853F',
  'SIO': '#808080',
  'H2O': '#4169E1',
  'TAI': '#C0C0C0',
  'HE': '#FFB6C1',
  'FEO': '#8B4513',
  'MAG': '#90EE90',
  'CU': '#B87333',
  'AU': '#FFD700',
  'AG': '#C0C0C0',
  'PT': '#E5E4E2',
  'NI': '#727472',
  'CO': '#0047AB',
  'WI': '#2F4F4F',
  'MN': '#9B59B6',
  'CR': '#A29BFE',
  'HG': '#E74C3C',
  'PB': '#34495E',
  'UR': '#27AE60',
  'TH': '#16A085',
  'LI': '#F1C40F',
  'SI': '#95A5A6',
  'NA': '#9B59B6',
  'K': '#8E44AD'
}

function getMineralName(code) {
  const names = {
    'GAL': '镓', 'BRM': '钡', 'SIO': '二氧化硅', 'H2O': '水', 'TAI': '钛',
    'HE': '氦', 'FEO': '氧化铁', 'MAG': '镁', 'CU': '铜', 'AU': '金',
    'AG': '银', 'PT': '铂', 'NI': '镍', 'CO': '钴', 'WI': '钨',
    'MN': '锰', 'CR': '铬', 'HG': '汞', 'PB': '铅', 'UR': '铀',
    'TH': '钍', 'LI': '锂', 'SI': '硅', 'NA': '钠', 'K': '钾'
  }
  return names[code] || code
}

export default function MineralSearch({ onSearch }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMinerals, setSelectedMinerals] = useState([])
  const dropdownRef = useRef(null)

  const mineralData = useMemo(() => {
    const resources = parsePlanetResources()
    const mineralMap = {}

    resources.forEach(r => {
      if (!mineralMap[r.Ticker]) {
        mineralMap[r.Ticker] = {
          code: r.Ticker,
          name: getMineralName(r.Ticker),
          color: MINERAL_COLORS[r.Ticker] || '#888888',
          count: 0
        }
      }
      mineralMap[r.Ticker].count++
    })

    return Object.values(mineralMap).sort((a, b) => b.count - a.count)
  }, [])

  const filteredMinerals = useMemo(() => {
    if (!searchTerm) return mineralData
    return mineralData.filter(m =>
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.name.includes(searchTerm)
    )
  }, [mineralData, searchTerm])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMineral = (code) => {
    setSelectedMinerals(prev =>
      prev.includes(code)
        ? prev.filter(m => m !== code)
        : [...prev, code]
    )
  }

  const handleSearch = () => {
    if (selectedMinerals.length === 0) return

    const systems = parseSystems()
    const results = systems.map(system => {
      const planets = getPlanetsBySystem(system.NaturalId)
      const mineralDataMap = {}

      selectedMinerals.forEach(code => {
        mineralDataMap[code] = { count: 0, totalFactor: 0 }
      })

      planets.forEach(planet => {
        if (planet.Resources) {
          planet.Resources.forEach(resource => {
            if (mineralDataMap[resource.Ticker]) {
              mineralDataMap[resource.Ticker].count++
              mineralDataMap[resource.Ticker].totalFactor += resource.Factor
            }
          })
        }
      })

      return {
        ...system,
        planets,
        mineralData: mineralDataMap,
        matchedPlanetCount: planets.filter(p =>
          p.Resources?.some(r => selectedMinerals.includes(r.Ticker))
        ).length
      }
    }).filter(s => s.matchedPlanetCount > 0)
      .sort((a, b) => b.matchedPlanetCount - a.matchedPlanetCount)

    if (onSearch) {
      onSearch({
        minerals: selectedMinerals,
        results,
        totalSystems: results.length,
        totalPlanets: results.reduce((sum, s) => sum + s.matchedPlanetCount, 0)
      })
    }
  }

  const handleClear = () => {
    setSelectedMinerals([])
    setSearchTerm('')
  }

  return (
    <div style={{
      background: 'rgba(10, 20, 40, 0.95)',
      borderRadius: '8px',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      padding: '16px',
      marginBottom: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <span style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '14px' }}>
          矿产筛选
        </span>

        <div style={{ position: 'relative', flex: 1 }} ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '6px',
              color: '#FFFFFF',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>
              {selectedMinerals.length === 0
                ? '请选择矿产类型'
                : `${selectedMinerals.length} 个矿产已选`}
            </span>
            <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              ▼
            </span>
          </button>

          {isOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'rgba(10, 20, 40, 0.98)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '6px',
              zIndex: 1000,
              maxHeight: '350px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: '10px', borderBottom: '1px solid rgba(0, 255, 255, 0.2)' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索矿产..."
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '250px', padding: '8px' }}>
                {filteredMinerals.length === 0 ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '12px'
                  }}>
                    未找到匹配的矿产
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                    gap: '6px'
                  }}>
                    {filteredMinerals.map(mineral => (
                      <button
                        key={mineral.code}
                        onClick={() => toggleMineral(mineral.code)}
                        style={{
                          padding: '8px',
                          background: selectedMinerals.includes(mineral.code)
                            ? `${mineral.color}33`
                            : 'rgba(0, 0, 0, 0.2)',
                          border: `2px solid ${selectedMinerals.includes(mineral.code) ? mineral.color : 'rgba(0, 255, 255, 0.2)'}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          color: mineral.color,
                          fontWeight: 'bold',
                          fontSize: '11px'
                        }}>
                          {mineral.code}
                        </div>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '9px',
                          marginTop: '2px'
                        }}>
                          {mineral.name}
                        </div>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.4)',
                          fontSize: '8px',
                          marginTop: '2px'
                        }}>
                          {mineral.count} 星球
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          disabled={selectedMinerals.length === 0}
          style={{
            padding: '10px 20px',
            background: selectedMinerals.length === 0 ? 'rgba(0, 255, 255, 0.3)' : '#00FFFF',
            color: selectedMinerals.length === 0 ? 'rgba(255,255,255,0.5)' : '#0a0a0f',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedMinerals.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            minHeight: '40px'
          }}
        >
          搜索
        </button>

        <button
          onClick={handleClear}
          style={{
            padding: '10px 16px',
            background: 'transparent',
            color: '#00FFFF',
            border: '2px solid #00FFFF',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            minHeight: '40px'
          }}
        >
          清除
        </button>
      </div>

      {selectedMinerals.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {selectedMinerals.map(code => {
            const mineral = mineralData.find(m => m.code === code)
            return (
              <span
                key={code}
                onClick={() => toggleMineral(code)}
                style={{
                  padding: '4px 10px',
                  background: `${mineral?.color || '#888'}33`,
                  border: `1px solid ${mineral?.color || '#888'}`,
                  borderRadius: '12px',
                  color: mineral?.color || '#888',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {mineral?.name || code} ({code})
                <span style={{ fontSize: '10px' }}>×</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}