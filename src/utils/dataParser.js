import linksData from '../data/system_links.csv?raw'
import systemStarsData from '../data/system_stars.json'
import factionData from '../data/system_factions.json'
import systemPlanetsData from '../data/system_planets.csv?raw'
import planetDetailData from '../data/planet_detail.csv?raw'
import planetResourcesData from '../data/planet_resources.csv?raw'

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
  // 使用 system_stars.json 数据，因为它包含 SystemId
  if (systemStarsData && Array.isArray(systemStarsData)) {
    return systemStarsData.map(system => ({
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
  }
  // JSON 数据不可用时返回空数组
  return []
}

export function parseLinks() {
  return parseCSV(linksData)
}

// 派系颜色映射
export const FACTION_COLORS = {
  'IC': '#4CAF50',  // Insitor Cooperative - 绿色
  'CI': '#FFEB3B',  // Castillo-Ito Mercantile - 黄色
  'NC': '#2196F3',  // NEO Charter Exploration - 蓝色
  'AI': '#F44336',  // Antares Initiative - 红色
};

// 派系名称映射
export const FACTION_NAMES = {
  'IC': 'Insitor Cooperative',
  'CI': 'Castillo-Ito Mercantile',
  'NC': 'NEO Charter Exploration',
  'AI': 'Antares Initiative',
};

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

export function getStarColor(type) {
  const colorMap = {
    'K': '#ff9933', // 橙色
    'M': '#ffcc33', // 黄色
    'G': '#33ccff', // 蓝色
    'F': '#33ff99', // 绿色
    'O': '#cc33ff', // 紫色
    'A': '#ff33cc', // 粉色
    'B': '#33ff33', // 亮绿色
    'default': '#ffffff' // 白色
  }
  return colorMap[type] || colorMap.default
}

// 解析系统星球数据
export function parseSystemPlanets() {
  return parseCSV(systemPlanetsData)
}

// 解析星球详细信息
export function parsePlanetDetail() {
  return parseCSV(planetDetailData)
}

// 解析星球资源数据
export function parsePlanetResources() {
  return parseCSV(planetResourcesData)
}

// COGC 相关代码已注释掉
/*
// 从 FIO API 获取星球数据
let fioPlanetsData = null

// 异步获取 FIO 星球数据
export async function fetchFIOPlanetsData() {
  console.log('开始获取 FIO 星球数据...')
  try {
    // 添加 CORS 头信息
    const response = await fetch('https://rest.fnar.net/planet/allplanets/full', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    console.log('FIO API 响应状态:', response.status)
    
    if (response.ok) {
      fioPlanetsData = await response.json()
      console.log('FIO 星球数据获取成功:', fioPlanetsData ? fioPlanetsData.length : 0, '个星球')
      // 测试数据
      if (fioPlanetsData && fioPlanetsData.length > 0) {
        console.log('第一个星球数据:', {
          PlanetNaturalId: fioPlanetsData[0].PlanetNaturalId,
          COGCProgramStatus: fioPlanetsData[0].COGCProgramStatus,
          ProductionFees: fioPlanetsData[0].ProductionFees ? fioPlanetsData[0].ProductionFees.length : 0
        })
      }
    } else {
      console.error('获取 FIO 星球数据失败:', response.status, await response.text())
    }
  } catch (error) {
    console.error('获取 FIO 星球数据出错:', error)
    // 使用本地数据作为 fallback
    console.log('使用本地数据作为 fallback')
    fioPlanetsData = [
      {
        PlanetNaturalId: 'AJ-120a',
        COGCProgramStatus: 'ACTIVE',
        ProductionFees: [
          { Category: 'AGRICULTURE' }
        ]
      },
      {
        PlanetNaturalId: 'AJ-120b',
        COGCProgramStatus: 'ON_STRIKE',
        ProductionFees: [
          { Category: 'RESOURCE_EXTRACTION' }
        ]
      },
      {
        PlanetNaturalId: 'AJ-120c',
        COGCProgramStatus: 'PLANNED',
        ProductionFees: [
          { Category: 'METALLURGY' }
        ]
      },
      {
        PlanetNaturalId: 'AJ-120d',
        COGCProgramStatus: 'ACTIVE',
        ProductionFees: [
          { Category: 'ELECTRONICS' }
        ]
      },
      {
        PlanetNaturalId: 'AJ-120e',
        COGCProgramStatus: 'ACTIVE',
        ProductionFees: [
          { Category: 'FOOD_INDUSTRIES' }
        ]
      }
    ]
    console.log('使用本地 fallback 数据:', fioPlanetsData.length, '个星球')
  }
  return fioPlanetsData
}
*/

// 全局缓存
let planetsCache = null
let systemsPlanetsMap = null

// 初始化缓存（在应用启动时调用）
export function initPlanetsCache() {
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

// 获取系统的空间站（CX）信息 - 从订单数据中提取
export function getSystemStations(systemNaturalId) {
  // CX代码与系统的映射（基于常见规律）
  const systemToCXMap = {
    // 这里需要根据实际数据建立映射
    // 暂时返回空数组，需要后续从API获取真实数据
  }
  
  // 从订单数据中提取该系统相关的CX
  // 这是一个简化实现，实际需要更复杂的逻辑
  return []
}
