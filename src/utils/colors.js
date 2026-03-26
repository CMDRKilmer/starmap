export const FACTION_COLORS = {
  'IC': '#4CAF50',
  'CI': '#FFEB3B',
  'NC': '#2196F3',
  'AI': '#F44336',
};

export const FACTION_NAMES = {
  'IC': 'Insitor Cooperative',
  'CI': 'Castillo-Ito Mercantile',
  'NC': 'NEO Charter Exploration',
  'AI': 'Antares Initiative',
};

export const MINERAL_COLORS = {
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
};

export const ENV_COLORS = {
  high: '#FF4500',
  normal: '#32CD32',
  low: '#1E90FF',
};

export const UI_THEME = {
  primary: '#00ffff',
  secondary: '#88ccff',
  background: 'rgba(10, 20, 40, 0.9)',
  backgroundSolid: '#0a0a0f',
  surface: 'rgba(0, 255, 255, 0.1)',
  surfaceHover: 'rgba(0, 255, 255, 0.25)',
  border: 'rgba(0, 255, 255, 0.3)',
  borderActive: 'rgba(0, 255, 255, 0.5)',
  text: '#00ffff',
  textSecondary: '#88ccff',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  white: '#ffffff',
  searchHighlight: '#FF00FF',
  warning: '#FF4500',
  error: '#FF4500',
  mineralDefault: '#888888',
  rockColor: '#FFA500',
  gasColor: '#87CEEB',
  gold: '#FFD700',
};

export function getEnvColor(value, normalValue, lowThreshold, highThreshold) {
  if (value > highThreshold) return ENV_COLORS.high;
  if (value < lowThreshold) return ENV_COLORS.low;
  return ENV_COLORS.normal;
}