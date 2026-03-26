import { useState, useEffect, useRef, useMemo } from 'react'
import PropTypes from 'prop-types'
import { parseSystems, getPlanetsBySystem, parsePlanetResources } from '../utils/dataParser'
import { MINERAL_COLORS, UI_THEME } from '../utils/colors'
import mineralsData from '../data/minerals_list.json'

// 创建资源代码到中文名称的映射
const RESOURCE_NAME_MAP = {}
mineralsData.minerals.forEach(m => {
  RESOURCE_NAME_MAP[m.code] = m.name
})

// 获取资源的中文名称
function getResourceName(ticker) {
  return RESOURCE_NAME_MAP[ticker] || ticker
}

export default function ResourceSearch({ onSearch }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResources, setSelectedResources] = useState([])
  const dropdownRef = useRef(null)

  const resourceData = useMemo(() => {
    const resources = parsePlanetResources()
    const resourceMap = {}

    resources.forEach(r => {
      if (!resourceMap[r.Ticker]) {
        resourceMap[r.Ticker] = {
          code: r.Ticker,
          name: getResourceName(r.Ticker),
          color: MINERAL_COLORS[r.Ticker] || UI_THEME.mineralDefault,
          count: 0
        }
      }
      resourceMap[r.Ticker].count++
    })

    return Object.values(resourceMap).sort((a, b) => b.count - a.count)
  }, [])

  const filteredResources = useMemo(() => {
    if (!searchTerm) return resourceData
    return resourceData.filter(r =>
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.name.includes(searchTerm)
    )
  }, [resourceData, searchTerm])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleResource = (code) => {
    setSelectedResources(prev =>
      prev.includes(code)
        ? prev.filter(r => r !== code)
        : [...prev, code]
    )
  }

  const handleSearch = () => {
    if (selectedResources.length === 0) return

    const systems = parseSystems()
    const results = systems.map(system => {
      const planets = getPlanetsBySystem(system.NaturalId)
      const resourceDataMap = {}

      selectedResources.forEach(code => {
        resourceDataMap[code] = { count: 0, totalFactor: 0 }
      })

      planets.forEach(planet => {
        if (planet.Resources) {
          planet.Resources.forEach(resource => {
            if (resourceDataMap[resource.Ticker]) {
              resourceDataMap[resource.Ticker].count++
              resourceDataMap[resource.Ticker].totalFactor += resource.Factor
            }
          })
        }
      })

      return {
        ...system,
        planets,
        resourceData: resourceDataMap,
        matchedPlanetCount: planets.filter(p =>
          p.Resources?.some(r => selectedResources.includes(r.Ticker))
        ).length
      }
    }).filter(s => s.matchedPlanetCount > 0)
      .sort((a, b) => b.matchedPlanetCount - a.matchedPlanetCount)

    if (onSearch) {
      onSearch({
        resources: selectedResources,
        results,
        totalSystems: results.length,
        totalPlanets: results.reduce((sum, s) => sum + s.matchedPlanetCount, 0)
      })
    }
  }

  const handleClear = () => {
    setSelectedResources([])
    setSearchTerm('')
  }

  return (
    <div style={{
      background: UI_THEME.background,
      borderRadius: '8px',
      border: `1px solid ${UI_THEME.border}`,
      padding: '16px',
      marginBottom: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <span style={{ color: UI_THEME.primary, fontWeight: 'bold', fontSize: '14px' }}>
          资源筛选
        </span>

        <div style={{ position: 'relative', flex: 1 }} ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${UI_THEME.border}`,
              borderRadius: '6px',
              color: UI_THEME.white,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>
              {selectedResources.length === 0
                ? '请选择资源类型'
                : `${selectedResources.length} 个资源已选`}
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
              background: UI_THEME.background,
              border: `1px solid ${UI_THEME.border}`,
              borderRadius: '6px',
              zIndex: 1000,
              maxHeight: '350px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: '10px', borderBottom: `1px solid ${UI_THEME.border}` }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索资源..."
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${UI_THEME.border}`,
                    borderRadius: '4px',
                    color: UI_THEME.white,
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '250px', padding: '8px' }}>
                {filteredResources.length === 0 ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: UI_THEME.textMuted,
                    fontSize: '12px'
                  }}>
                    未找到匹配的资源
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                    gap: '6px'
                  }}>
                    {filteredResources.map(resource => (
                      <button
                        key={resource.code}
                        onClick={() => toggleResource(resource.code)}
                        style={{
                          padding: '8px',
                          background: selectedResources.includes(resource.code)
                            ? `${resource.color}33`
                            : 'rgba(0, 0, 0, 0.2)',
                          border: `2px solid ${selectedResources.includes(resource.code) ? resource.color : UI_THEME.border}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          color: resource.color,
                          fontWeight: 'bold',
                          fontSize: '11px'
                        }}>
                          {resource.code}
                        </div>
                        <div style={{
                          color: UI_THEME.textMuted,
                          fontSize: '9px',
                          marginTop: '2px'
                        }}>
                          {resource.name}
                        </div>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.4)',
                          fontSize: '8px',
                          marginTop: '2px'
                        }}>
                          {resource.count} 星球
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
          disabled={selectedResources.length === 0}
          style={{
            padding: '10px 20px',
            background: selectedResources.length === 0 ? UI_THEME.surface : UI_THEME.primary,
            color: selectedResources.length === 0 ? UI_THEME.textMuted : UI_THEME.backgroundSolid,
            border: 'none',
            borderRadius: '6px',
            cursor: selectedResources.length === 0 ? 'not-allowed' : 'pointer',
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
            color: UI_THEME.primary,
            border: `2px solid ${UI_THEME.primary}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            minHeight: '40px'
          }}
        >
          清除
        </button>
      </div>

      {selectedResources.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {selectedResources.map(code => {
            const resource = resourceData.find(r => r.code === code)
            return (
              <span
                key={code}
                onClick={() => toggleResource(code)}
                style={{
                  padding: '4px 10px',
                  background: `${resource?.color || UI_THEME.mineralDefault}33`,
                  border: `1px solid ${resource?.color || UI_THEME.mineralDefault}`,
                  borderRadius: '12px',
                  color: resource?.color || UI_THEME.mineralDefault,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {resource?.name || code} ({code})
                <span style={{ fontSize: '10px' }}>×</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

ResourceSearch.propTypes = {
  onSearch: PropTypes.func.isRequired
}

ResourceSearch.defaultProps = {
  onSearch: null
}