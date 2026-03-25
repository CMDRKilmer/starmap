import systemsData from '../data/systems.csv?raw'
import linksData from '../data/system_links.csv?raw'
import systemStarsData from '../data/system_stars.json'
import factionData from '../data/system_factions.json'
import systemPlanetsData from '../data/system_planets.csv?raw'
import planetDetailData from '../data/planet_detail.csv?raw'

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
  // 如果 JSON 数据不可用，回退到 CSV
  return parseCSV(systemsData)
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

// 获取指定系统的所有星球（包含设施信息）
export function getPlanetsBySystem(systemNaturalId) {
  const allPlanets = parseSystemPlanets()
  const allPlanetDetails = parsePlanetDetail()
  
  // 创建星球详情映射
  const planetDetailMap = {}
  allPlanetDetails.forEach(detail => {
    if (detail.PlanetNaturalId) {
      planetDetailMap[detail.PlanetNaturalId] = detail
    }
  })
  
  // 系统NaturalId是星球ID的前缀（如 VH-331 匹配 VH-331a, VH-331b 等）
  return allPlanets
    .filter(planet => planet.NaturalId && planet.NaturalId.startsWith(systemNaturalId))
    .map(planet => {
      const detail = planetDetailMap[planet.NaturalId]
      return {
        ...planet,
        // 星球设施
        HasLocalMarket: detail ? detail.HasLocalMarket === 'True' : false,
        HasChamberOfCommerce: detail ? detail.HasChamberOfCommerce === 'True' : false,
        HasWarehouse: detail ? detail.HasWarehouse === 'True' : false,
        HasAdministrationCenter: detail ? detail.HasAdministrationCenter === 'True' : false,
        HasShipyard: detail ? detail.HasShipyard === 'True' : false
      }
    })
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
