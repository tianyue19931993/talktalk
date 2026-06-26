import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '../ui/Button'
import type { LogicBlock } from './mathTypes'
import { buildVisualMeta, getComponentNarration, type MathTone } from './mathHelpers'

const toneClassMap: Record<MathTone, string> = {
  purple: 'from-[rgba(121,40,202,0.16)] to-[rgba(121,40,202,0.05)]',
  pink: 'from-[rgba(255,0,128,0.16)] to-[rgba(255,0,128,0.05)]',
  blue: 'from-[rgba(0,112,243,0.16)] to-[rgba(0,112,243,0.05)]',
  green: 'from-[rgba(34,197,94,0.16)] to-[rgba(34,197,94,0.05)]',
  amber: 'from-[rgba(245,158,11,0.18)] to-[rgba(245,158,11,0.06)]',
}

type MathComponentShellProps = {
  block: LogicBlock
  tone?: MathTone
  buttonLabel?: string
  buttonHint?: string
  description?: string
  children: (active: boolean, visual: ReturnType<typeof buildVisualMeta>) => ReactNode
}

function chipClass(active: boolean, tone: MathTone) {
  const activeBorder: Record<MathTone, string> = {
    purple: 'border-[rgba(121,40,202,0.22)] bg-[rgba(121,40,202,0.08)] text-[var(--color-gradient-start)]',
    pink: 'border-[rgba(255,0,128,0.22)] bg-[rgba(255,0,128,0.08)] text-[var(--color-highlight-pink)]',
    blue: 'border-[rgba(0,112,243,0.22)] bg-[rgba(0,112,243,0.08)] text-[var(--color-link)]',
    green: 'border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-green-600',
    amber: 'border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.1)] text-amber-600',
  }

  return active
    ? `border ${activeBorder[tone]}`
    : 'border border-[var(--color-hairline)] bg-white text-[var(--color-body)]'
}

export function MathComponentShell({
  block,
  tone = 'purple',
  buttonLabel = '切换状态',
  buttonHint = '点击后只做轻量状态变化',
  description,
  children,
}: MathComponentShellProps) {
  const [active, setActive] = useState(false)
  const visual = useMemo(() => buildVisualMeta(block.visual_object), [block.visual_object])
  const narration = description || getComponentNarration(block)

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--color-hairline)] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className={`border-b bg-gradient-to-br px-5 py-4 ${toneClassMap[tone]}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${chipClass(false, tone)}`}>
                Step {block.step}
              </span>
              <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${chipClass(false, tone)}`}>
                {block.type}
              </span>
              <span className="rounded-full border border-[var(--color-hairline)] bg-white px-3 py-1 text-[11px] text-[var(--color-body)]">
                {block.component}
              </span>
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-mute)]">math_object</div>
              <div className="mt-1 text-lg font-semibold leading-7 text-[var(--color-ink)]">{block.math_object}</div>
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-mute)]">visual_object</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {visual.tokens.map((token) => (
                  <span
                    key={token}
                    className="rounded-full border border-[var(--color-hairline)] bg-white px-3 py-1 text-xs text-[var(--color-body)]"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>

            <p className="max-w-3xl text-sm leading-6 text-[var(--color-body)]">{narration}</p>
          </div>

          <div className="min-w-[190px] rounded-[22px] bg-white/88 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-mute)]">icon</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--color-canvas-soft)] text-4xl">
                {visual.emoji}
              </div>
              <div className="space-y-2">
                {visual.tokens.slice(0, 3).map((token, index) => (
                  <div
                    key={`${token}-${index}`}
                    className={`rounded-full px-3 py-1 text-xs transition-all duration-300 ${active ? 'bg-[var(--color-link)] text-white' : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}
                  >
                    {token}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div
          className={`rounded-[24px] border bg-gradient-to-br px-4 py-4 transition-all duration-300 ${
            active
              ? 'translate-y-0 border-[rgba(0,112,243,0.2)] shadow-[0_12px_28px_rgba(0,112,243,0.08)]'
              : 'border-[var(--color-hairline)]'
          } ${toneClassMap[tone]}`}
        >
          {children(active, visual)}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[var(--color-body)]">{buttonHint}</div>
          <Button variant="primary-sm" size="sm" onClick={() => setActive((v) => !v)}>
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
