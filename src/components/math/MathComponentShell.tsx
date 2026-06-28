import { useMemo, useState, type ReactNode } from 'react'
import type { LogicBlock } from './mathTypes'
import { buildVisualMeta } from './mathHelpers'

type MathComponentShellProps = {
  block: LogicBlock
  buttonLabel?: string
  children: (active: boolean, visual: ReturnType<typeof buildVisualMeta>) => ReactNode
}

export function MathComponentShell({
  block,
  buttonLabel,
  children,
}: MathComponentShellProps) {
  const [active, setActive] = useState(false)
  const visual = useMemo(() => buildVisualMeta(block.visual_object), [block.visual_object])

  return (
    <div className="min-w-0 space-y-3 rounded-[24px] border border-[#f0f0f0] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
      {children(active, visual)}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActive(false)}
          className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#f5f5f5] px-5 text-sm font-medium text-[#525252]"
        >
          重置
        </button>
        <button
          type="button"
          onClick={() => setActive((value) => !value)}
          className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#0070F3] bg-[#0070F3] px-5 text-sm font-medium text-white"
        >
          {buttonLabel || '开始'}
        </button>
      </div>
    </div>
  )
}
