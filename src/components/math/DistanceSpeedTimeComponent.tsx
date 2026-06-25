import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function DistanceSpeedTimeComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="blue"
      buttonLabel="演示路程关系"
      buttonHint="点击后只做轻量状态变化"
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: '速度', value: '每小时走多快' },
            { label: '时间', value: '走了多久' },
            { label: '路程', value: '走了多远' },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`rounded-[20px] border p-4 transition-all duration-300 ${
                active && index === 2
                  ? 'border-[var(--color-link)] bg-[var(--color-link-bg-soft)]'
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
