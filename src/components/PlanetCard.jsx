import { getEnvColor, UI_THEME } from '../utils/colors'

export default function PlanetCard({ planet }) {
  return (
    <div style={{
      padding: '20px 22px',
      marginBottom: '12px',
      background: 'rgba(0, 255, 255, 0.05)',
      borderRadius: '6px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{
        color: UI_THEME.white,
        fontWeight: 'bold',
        marginBottom: '8px',
        fontSize: '16px'
      }}>
        {planet.Name}
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        opacity: 0.9,
        fontSize: '14px',
        flexWrap: 'wrap'
      }}>
        <span style={{ color: UI_THEME.white }}>
          重力: <span style={{ color: getEnvColor(parseFloat(planet.Gravity), 1, 0.5, 1.5) }}>
            {parseFloat(planet.Gravity).toFixed(2)}g
          </span>
        </span>
        <span style={{ color: UI_THEME.white }}>
          温度: <span style={{ color: getEnvColor(parseFloat(planet.Temperature), 20, -50, 50) }}>
            {parseFloat(planet.Temperature).toFixed(0)}°C
          </span>
        </span>
        <span style={{ color: UI_THEME.white }}>
          压力: <span style={{ color: getEnvColor(parseFloat(planet.Pressure), 1, 0.1, 2) }}>
            {parseFloat(planet.Pressure).toFixed(2)}
          </span>
        </span>
        {planet.Fertility && planet.Fertility !== '-1' && (
          <span style={{ color: UI_THEME.white }}>
            肥沃度: <span style={{ color: getEnvColor(parseFloat(planet.Fertility), 0, -0.5, 0.5) }}>
              {parseFloat(planet.Fertility).toFixed(2)}
            </span>
          </span>
        )}
        {planet.Surface && (
          <span style={{ color: UI_THEME.white }}>
            类型: <span style={{ color: planet.Surface === 'True' ? '#FFA500' : '#87CEEB' }}>
              {planet.Surface === 'True' ? '岩质' : '气态'}
            </span>
          </span>
        )}
      </div>

      <div style={{
        marginTop: '8px',
        fontSize: '13px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span style={{ color: UI_THEME.white }}>设施: </span>
        {planet.HasLocalMarket && <span style={{ color: UI_THEME.white }}>本地市场</span>}
        {planet.HasChamberOfCommerce && <span style={{ color: UI_THEME.white }}>商会</span>}
        {planet.HasWarehouse && <span style={{ color: UI_THEME.white }}>仓库</span>}
        {planet.HasAdministrationCenter && <span style={{ color: UI_THEME.white }}>行政中心</span>}
        {planet.HasShipyard && <span style={{ color: UI_THEME.white }}>造船厂</span>}
      </div>

      {planet.Resources && planet.Resources.length > 0 && (
        <div style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: `1px solid ${UI_THEME.border}`
        }}>
          <div style={{ color: UI_THEME.secondary, marginBottom: '8px', fontSize: '13px' }}>矿产:</div>
          <div style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
            {planet.Resources.map((resource, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: UI_THEME.white }}>{resource.Ticker} ({resource.Type})</span>
                  <span style={{ color: UI_THEME.white }}>{(resource.Factor * 100).toFixed(1)}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(0, 255, 255, 0.2)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      width: `${Math.min(resource.Factor * 100, 100)}%`,
                      height: '100%',
                      background: UI_THEME.primary,
                      borderRadius: '3px'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}