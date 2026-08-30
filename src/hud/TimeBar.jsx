// 底部时间轴（行星系页）：当前位置实时时钟 + 播放/暂停 + 可修改的未来目标时间（跳转）。
// 时间显示始终跟随真实时钟（每秒走 1 秒）；游戏时间默认不变，仅跳转/手动播放改变行星位置。
import { useEffect, useState } from 'react'
import { useTimeStore } from '../stores/timeStore'
import { unixMsToGameSec } from '../orbit/time.js'
import { UI_THEME } from '../utils/colors'

// 毫秒 → 用户本地时间可读文本（显示到秒；游戏计算仍用游戏世界时）
function formatLocal(ms) {
  if (Number.isNaN(ms)) return '--'
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// 毫秒 → datetime-local 输入值（本地时区 YYYY-MM-DDTHH:mm）
function toLocalInput(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const DAY_MS = 24 * 3600 * 1000

export default function TimeBar() {
  const playing = useTimeStore((s) => s.playing)
  const togglePlay = useTimeStore((s) => s.togglePlay)

  // 实时时钟：每秒刷新当前位置显示
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 目标时间初始值：当前时刻 + 30 天（可修改）
  const [target, setTarget] = useState(() => toLocalInput(Date.now() + 30 * DAY_MS))

  const jump = () => {
    const ms = new Date(target).getTime()
    if (Number.isNaN(ms)) return
    useTimeStore.getState().setTime(unixMsToGameSec(ms))
    setTarget(toLocalInput(ms + 30 * DAY_MS))
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: UI_THEME.background,
      border: `1px solid ${UI_THEME.border}`,
      borderRadius: '8px',
      padding: '8px 16px',
      fontFamily: 'Roboto Mono, monospace',
      color: UI_THEME.primary,
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      zIndex: 50,
      whiteSpace: 'nowrap'
    }}>
      <span style={{ fontSize: '11px', color: '#88ccff' }}>
        当前位置: <span style={{ color: UI_THEME.primary }}>{formatLocal(nowMs)}</span>
      </span>

      <button
        onClick={() => useTimeStore.getState().goNow()}
        title="回到当前时间并恢复播放"
        style={buttonStyle(UI_THEME.primary)}
      >
        当前时间
      </button>

      <button
        onClick={togglePlay}
        title={playing ? '暂停' : '播放'}
        style={{ ...buttonStyle(UI_THEME.primary), background: 'rgba(0, 255, 255, 0.15)' }}
      >
        {playing ? '⏸' : '▶'}
      </button>

      <span style={{ fontSize: '11px', color: '#88ccff' }}>目标:</span>
      <input
        type="datetime-local"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: `1px solid ${UI_THEME.border}`,
          borderRadius: '4px',
          color: UI_THEME.primary,
          fontFamily: 'Roboto Mono, monospace',
          fontSize: '11px',
          padding: '4px 6px',
          outline: 'none'
        }}
      />
      <button
        onClick={jump}
        title="跳转到目标时间（行星将瞬移到该时刻位置）"
        style={buttonStyle(UI_THEME.primary)}
      >
        跳转
      </button>
    </div>
  )
}

function buttonStyle(color) {
  return {
    background: 'transparent',
    border: `1px solid ${color}`,
    color,
    cursor: 'pointer',
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '4px',
    minHeight: '24px',
    lineHeight: 1
  }
}
