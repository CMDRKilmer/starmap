import { FACTION_COLORS, FACTION_NAMES } from './colors'

const FIO_DATA_REPO = 'https://raw.githubusercontent.com/CMDRKilmer/fiodata/main/data'
// 本地离线数据（public/data/，由 scripts/build-fio-data.mjs 从 FIO API 重建）
const LOCAL_DATA_PATH = 'data'

let systemsCache = null
let linksCache = null
let planetsCache = null
let planetsDetailCache = null
let planetsResourcesCache = null
let factionDataCache = null
let initStarted = false
let initPromise = null
let systemsPlanetsMap = null

async function fetchLocalFile(endpoint) {
  try {
    const response = await fetch(`${LOCAL_DATA_PATH}/${endpoint}`)
    if (!response.ok) {
      return null
    }
    return await response.text()
  } catch {
    return null
  }
}

export async function fetchFromGitHub(endpoint) {
  // 优先本地离线数据（public/data/，build-fio-data.mjs 重建）；GitHub 源已失效，仅作兜底
  const local = await fetchLocalFile(endpoint)
  if (local) {
    return local
  }
  const url = `${FIO_DATA_REPO}/${endpoint}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`[DataFetch] Failed to fetch ${endpoint}: ${response.status}`)
      return null
    }
    return await response.text()
  } catch (error) {
    console.error(`[DataFetch] Error fetching ${endpoint}:`, error)
    return null
  }
}

export async function fetchJSONFromGitHub(endpoint) {
  const text = await fetchFromGitHub(endpoint)
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error(`[DataFetch] Failed to parse JSON ${endpoint}:`, error)
    return null
  }
}

export function parseCSV(csvString) {
  if (!csvString) return []

  const lines = csvString.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const obj = {}
    headers.forEach((header, index) => {
      const value = values[index]
      if (['PositionX', 'PositionY', 'PositionZ', 'Luminosity', 'Mass', 'MassSol'].includes(header)) {
        obj[header] = parseFloat(value) || 0
      } else {
        obj[header] = value
      }
    })
    data.push(obj)
  }

  return data
}

function buildPlanetsCache() {
  const planetDetailMap = {}
  planetsDetailCache?.forEach(detail => {
    if (detail.PlanetNaturalId) {
      planetDetailMap[detail.PlanetNaturalId] = detail
    }
  })

  const planetResourcesMap = {}
  planetsResourcesCache?.forEach(resource => {
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

  const fullPlanetsCache = planetsCache.map(planet => {
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

  planetsCache = fullPlanetsCache

  systemsPlanetsMap = new Map()
  planetsCache.forEach(planet => {
    if (planet.NaturalId) {
      const systemId = planet.NaturalId.replace(/[a-z]$/, '')
      if (!systemsPlanetsMap.has(systemId)) {
        systemsPlanetsMap.set(systemId, [])
      }
      systemsPlanetsMap.get(systemId).push(planet)
    }
  })
}

export async function loadAllData() {
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    if (initStarted) return

    console.log('[DataFetch] Loading data from GitHub...')

    const [
      systemStarsData,
      linksData,
      systemPlanetsData,
      planetDetailData,
      planetResourcesData,
      systemFactionsData
    ] = await Promise.all([
      fetchJSONFromGitHub('systemstars_allstars.json'),
      fetchFromGitHub('csv_systemlinks.csv'),
      fetchFromGitHub('csv_systemplanets.csv'),
      fetchFromGitHub('csv_planetdetail.csv'),
      fetchFromGitHub('csv_planetresources.csv'),
      fetchJSONFromGitHub('system_factions.json')
    ])

    systemsCache = systemStarsData || []
    linksCache = parseCSV(linksData)
    planetsCache = parseCSV(systemPlanetsData)
    planetsDetailCache = parseCSV(planetDetailData)
    planetsResourcesCache = parseCSV(planetResourcesData)
    factionDataCache = systemFactionsData || { systemFactions: {}, planetFactions: {} }

    buildPlanetsCache()
    initStarted = true

    console.log(`[DataFetch] Loaded ${systemsCache.length} systems, ${linksCache.length} links, ${planetsCache.length} planets`)
  })()

  return initPromise
}

export function initPlanetsCache() {
  if (!initStarted) {
    loadAllData()
  }
}

export function parseSystems() {
  if (!systemsCache) {
    return []
  }

  return systemsCache.map(system => ({
    SystemId: system.SystemId,
    NaturalId: system.SystemNaturalId || system.NaturalId,
    Name: system.SystemName || system.Name || system.SystemNaturalId,
    Type: system.Type,
    PositionX: system.PositionX,
    PositionY: system.PositionY,
    PositionZ: system.PositionZ,
    SectorId: system.SectorId,
    SubSectorId: system.SubSectorId,
    Connections: []
  }))
}

export function parseLinks() {
  return linksCache || []
}

function getSystemFaction(system) {
  if (!system || !factionDataCache) return null
  // 1) 命中 systemFactions 直接表（FIO 系统级派系）
  const direct = factionDataCache.systemFactions?.[system.SystemId]
  if (direct) return direct
  // 2) 兜底：从 planetFactions 聚合（system_factions.json 中 systemFactions 为空时）
  return aggregateSystemFactionFromPlanets(system.NaturalId)
}

function aggregateSystemFactionFromPlanets(systemNaturalId) {
  const planetFactions = factionDataCache?.planetFactions
  if (!planetFactions || !systemNaturalId) return null
  const planets = systemsPlanetsMap?.get(systemNaturalId) || []
  if (planets.length === 0) return null

  const counts = Object.create(null)
  for (const planet of planets) {
    const code = planetFactions[planet.NaturalId?.toUpperCase()]
    if (code && FACTION_COLORS[code]) counts[code] = (counts[code] || 0) + 1
  }
  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  // 多数派；并列时按派系代码字典序
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return entries[0][0]
}

export function getSystemFactionColor(system) {
  const factionCode = getSystemFaction(system)
  if (factionCode) {
    return FACTION_COLORS[factionCode] || '#FFFFFF'
  }
  return '#FFFFFF'
}

export function getSystemFactionName(system) {
  const factionCode = getSystemFaction(system)
  if (factionCode) {
    return FACTION_NAMES[factionCode] || 'Unknown'
  }
  return 'No Faction'
}

export function getPlanetsBySystem(systemNaturalId) {
  if (!systemsPlanetsMap) {
    return []
  }
  return systemsPlanetsMap.get(systemNaturalId) || []
}

export function getSystemsPlanetsMap() {
  if (!systemsPlanetsMap) {
    buildPlanetsCache()
  }
  return systemsPlanetsMap
}
