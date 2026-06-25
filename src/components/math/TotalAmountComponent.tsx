import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function TotalAmountComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="purple"
      buttonLabel="高亮总量"
      buttonHint="点击只切换高亮，不做真实计算"
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: '每份数', value: '每份 8' },
            { label: '份数', value: '3 份' },
            { label: '总量', value: '合起来' },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`rounded-[20px] border bg-white p-4 transition-all duration-300 ${
                active && index === 2
                  ? 'border-[var(--color-link)] shadow-[0_10px_24px_rgba(0,112,243,0.08)]'
                  : 'border-[var(--color-hairline)]'
              }`}
            >
              <div className="text-[11px] text-[var(--color-mute)]">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </MathComponentShell>
  )
}
