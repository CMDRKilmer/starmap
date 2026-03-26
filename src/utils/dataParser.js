import linksData from '../data/system_links.csv?raw'
import systemStarsData from '../data/system_stars.json'
import factionData from '../data/system_factions.json'
import systemPlanetsData from '../data/system_planets.csv?raw'
import planetDetailData from '../data/planet_detail.csv?raw'
import planetResourcesData from '../data/planet_resources.csv?raw'
import { FACTION_COLORS, FACTION_NAMES } from './colors'

let systemsCache = null
let linksCache = null
let planetsCache = null
let planetsDetailCache = null
let planetsResourcesCache = null

export function parseCSV(csvString) {
  const lines = csvString.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const obj = {}
    headers.forEach((header, index) => {
      const value = values[index]
      if (['PositionX', 'PositionY', 'PositionZ'].includes(header)) {
        obj[header] = parseFloat(value) || 0
      } else {
        obj[header] = value
      }
    })
    data.push(obj)
  }

  return data
}

export function parseSystems() {
  if (systemsCache) return systemsCache

  if (systemStarsData && Array.isArray(systemStarsData)) {
    systemsCache = systemStarsData.map(system => ({
      SystemId: system.SystemId,
      NaturalId: system.NaturalId,
      Name: system.Name,
      Type: system.Type,
      PositionX: system.PositionX,
      PositionY: system.PositionY,
      PositionZ: system.PositionZ,
      SectorId: system.SectorId,
      SubSectorId: system.SubSectorId,
      Connections: system.Connections || []
    }))
    return systemsCache
  }
  return []
}

export function parseLinks() {
  if (linksCache) return linksCache
  linksCache = parseCSV(linksData)
  return linksCache
}

// 获取系统派系代码
export function getSystemFaction(systemId) {
  if (!factionData || !factionData.systemFactions) {
    return null;
  }
  return factionData.systemFactions[systemId] || null;
}

// 获取系统派系颜色
export function getSystemFactionColor(systemId) {
  const factionCode = getSystemFaction(systemId);
  if (factionCode) {
    return FACTION_COLORS[factionCode] || '#FFFFFF';
  }
  return '#FFFFFF'; // 无派系显示白色
}

// 获取系统派系名称
export function getSystemFactionName(systemId) {
  const factionCode = getSystemFaction(systemId);
  if (factionCode) {
    return FACTION_NAMES[factionCode] || 'Unknown';
  }
  return 'No Faction';
}

// 获取派系统计信息
export function getFactionStats() {
  if (!factionData || !factionData.planetFactions) {
    return null;
  }
  return factionData.planetFactions;
}

// 解析系统星球数据
export function parseSystemPlanets() {
  if (planetsCache) return planetsCache
  planetsCache = parseCSV(systemPlanetsData)
  return planetsCache
}

// 解析星球详细信息
export function parsePlanetDetail() {
  if (planetsDetailCache) return planetsDetailCache
  planetsDetailCache = parseCSV(planetDetailData)
  return planetsDetailCache
}

// 解析星球资源数据
export function parsePlanetResources() {
  if (planetsResourcesCache) return planetsResourcesCache
  planetsResourcesCache = parseCSV(planetResourcesData)
  return planetsResourcesCache
}

// 全局缓存
let systemsPlanetsMap = null
let initStarted = false

// 初始化缓存（在应用启动时调用）
export function initPlanetsCache() {
  if (initStarted) return
  initStarted = true

  if (planetsCache) return planetsCache
  
  const allPlanets = parseSystemPlanets()
  const allPlanetDetails = parsePlanetDetail()
  const allPlanetResources = parsePlanetResources()
  
  // 创建星球详情映射
  const planetDetailMap = {}
  allPlanetDetails.forEach(detail => {
    if (detail.PlanetNaturalId) {
      planetDetailMap[detail.PlanetNaturalId] = detail
    }
  })
  
  // 创建星球资源映射
  const planetResourcesMap = {}
  allPlanetResources.forEach(resource => {
    if (resource.Planet) {
      if (!planetResourcesMap[resource.Planet]) {
        planetResourcesMap[resource.Planet] = []
      }
      planetResourcesMap[resource.Planet].push({
        Ticker: resource.Ticker,
        Type: resource.Type,
        Factor: parseFloat(resource.Factor) || 0
      })
    }
  })
  
  // 构建完整的星球数据
  planetsCache = allPlanets.map(planet => {
    const detail = planetDetailMap[planet.NaturalId]
    const resources = planetResourcesMap[planet.NaturalId] || []
    
    return {
      ...planet,
      HasLocalMarket: detail ? detail.HasLocalMarket === 'True' : false,
      HasChamberOfCommerce: detail ? detail.HasChamberOfCommerce === 'True' : false,
      HasWarehouse: detail ? detail.HasWarehouse === 'True' : false,
      HasAdministrationCenter: detail ? detail.HasAdministrationCenter === 'True' : false,
      HasShipyard: detail ? detail.HasShipyard === 'True' : false,
      Gravity: detail ? detail.Gravity : null,
      Temperature: detail ? detail.Temperature : null,
      Pressure: detail ? detail.Pressure : null,
      Fertility: detail ? detail.Fertility : null,
      Surface: detail ? detail.Surface : null,
      Resources: resources
    }
  })
  
  // 构建系统-星球映射
  systemsPlanetsMap = new Map()
  planetsCache.forEach(planet => {
    if (planet.NaturalId) {
      // 提取系统ID（如 VH-331a -> VH-331）
      const systemId = planet.NaturalId.replace(/[a-z]$/, '')
      if (!systemsPlanetsMap.has(systemId)) {
        systemsPlanetsMap.set(systemId, [])
      }
      systemsPlanetsMap.get(systemId).push(planet)
    }
  })
  
  console.log(`[Cache] 已缓存 ${planetsCache.length} 个星球, ${systemsPlanetsMap.size} 个系统`)
  return planetsCache
}

// 获取指定系统的所有星球（使用缓存）
export function getPlanetsBySystem(systemNaturalId) {
  // 确保缓存已初始化
  if (!planetsCache) {
    initPlanetsCache()
  }
  
  // 直接从缓存获取
  return systemsPlanetsMap.get(systemNaturalId) || []
}

// 获取所有缓存的星球（用于搜索）
export function getAllCachedPlanets() {
  if (!planetsCache) {
    initPlanetsCache()
  }
  return planetsCache
}

// 获取系统-星球映射（用于搜索）
export function getSystemsPlanetsMap() {
  if (!systemsPlanetsMap) {
    initPlanetsCache()
  }
  return systemsPlanetsMap
}
