import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function RemainderComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="green"
      buttonLabel="高亮剩余"
      buttonHint="点击后只做剩余状态切换"
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">过程</div>
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-ink)]">
              <span className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5">总数</span>
              <span>−</span>
              <span className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5">用掉部分</span>
              <span>=</span>
              <span className={`rounded-full px-3 py-1.5 transition-colors ${active ? 'bg-green-600 text-white' : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}>
                剩余
              </span>
            </div>
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-green-300 bg-green-50' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">剩余展示</div>
            <div className="mt-2 text-sm text-[var(--color-ink)]">{active ? '剩余部分被轻轻抬亮' : '点击按钮让剩余部分更醒目'}</div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}
