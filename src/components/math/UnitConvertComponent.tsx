import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function UnitConvertComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="blue"
      buttonLabel="切换单位"
      buttonHint="点击后只展示单位转换的轻量变化"
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-3">
          {['原单位', '统一后', '目标单位'].map((item, index) => (
            <div
              key={item}
              className={`rounded-[20px] border p-4 transition-all duration-300 ${
                active && index === 1
                  ? 'border-[var(--color-link)] bg-[var(--color-link-bg-soft)]'
                  : 'border-[var(--color-hairline)] bg-white'
              }`}
            >
              <div className="text-[11px] text-[var(--color-mute)]">{item}</div>
              <div className="mt-2 text-sm font-medium text-[var(--color-ink)]">{index === 1 ? '统一一下' : '保留原样'}</div>
            </div>
          ))}
        </div>
      )}
    </MathComponentShell>
  )
}
