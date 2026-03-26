import { useState, useEffect, useRef, useMemo } from 'react'
import { parseSystems, getPlanetsBySystem } from '../utils/dataParser'
import mineralsData from '../data/minerals_list.json'

const MINERAL_COLORS = {
  'GAL': '#B8860B', 'BRM': '#CD853F', 'SIO': '#808080', 'H2O': '#4169E1',
  'TAI': '#C0C0C0', 'HE': '#FFB6C1', 'FEO': '#8B4513', 'MAG': '#90EE90',
  'CU': '#B87333', 'AU': '#FFD700', 'AG': '#C0C0C0', 'PT': '#E5E4E2',
  'NI': '#727472', 'CO': '#0047AB', 'WI': '#2F4F4F', 'MN': '#9B59B6',
  'CR': '#A29BFE', 'HG': '#E74C3C', 'PB': '#34495E', 'UR': '#27AE60',
  'TH': '#16A085', 'LI': '#F1C40F', 'SI': '#95A5A6', 'NA': '#9B59B6',
  'K': '#8E44AD', 'ALO': '#CD7F32', 'AMM': '#9ACD32', 'AR': '#DA70D6',
  'AUO': '#FFD700', 'BER': '#98FB98', 'BOR': '#F0E68C', 'BTS': '#BC8F8F',
  'CLI': '#7FFF00', 'CUO': '#B87333', 'F': '#ADFF2F', 'H': '#87CEEB',
  'HAL': '#FFA500', 'HE3': '#FFB6C1', 'HEX': '#DDA0DD', 'KR': '#EE82EE',
  'LES': '#DDA0DD', 'LIO': '#F0E68C', 'LST': '#D2B48C', 'MGS': '#90EE90',
  'N': '#87CEEB', 'NE': '#ADD8E6', 'O': '#B0C4DE', 'REO': '#9B59B6',
  'SCR': '#C0C0C0', 'TCO': '#E5E4E2', 'TIO': '#D3D3D3', 'TS': '#A9A9A9',
  'ZIR': '#F5F5DC'
}

