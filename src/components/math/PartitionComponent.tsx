import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function PartitionComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="blue"
      buttonLabel="切换分配"
      buttonHint="点击后只展示分成状态"
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">公式感</div>
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-ink)]">
              <span className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1.5">总量</span>
              <span>÷</span>
              <span className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5">份数</span>
              <span>=</span>
              <span className={`rounded-full px-3 py-1.5 transition-colors ${active ? 'bg-[var(--color-link)] text-white' : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}>
                每份数
              </span>
            </div>
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-link)] bg-[var(--color-link-bg-soft)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">分配状态</div>
            <div className="mt-2 text-sm text-[var(--color-ink)]">把整体切成一样多的小份</div>
            <div className="mt-3 h-2 rounded-full bg-[var(--color-canvas-soft)]">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]" style={{ width: active ? '78%' : '42%' }} />
            </div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}
