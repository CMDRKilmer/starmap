export const ENV_THRESHOLDS = {
  gravity: { low: 0.5, high: 1.5 },
  temperature: { low: -50, high: 50 },
  pressure: { low: 0.1, high: 2 },
  fertility: { low: -0.5, high: 0.5 }
}

export function matchEnvFilter(value, filter, thresholds) {
  if (!filter || filter.length === 0) return true

  const val = parseFloat(value) || 0

  for (const level of filter) {
    if (level === 'high' && val >= thresholds.high) return true
    if (level === 'mid' && val >= thresholds.low && val <= thresholds.high) return true
    if (level === 'low' && val <= thresholds.low) return true
  }

  return false
}

export function matchSurfaceFilter(surface, filter) {
  if (!filter || filter.length === 0) return true
  const isRocky = surface === 'True'
  return filter.some(f => (f === 'rocky' && isRocky) || (f === 'gas' && !isRocky))
}

export function matchMineralFilter(resources, filter) {
  if (!filter || filter.length === 0) return true
  if (!resources || resources.length === 0) return false
  return filter.every(mineral =>
    resources.some(r => r.Ticker === mineral)
  )
}

export function matchFertilityFilter(fertility, filter) {
  if (!filter || filter.length === 0) return true
  const hasFertility = fertility !== undefined && fertility !== null && fertility !== '' && fertility !== '-1'
  return filter.some(f => (f === 'yes' && hasFertility))
}

export function applyPlanetFilters(planet, filters) {
  if (!planet) return false

  const { gravity, temperature, pressure, surface, minerals, fertility } = filters

  if (gravity?.length > 0) {
    const g = parseFloat(planet.Gravity) || 0
    if (!matchEnvFilter(g, gravity, ENV_THRESHOLDS.gravity)) return false
  }

  if (temperature?.length > 0) {
    const t = parseFloat(planet.Temperature) || 0
    if (!matchEnvFilter(t, temperature, ENV_THRESHOLDS.temperature)) return false
  }

  if (pressure?.length > 0) {
    const p = parseFloat(planet.Pressure) || 0
    if (!matchEnvFilter(p, pressure, ENV_THRESHOLDS.pressure)) return false
  }

  if (surface?.length > 0) {
    if (!matchSurfaceFilter(planet.Surface, surface)) return false
  }

  if (minerals?.length > 0) {
    if (!matchMineralFilter(planet.Resources, minerals)) return false
  }

  if (fertility?.length > 0) {
    if (!matchFertilityFilter(planet.Fertility, fertility)) return false
  }

  return true
}