const ILLEGAL_CHARS = /[!@#$%^&*()_+{}[\]|\\:;"'<>,.?/~`]/;

export default function PlanetSearch({ onSearch }) {
  const [searchInput, setSearchInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('planetSearchFilters')
    return saved ? JSON.parse(saved) : {
      gravity: [],
      temperature: [],
      pressure: [],
      surface: [],
      minerals: []
    }
  })

  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('planetSearchHistory')
    return saved ? JSON.parse(saved) : []
  })

  const [showHistory, setShowHistory] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showMineralDropdown, setShowMineralDropdown] = useState(false)
  const [mineralSearch, setMineralSearch] = useState('')

  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const mineralDropdownRef = useRef(null)

  const mineralList = useMemo(() => {
    return mineralsData.minerals
  }, [])

  const filteredMinerals = useMemo(() => {
    if (!mineralSearch) return mineralList
    const search = mineralSearch.toLowerCase()
    return mineralList.filter(m =>
      m.code.toLowerCase().includes(search) ||
      m.name.includes(mineralSearch)
    )
  }, [mineralList, mineralSearch])

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('mineral-dropdown')
      if (dropdown && dropdown.contains(event.target)) {
        return
      }
      if (mineralDropdownRef.current && !mineralDropdownRef.current.contains(event.target)) {
        setShowMineralDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    localStorage.setItem('planetSearchFilters', JSON.stringify(filters))
  }, [filters])

  useEffect(() => {
    if (searchInput.length >= 2) {
      const systems = parseSystems()
      const matchingSystems = systems
        .filter(s => s.Name?.toLowerCase().includes(searchInput.toLowerCase()) ||
                      s.NaturalId?.toLowerCase().includes(searchInput.toLowerCase()))
        .slice(0, 8)
      setSuggestions(matchingSystems)
    } else {
      setSuggestions([])
    }
  }, [searchInput])

  const validateInput = (value) => {
    if (ILLEGAL_CHARS.test(value)) {
      return '输入包含非法字符'
    }
    if (value.length > 50) {
      return '输入过长'
    }
    return ''
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setSearchInput(value)
    setInputError(validateInput(value))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !inputError) {
      handleSearch()
    }
  }

  const performSearch = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const systems = parseSystems()

        const matchingSystems = searchInput
          ? systems.filter(s =>
              s.Name?.toLowerCase().includes(searchInput.toLowerCase()) ||
              s.NaturalId?.toLowerCase().includes(searchInput.toLowerCase())
            )
          : systems

        const results = []
        for (let i = 0; i < matchingSystems.length; i++) {
          const system = matchingSystems[i]
          const planets = getPlanetsBySystem(system.NaturalId)

          const filteredPlanets = planets.filter(planet => {
            if (filters.gravity.length > 0) {
              const gravity = parseFloat(planet.Gravity) || 0
              if (filters.gravity.includes('high') && gravity < 1.5) return false
              if (filters.gravity.includes('mid') && (gravity < 0.5 || gravity > 1.5)) return false
              if (filters.gravity.includes('low') && gravity > 0.5) return false
            }

            if (filters.temperature.length > 0) {
              const temp = parseFloat(planet.Temperature) || 0
              if (filters.temperature.includes('high') && temp < 50) return false
              if (filters.temperature.includes('mid') && (temp < -50 || temp > 50)) return false
              if (filters.temperature.includes('low') && temp > -50) return false
            }

            if (filters.pressure.length > 0) {
              const pressure = parseFloat(planet.Pressure) || 0
              if (filters.pressure.includes('high') && pressure < 2) return false
              if (filters.pressure.includes('mid') && (pressure < 0.1 || pressure > 2)) return false
              if (filters.pressure.includes('low') && pressure > 0.1) return false
            }

            if (filters.surface.length > 0) {
              const isRocky = planet.Surface === 'True'
              if (filters.surface.includes('rocky') && !isRocky) return false
              if (filters.surface.includes('gaseous') && isRocky) return false
            }

            if (filters.minerals.length > 0) {
              const hasMatchingMineral = planet.Resources?.some(r =>
                filters.minerals.includes(r.Ticker)
              )
              if (!hasMatchingMineral) return false
            }

            return true
          })

          if (filteredPlanets.length > 0 || !searchInput) {
            results.push({
              ...system,
              planets: filteredPlanets
            })
          }

          if (i % 50 === 0) {
            results.push({ type: 'progress' })
          }
        }

        resolve(results.filter(r => r.type !== 'progress'))
      }, 10)
    })
  }

  const handleSearch = async () => {
    if (inputError) return

    if (searchInput) {
      const newHistory = [searchInput, ...searchHistory.filter(h => h !== searchInput)].slice(0, 5)
      setSearchHistory(newHistory)
      localStorage.setItem('planetSearchHistory', JSON.stringify(newHistory))
    }
    setShowHistory(false)

    setIsLoading(true)
    try {
      const results = await performSearch()
      if (onSearch) {
        onSearch({
          query: searchInput,
          filters,
          results,
          isAdvanced: showAdvanced
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setSearchInput('')
    setInputError('')
    setFilters({
      gravity: [],
      temperature: [],
      pressure: [],
      surface: [],
      minerals: []
    })
    setSuggestions([])
  }

  const toggleFilter = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }))
  }

  const handleHistorySelect = (history) => {
    setSearchInput(history)
    setShowHistory(false)
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      background: 'rgba(10, 20, 40, 0.95)',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      fontFamily: 'Roboto Mono, monospace'
    }}>
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'flex-start'
      }}>
        <div style={{ flex: '1 1 70%', minWidth: '280px', position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            placeholder="请输入星球名称或扇区名称进行搜索"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: `2px solid ${inputError ? '#FF4500' : 'rgba(0, 255, 255, 0.3)'}`,
              borderRadius: '6px',
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#FFFFFF',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
          />

          {inputError && (
            <div style={{ color: '#FF4500', fontSize: '12px', marginTop: '4px' }}>
              {inputError}
            </div>
          )}

          {showHistory && searchHistory.length > 0 && !searchInput && (
            <div
              ref={suggestionsRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(10, 20, 40, 0.98)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '6px',
                marginTop: '4px',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              <div style={{
                padding: '8px 12px',
                color: '#88ccff',
                fontSize: '12px',
                borderBottom: '1px solid rgba(0, 255, 255, 0.2)'
              }}>
                最近搜索
              </div>
              {searchHistory.map((history, idx) => (
                <div
                  key={idx}
                  onClick={() => handleHistorySelect(history)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(0, 255, 255, 0.1)'}
                  onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                  {history}
                </div>
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(10, 20, 40, 0.98)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '6px',
                marginTop: '4px',
                zIndex: 1000,
                maxHeight: '250px',
                overflowY: 'auto'
              }}
            >
              {suggestions.map((system, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSearchInput(system.Name || system.NaturalId)
                    setSuggestions([])
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(0, 255, 255, 0.1)' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(0, 255, 255, 0.1)'}
                  onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                  <div style={{ color: '#00FFFF', fontWeight: 'bold' }}>{system.Name || system.NaturalId}</div>
                  <div style={{ color: '#88ccff', fontSize: '11px', marginTop: '2px' }}>
                    扇区: {system.SectorId} | 类型: {system.Type}型星
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading || !!inputError}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            background: isLoading || !!inputError ? 'rgba(0, 255, 255, 0.3)' : '#00FFFF',
            color: isLoading || !!inputError ? 'rgba(255,255,255,0.5)' : '#0a0a0f',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading || !!inputError ? 'not-allowed' : 'pointer',
            minWidth: '120px',
            minHeight: '44px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isLoading ? (
            <>
              <span style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTop: '2px solid currentColor',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              搜索中...
            </>
          ) : '搜索'}
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            background: 'transparent',
            color: '#00FFFF',
            border: '2px solid #00FFFF',
            borderRadius: '6px',
            cursor: 'pointer',
            minWidth: '100px',
            minHeight: '44px',
            transition: 'all 0.2s'
          }}
        >
          重置
        </button>
      </div>

      <div style={{
        marginTop: '16px',
        borderTop: '1px solid rgba(0, 255, 255, 0.2)',
        paddingTop: '12px'
      }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#88ccff',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0'
          }}
        >
          高级筛选
          <span style={{
            transition: 'transform 0.3s ease-in-out',
            transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
            display: 'inline-block'
          }}>
            ▼
          </span>
        </button>

        <div style={{
          maxHeight: showAdvanced ? '500px' : '0',
          opacity: showAdvanced ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            paddingTop: '16px'
          }}>
            <FilterGroup title="重力条件" icon="⚖️">
              {['高', '中', '低'].map(level => (
                <FilterCheckbox
                  key={level}
                  label={level}
                  checked={filters.gravity.includes(level === '高' ? 'high' : level === '中' ? 'mid' : 'low')}
                  onChange={() => toggleFilter('gravity', level === '高' ? 'high' : level === '中' ? 'mid' : 'low')}
                  color={level === '高' ? '#FF4500' : level === '中' ? '#FFD700' : '#1E90FF'}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="温度条件" icon="🌡️">
              {['高', '中', '低'].map(level => (
                <FilterCheckbox
                  key={level}
                  label={level}
                  checked={filters.temperature.includes(level === '高' ? 'high' : level === '中' ? 'mid' : 'low')}
                  onChange={() => toggleFilter('temperature', level === '高' ? 'high' : level === '中' ? 'mid' : 'low')}
                  color={level === '高' ? '#FF4500' : level === '中' ? '#FFD700' : '#1E90FF'}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="压力条件" icon="📊">
              {['高', '中', '低'].map(level => (
                <FilterCheckbox
                  key={level}
                  label={level}
                  checked={filters.pressure.includes(level === '高' ? 'high' : level === '中' ? 'mid' : 'low')}
                  onChange={() => toggleFilter('pressure', level === '高' ? 'high' : level === '中' ? 'mid' : 'low')}
                  color={level === '高' ? '#FF4500' : level === '中' ? '#FFD700' : '#1E90FF'}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="星球材质" icon="🪨">
              {[
                { value: 'rocky', label: '岩质', color: '#FFA500' },
                { value: 'gaseous', label: '气态', color: '#87CEEB' }
              ].map(item => (
                <FilterCheckbox
                  key={item.value}
                  label={item.label}
                  checked={filters.surface.includes(item.value)}
                  onChange={() => toggleFilter('surface', item.value)}
                  color={item.color}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="矿产资源" icon="💎">
              <div style={{ position: 'relative' }} ref={mineralDropdownRef}>
                <input
                  type="text"
                  value={mineralSearch}
                  onChange={(e) => {
                    setMineralSearch(e.target.value)
                    setShowMineralDropdown(true)
                  }}
                  onFocus={(e) => {
                    setShowMineralDropdown(true)
                  }}
                  placeholder="输入搜索矿产..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />

                {showMineralDropdown && filteredMinerals.length > 0 && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 'auto',
                      left: 'auto',
                      zIndex: 10000,
                      background: 'rgba(10, 20, 40, 0.98)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '6px',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      width: '300px',
                      maxWidth: '90vw'
                    }}
                    id="mineral-dropdown"
                  >
                    {filteredMinerals.map(mineral => (
                      <div
                        key={mineral.code}
                        onClick={() => {
                          toggleFilter('minerals', mineral.code)
                          setMineralSearch('')
                          setShowMineralDropdown(false)
                        }}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <span style={{ color: MINERAL_COLORS[mineral.code] || '#FFFFFF', fontWeight: 'bold', marginRight: '8px' }}>
                            {mineral.code}
                          </span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
                            {mineral.name}
                          </span>
                        </div>
                        {filters.minerals.includes(mineral.code) && (
                          <span style={{ color: '#00FFFF', fontSize: '10px' }}>已选 ✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {showMineralDropdown && mineralSearch && filteredMinerals.length === 0 && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 'auto',
                      left: 'auto',
                      zIndex: 10000,
                      background: 'rgba(10, 20, 40, 0.98)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '6px',
                      padding: '12px',
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      width: '300px',
                      maxWidth: '90vw'
                    }}
                  >
                    未找到匹配的矿产
                  </div>
                )}
              </div>
              {filters.minerals.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                  {filters.minerals.map(code => {
                    const mineral = mineralList.find(m => m.code === code)
                    return (
                      <span
                        key={code}
                        onClick={() => toggleFilter('minerals', code)}
                        style={{
                          padding: '2px 8px',
                          background: `${MINERAL_COLORS[code] || '#888'}33`,
                          border: `1px solid ${MINERAL_COLORS[code] || '#888'}`,
                          borderRadius: '10px',
                          color: MINERAL_COLORS[code] || '#888',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {code}
                        <span style={{ fontSize: '8px' }}>×</span>
                      </span>
                    )
                  })}
                </div>
              )}
            </FilterGroup>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function FilterGroup({ title, icon, children }) {
  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.2)',
      padding: '12px',
      borderRadius: '6px',
      border: '1px solid rgba(0, 255, 255, 0.1)'
    }}>
      <div style={{
        color: '#88ccff',
        fontSize: '13px',
        fontWeight: 'bold',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span>{icon}</span>
        {title}
      </div>
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {children}
      </div>
    </div>
  )
}

function FilterCheckbox({ label, checked, onChange, color }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      cursor: 'pointer',
      userSelect: 'none'
    }}>
      <div
        onClick={onChange}
        style={{
          width: '18px',
          height: '18px',
          border: `2px solid ${checked ? color : 'rgba(0, 255, 255, 0.3)'}`,
          borderRadius: '4px',
          background: checked ? color : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0
        }}
      >
        {checked && (
          <span style={{ color: '#0a0a0f', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
        )}
      </div>
      <span style={{
        color: checked ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
        fontSize: '13px',
        transition: 'color 0.2s'
      }}>
        {label}
      </span>
    </label>
  )
}