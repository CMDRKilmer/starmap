import { useState, useEffect, useRef, useMemo } from 'react'
import { parseSystems, getPlanetsBySystem, initPlanetsCache, getSystemsPlanetsMap } from '../utils/dataParser'
import mineralsData from '../data/minerals_list.json'

// 初始化缓存
initPlanetsCache()

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
      // 使用 requestIdleCallback 或 setTimeout 避免阻塞主线程
      const scheduleWork = (callback) => {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(callback, { timeout: 100 })
        } else {
          setTimeout(callback, 0)
        }
      }

      scheduleWork(() => {
        const startTime = performance.now()
        const systems = parseSystems()
        const systemsMap = getSystemsPlanetsMap()

        // 预编译搜索条件，避免重复计算
        const hasGravityFilter = filters.gravity.length > 0
        const hasTempFilter = filters.temperature.length > 0
        const hasPressureFilter = filters.pressure.length > 0
        const hasSurfaceFilter = filters.surface.length > 0
        const hasMineralFilter = filters.minerals.length > 0

        // 快速路径：如果没有筛选条件，直接返回所有系统
        if (!searchInput && !hasGravityFilter && !hasTempFilter && !hasPressureFilter && !hasSurfaceFilter && !hasMineralFilter) {
          resolve(systems)
          return
        }

        // 系统名称索引（用于快速搜索）
        const searchLower = searchInput?.toLowerCase()
        const matchingSystems = searchInput
          ? systems.filter(s => {
              const nameMatch = s.Name && s.Name.toLowerCase().includes(searchLower)
              const idMatch = s.NaturalId && s.NaturalId.toLowerCase().includes(searchLower)
              return nameMatch || idMatch
            })
          : systems

        const results = []
        const batchSize = 100 // 每批处理100个系统
        let processedCount = 0

        const processBatch = () => {
          const endIndex = Math.min(processedCount + batchSize, matchingSystems.length)

          for (let i = processedCount; i < endIndex; i++) {
            const system = matchingSystems[i]
            const planets = systemsMap.get(system.NaturalId) || []

            // 如果没有筛选条件，直接包含所有系统
            if (!hasGravityFilter && !hasTempFilter && !hasPressureFilter && !hasSurfaceFilter && !hasMineralFilter) {
              if (planets.length > 0) {
                results.push({
                  ...system,
                  planets: planets
                })
              }
              continue
            }

            const filteredPlanets = planets.filter(planet => {
              // 重力筛选
              if (hasGravityFilter) {
                const gravity = parseFloat(planet.Gravity) || 0
                let gravityMatch = false
                if (filters.gravity.includes('high') && gravity >= 1.5) gravityMatch = true
                if (filters.gravity.includes('mid') && gravity >= 0.5 && gravity <= 1.5) gravityMatch = true
                if (filters.gravity.includes('low') && gravity <= 0.5) gravityMatch = true
                if (!gravityMatch) return false
              }

              // 温度筛选
              if (hasTempFilter) {
                const temp = parseFloat(planet.Temperature) || 0
                let tempMatch = false
                if (filters.temperature.includes('high') && temp >= 50) tempMatch = true
                if (filters.temperature.includes('mid') && temp >= -50 && temp <= 50) tempMatch = true
                if (filters.temperature.includes('low') && temp <= -50) tempMatch = true
                if (!tempMatch) return false
              }

              // 压力筛选
              if (hasPressureFilter) {
                const pressure = parseFloat(planet.Pressure) || 0
                let pressureMatch = false
                if (filters.pressure.includes('high') && pressure >= 2) pressureMatch = true
                if (filters.pressure.includes('mid') && pressure >= 0.1 && pressure <= 2) pressureMatch = true
                if (filters.pressure.includes('low') && pressure <= 0.1) pressureMatch = true
                if (!pressureMatch) return false
              }

              // 材质筛选
              if (hasSurfaceFilter) {
                const isRocky = planet.Surface === 'True'
                let surfaceMatch = false
                if (filters.surface.includes('rocky') && isRocky) surfaceMatch = true
                if (filters.surface.includes('gaseous') && !isRocky) surfaceMatch = true
                if (!surfaceMatch) return false
              }

              // 矿物筛选 - 必须包含所有选择的矿物
              if (hasMineralFilter) {
                const planetMinerals = new Set(planet.Resources?.map(r => r.Ticker) || [])
                const hasAllMinerals = filters.minerals.every(m => planetMinerals.has(m))
                if (!hasAllMinerals) return false
              }

              return true
            })

            if (filteredPlanets.length > 0) {
              results.push({
                ...system,
                planets: filteredPlanets
              })
            }
          }

          processedCount = endIndex

          if (processedCount < matchingSystems.length) {
            // 继续处理下一批
            scheduleWork(processBatch)
          } else {
            const endTime = performance.now()
            console.log(`[Search] 搜索完成: ${results.length} 个结果, 耗时 ${(endTime - startTime).toFixed(2)}ms`)
            resolve(results)
          }
        }

        processBatch()
      })
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
    // 通知父组件清除搜索结果
    if (onSearch) {
      onSearch({
        query: '',
        filters: {
          gravity: [],
          temperature: [],
          pressure: [],
          surface: [],
          minerals: []
        },
        results: [],
        isAdvanced: showAdvanced
      })
    }
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
      maxWidth: '800px',
      margin: '0 auto 10px',
      padding: '6px 12px',
      background: 'rgba(10, 20, 40, 0.95)',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      fontFamily: 'Roboto Mono, monospace'
    }}>
      <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ width: '160px', position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            placeholder="搜索星球/扇区"
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '12px',
              border: `1px solid ${inputError ? '#FF4500' : 'rgba(0, 255, 255, 0.3)'}`,
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
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: isLoading || !!inputError ? 'rgba(0, 255, 255, 0.3)' : '#00FFFF',
            color: isLoading || !!inputError ? 'rgba(255,255,255,0.5)' : '#0a0a0f',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading || !!inputError ? 'not-allowed' : 'pointer',
            minWidth: '60px',
            minHeight: '32px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          {isLoading ? (
            <>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
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
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: 'transparent',
            color: '#00FFFF',
            border: '1px solid #00FFFF',
            borderRadius: '6px',
            cursor: 'pointer',
            minWidth: '60px',
            minHeight: '32px',
            transition: 'all 0.2s'
          }}
        >
          重置
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'transparent',
            border: showAdvanced ? '1px solid #00FFFF' : '1px solid rgba(0, 255, 255, 0.3)',
            color: showAdvanced ? '#00FFFF' : '#88ccff',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '32px',
            transition: 'all 0.2s'
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
      </div>

      <div style={{
        display: showAdvanced ? 'grid' : 'none',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px',
        marginTop: '10px'
      }}>
        <FilterGroup title="重力" icon="⚖️">
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

        <FilterGroup title="温度" icon="🌡️">
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

        <FilterGroup title="压力" icon="📊">
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

        <FilterGroup title="材质" icon="🪨">
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

        <FilterGroup title="矿产" icon="💎">
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
      padding: '8px 10px',
      borderRadius: '6px',
      border: '1px solid rgba(0, 255, 255, 0.1)'
    }}>
      <div style={{
        color: '#88ccff',
        fontSize: '11px',
        fontWeight: 'bold',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span>{icon}</span>
        {title}
      </div>
      <div style={{
        display: 'flex',
        gap: '8px',
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
      gap: '4px',
      cursor: 'pointer',
      userSelect: 'none'
    }}>
      <div
        onClick={onChange}
        style={{
          width: '14px',
          height: '14px',
          border: `1px solid ${checked ? color : 'rgba(0, 255, 255, 0.3)'}`,
          borderRadius: '3px',
          background: checked ? color : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0
        }}
      >
        {checked && (
          <span style={{ color: '#0a0a0f', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
        )}
      </div>
      <span style={{
        color: checked ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
        fontSize: '11px',
        transition: 'color 0.2s'
      }}>
        {label}
      </span>
    </label>
  )
}