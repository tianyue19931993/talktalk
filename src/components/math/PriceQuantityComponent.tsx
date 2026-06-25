import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function PriceQuantityComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="pink"
      buttonLabel="查看价格关系"
      buttonHint="点击后只展示价格、数量、总价的关系"
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: '单价', value: '每个多少钱' },
            { label: '数量', value: '有几个' },
            { label: '总价', value: '合起来多少钱' },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`rounded-[20px] border p-4 transition-all duration-300 ${
                active && index === 2
                  ? 'border-[var(--color-highlight-pink)] bg-[rgba(255,0,128,0.05)]'
                  : 'border-[var(--color-hairline)] bg-white'
              }`}
            >
              <div className="text-[11px] text-[var(--color-mute)]">{item.label}</div>
              <div className="mt-2 text-sm font-medium text-[var(--color-ink)]">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </MathComponentShell>
  )
}
