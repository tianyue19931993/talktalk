import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function MultipleComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="purple"
      buttonLabel="展示倍数"
      buttonHint="点击后只切换倍数关系"
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">一个数</div>
            <div className="mt-2 text-lg font-semibold text-[var(--color-ink)]">基础单位</div>
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${active ? 'bg-[var(--color-link)] text-white' : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}>
            × 倍数
          </div>
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">几倍后</div>
            <div className="mt-2 text-lg font-semibold text-[var(--color-ink)]">放大关系</div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}
