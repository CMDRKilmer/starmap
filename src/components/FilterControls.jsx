import { UI_THEME } from '../utils/colors'

export function FilterGroup({ title, icon, children }) {
  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.2)',
      padding: '8px 10px',
      borderRadius: '6px',
      border: `1px solid ${UI_THEME.border}`
    }}>
      <div style={{
        color: UI_THEME.secondary,
        fontSize: '11px',
        fontWeight: 'bold',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span>{icon}</span>
        {title}
      </div>
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {children}
      </div>
    </div>
  )
}

export function FilterCheckbox({ label, checked, onChange, color }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      cursor: 'pointer',
      userSelect: 'none'
    }}>
      <div
        onClick={onChange}
        style={{
          width: '14px',
          height: '14px',
          border: `1px solid ${checked ? color : UI_THEME.border}`,
          borderRadius: '3px',
          background: checked ? color : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0
        }}
      >
        {checked && (
          <span style={{ color: '#0a0a0f', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
        )}
      </div>
      <span style={{
        color: checked ? UI_THEME.white : UI_THEME.textMuted,
        fontSize: '11px',
        transition: 'color 0.2s'
      }}>
        {label}
      </span>
    </label>
  )
}