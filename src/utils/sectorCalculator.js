export function groupBySector(systems) {
  const sectors = {}

  systems.forEach(system => {
    const sectorId = system.SectorId || 'unknown'
    if (!sectors[sectorId]) {
      sectors[sectorId] = {
        id: sectorId,
        systems: [],
        prefixCount: {},
        bounds: {
          minX: Infinity, maxX: -Infinity,
          minY: Infinity, maxY: -Infinity,
          minZ: Infinity, maxZ: -Infinity
        }
      }
    }
    sectors[sectorId].systems.push(system)

    const prefix = system.NaturalId.substring(0, 2)
    sectors[sectorId].prefixCount[prefix] = (sectors[sectorId].prefixCount[prefix] || 0) + 1

    const { PositionX, PositionY, PositionZ } = system
    sectors[sectorId].bounds.minX = Math.min(sectors[sectorId].bounds.minX, PositionX)
    sectors[sectorId].bounds.maxX = Math.max(sectors[sectorId].bounds.maxX, PositionX)
    sectors[sectorId].bounds.minY = Math.min(sectors[sectorId].bounds.minY, PositionY)
    sectors[sectorId].bounds.maxY = Math.max(sectors[sectorId].bounds.maxY, PositionY)
    sectors[sectorId].bounds.minZ = Math.min(sectors[sectorId].bounds.minZ, PositionZ)
    sectors[sectorId].bounds.maxZ = Math.max(sectors[sectorId].bounds.maxZ, PositionZ)
  })

  Object.keys(sectors).forEach(id => {
    const b = sectors[id].bounds
    
    // 计算中心点
    b.centerX = (b.minX + b.maxX) / 2
    b.centerY = (b.minY + b.maxY) / 2
    b.centerZ = (b.minZ + b.maxZ) / 2
    
    // 计算每个系统到边界的距离，找到最小距离
    let minDistanceToBoundary = Infinity
    
    sectors[id].systems.forEach(system => {
      const dx = Math.min(
        Math.abs(system.PositionX - b.minX),
        Math.abs(system.PositionX - b.maxX)
      )
      const dy = Math.min(
        Math.abs(system.PositionY - b.minY),
        Math.abs(system.PositionY - b.maxY)
      )
      const dz = Math.min(
        Math.abs(system.PositionZ - b.minZ),
        Math.abs(system.PositionZ - b.maxZ)
      )
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      minDistanceToBoundary = Math.min(minDistanceToBoundary, distance)
    })
    
    // 保存最小边界距离
    b.minDistanceToBoundary = minDistanceToBoundary
    
    // 根据系统分布计算更紧凑的边界
    const sizeX = b.maxX - b.minX
    const sizeY = b.maxY - b.minY
    const sizeZ = b.maxZ - b.minZ
    
    // 计算系统到中心的最大距离（用于确定实际需要的半径）
    let maxDistanceFromCenter = 0
    sectors[id].systems.forEach(system => {
      const dx = system.PositionX - b.centerX
      const dy = system.PositionY - b.centerY
      const dz = system.PositionZ - b.centerZ
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      maxDistanceFromCenter = Math.max(maxDistanceFromCenter, distance)
    })
    
    // 保存紧凑半径（系统到中心的最大距离）
    b.compactRadius = maxDistanceFromCenter
    
    // 缩小扇区边界（使用紧凑半径的1.1倍作为边界）
    const shrinkFactor = 0.9
    const halfSizeX = sizeX * shrinkFactor / 2
    const halfSizeY = sizeY * shrinkFactor / 2
    const halfSizeZ = sizeZ * shrinkFactor / 2
    
    b.minX = b.centerX - halfSizeX
    b.maxX = b.centerX + halfSizeX
    b.minY = b.centerY - halfSizeY
    b.maxY = b.centerY + halfSizeY
    b.minZ = b.centerZ - halfSizeZ
    b.maxZ = b.centerZ + halfSizeZ

    let maxCount = 0
    let dominantPrefix = 'XX'
    Object.keys(sectors[id].prefixCount).forEach(prefix => {
      if (sectors[id].prefixCount[prefix] > maxCount) {
        maxCount = sectors[id].prefixCount[prefix]
        dominantPrefix = prefix
      }
    })
    sectors[id].name = dominantPrefix
  })

  return sectors
}

export function getSectorColor(sectorId) {
  return 'hsla(0, 0%, 50%, 0.15)'
}
