import { UI_THEME } from '../utils/colors'

export default function SectorNav({ sectors, onSectorClick }) {
  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      width: '280px',
      maxHeight: '80vh',
      overflow: 'auto',
      background: UI_THEME.background,
      border: `1px solid ${UI_THEME.border}`,
      borderRadius: '8px',
      padding: '15px',
      fontFamily: 'Roboto Mono, monospace',
      color: UI_THEME.primary
    }}>
      <h2 style={{
        fontSize: '14px',
        marginBottom: '15px',
        paddingBottom: '10px',
        borderBottom: `1px solid ${UI_THEME.border}`,
        fontFamily: 'Orbitron, sans-serif',
        letterSpacing: '1px'
      }}>
        扇区导航 / SECTORS
      </h2>
      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        {Object.keys(sectors).sort().map(sectorId => (
          <div
            key={sectorId}
            onClick={() => onSectorClick(sectorId)}
            style={{
              padding: '8px',
              marginBottom: '5px',
              background: UI_THEME.surface,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = UI_THEME.surfaceHover}
            onMouseOut={(e) => e.target.style.background = UI_THEME.surface}
          >
            <span style={{ color: UI_THEME.secondary }}>{sectors[sectorId].name}</span>
            <span style={{ float: 'right', opacity: 0.7 }}>
              {sectors[sectorId].systems.length} 系统
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}