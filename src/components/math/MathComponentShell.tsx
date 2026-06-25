import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '../ui/Button'
import type { MathAnalysis, MathBlock, MathComponentMode } from './mathTypes'

type Accent = 'purple' | 'pink' | 'blue' | 'green'

const accentMap: Record<Accent, string> = {
  purple: 'from-[rgba(121,40,202,0.14)] to-[rgba(121,40,202,0.04)] border-[rgba(121,40,202,0.18)]',
  pink: 'from-[rgba(255,0,128,0.14)] to-[rgba(255,0,128,0.04)] border-[rgba(255,0,128,0.18)]',
  blue: 'from-[rgba(0,112,243,0.14)] to-[rgba(0,112,243,0.04)] border-[rgba(0,112,243,0.18)]',
  green: 'from-[rgba(34,197,94,0.14)] to-[rgba(34,197,94,0.04)] border-[rgba(34,197,94,0.18)]',
}

const modeLabel: Record<MathComponentMode, string> = {
  discover: '发现',
  explain: '讲解',
  challenge: '挑战',
  review: '复习',
}

export function MathComponentShell({
  block,
  mathAnalysis,
  mode = 'discover',
  accent = 'purple',
  buttonLabel = '切换状态',
  buttonHint = '点击后只做轻量状态变化',
  children,
}: {
  block: MathBlock
  mathAnalysis?: MathAnalysis
  mode?: MathComponentMode
  accent?: Accent
  buttonLabel?: string
  buttonHint?: string
  children: (active: boolean) => ReactNode
}) {
  const [active, setActive] = useState(false)

  const summary = useMemo(() => {
    const known = mathAnalysis?.known_conditions?.slice(0, 2).map((item) => item.text).filter(Boolean) ?? []
    const hidden = mathAnalysis?.hidden_conditions?.slice(0, 2).map((item) => item.text).filter(Boolean) ?? []
    const goal = mathAnalysis?.goal?.text || ''
    return { known, hidden, goal }
  }, [mathAnalysis])

  return (
    <div className={`overflow-hidden rounded-[28px] border bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]`}>
      <div className={`border-b ${accentMap[accent]} bg-gradient-to-br px-5 py-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink)] shadow-sm">
                组件名：{block.math_component}
              </span>
              <span className="rounded-full bg-white/75 px-2.5 py-1 text-[11px] text-[var(--color-body)]">
                {modeLabel[mode]}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-[var(--color-ink)]">{block.type}</h3>
            <p className="mt-1 text-sm text-[var(--color-body)]">对象：{block.subject}</p>
          </div>
          <div className="rounded-[20px] bg-white/80 px-3 py-2 text-right shadow-sm backdrop-blur">
            <div className="text-[11px] text-[var(--color-mute)]">状态</div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--color-ink)]">{active ? '已激活' : '待激活'}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {(summary.known.length > 0 || summary.hidden.length > 0 || summary.goal) && (
          <div className="grid gap-3 md:grid-cols-3">
            {summary.known.length > 0 && (
              <div className="rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-3">
                <div className="text-[11px] text-[var(--color-mute)]">已知条件</div>
                <div className="mt-1 space-y-1">
                  {summary.known.map((item) => (
                    <div key={item} className="text-sm text-[var(--color-ink)]">{item}</div>
                  ))}
                </div>
              </div>
            )}
            {summary.hidden.length > 0 && (
              <div className="rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-3">
                <div className="text-[11px] text-[var(--color-mute)]">隐含条件</div>
                <div className="mt-1 space-y-1">
                  {summary.hidden.map((item) => (
                    <div key={item} className="text-sm text-[var(--color-ink)]">{item}</div>
                  ))}
                </div>
              </div>
            )}
            {summary.goal && (
              <div className="rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-3">
                <div className="text-[11px] text-[var(--color-mute)]">目标</div>
                <div className="mt-1 text-sm text-[var(--color-ink)]">{summary.goal}</div>
              </div>
            )}
          </div>
        )}

        <div
          className={`rounded-[24px] border bg-gradient-to-br px-4 py-4 transition-all duration-300 ${
            active
              ? 'translate-y-0 border-[rgba(0,112,243,0.2)] shadow-[0_12px_28px_rgba(0,112,243,0.08)]'
              : 'border-[var(--color-hairline)]'
          } ${accentMap[accent]}`}
        >
          {children(active)}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[var(--color-body)]">{buttonHint}</div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary-sm"
              size="sm"
              onClick={() => setActive(false)}
            >
              重置
            </Button>
            <Button
              variant="primary-sm"
              size="sm"
              onClick={() => setActive((v) => !v)}
            >
              {buttonLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
