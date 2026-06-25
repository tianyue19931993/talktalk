import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function DifferenceComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="pink"
      buttonLabel="高亮差"
      buttonHint="点击后只展示比较关系"
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">比较条</div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs text-[var(--color-body)]">大数</div>
                <div className={`h-4 flex-1 rounded-full transition-all ${active ? 'bg-[var(--color-link)]' : 'bg-[var(--color-canvas-soft)]'}`} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs text-[var(--color-body)]">小数</div>
                <div className="h-4 flex-1 rounded-full bg-[var(--color-canvas-soft)]" />
              </div>
            </div>
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-highlight-pink)] bg-[rgba(255,0,128,0.05)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">差额感</div>
            <div className="mt-2 text-sm text-[var(--color-ink)]">用高亮提示差出来的那一段</div>
            <div className="mt-3 rounded-full bg-[var(--color-canvas-soft)] px-4 py-2 text-sm text-[var(--color-body)]">
              {active ? '差值区域已点亮' : '点击按钮查看差额位置'}
            </div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}
