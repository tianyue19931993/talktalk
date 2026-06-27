import { useMemo, useState, type ReactNode } from 'react'
import type { LogicBlock } from './mathTypes'
import { buildVisualMeta, type MathTone } from './mathHelpers'

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
  children,
}: MathComponentShellProps) {
  const [active, setActive] = useState(false)
  const visual = useMemo(() => buildVisualMeta(block.visual_object), [block.visual_object])

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--color-hairline)] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActive(false)}
              className="inline-flex items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FAFAFA]"
            >
              重置
            </button>
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              className="inline-flex items-center justify-center rounded-[14px] bg-[#0070F3] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-95"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
