import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function GeometryAreaComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="green"
      buttonLabel="切换图形"
      buttonHint="点击后只展示面积 / 周长的轻量状态"
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">图形</div>
            <div className={`mt-3 h-24 rounded-[24px] border-2 transition-all duration-300 ${active ? 'border-green-400 bg-green-50' : 'border-[var(--color-canvas-soft-2)] bg-[var(--color-canvas-soft)]'}`} />
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${active ? 'bg-green-600 text-white' : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}>
            面积 / 周长
          </div>
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">基础关系</div>
            <div className="mt-2 text-sm text-[var(--color-ink)]">长、宽、边长只做展示</div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}
