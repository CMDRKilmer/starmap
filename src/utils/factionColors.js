// 派系颜色映射
export const FACTION_COLORS = {
  'IC': '#4CAF50',  // Insitor Cooperative - 绿色
  'CI': '#9C27B0',  // Castillo-Ito Mercantile - 紫色
  'NC': '#2196F3',  // NEO Charter Exploration - 蓝色
  'AI': '#FF9800',  // Antares Initiative - 橙色
};

// 派系名称映射
export const FACTION_NAMES = {
  'IC': 'Insitor Cooperative',
  'CI': 'Castillo-Ito Mercantile',
  'NC': 'NEO Charter Exploration',
  'AI': 'Antares Initiative',
};

// 获取派系颜色
export function getFactionColor(factionCode) {
  return FACTION_COLORS[factionCode] || '#FFFFFF'; // 默认白色
}

// 获取派系名称
export function getFactionName(factionCode) {
  return FACTION_NAMES[factionCode] || 'Unknown';
}
