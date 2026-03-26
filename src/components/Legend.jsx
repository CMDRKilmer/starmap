import { FACTION_COLORS, UI_THEME } from '../utils/colors'

export default function Legend() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: UI_THEME.background,
      border: `1px solid ${UI_THEME.border}`,
      borderRadius: '8px',
      padding: '10px 20px',
      fontFamily: 'Roboto Mono, monospace',
      color: UI_THEME.primary,
      display: 'flex',
      gap: '24px',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>派系</span>
        {Object.entries(FACTION_COLORS).map(([code, color]) => (
          <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: color,
              boxShadow: `0 0 4px ${color}`
            }}></div>
            <span style={{ fontSize: '9px' }}>{code}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: UI_THEME.white
          }}></div>
          <span style={{ fontSize: '9px' }}>无</span>
        </div>
      </div>

      <div style={{
        width: '1px',
        height: '20px',
        background: UI_THEME.border
      }}></div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>搜索结果</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: UI_THEME.searchHighlight,
            boxShadow: `0 0 6px ${UI_THEME.searchHighlight}`
          }}></div>
          <span style={{ fontSize: '9px', color: UI_THEME.searchHighlight }}>匹配</span>
        </div>
      </div>
    </div>
  )
}