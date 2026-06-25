import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function GenericLogicComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="purple"
      buttonLabel="切换通用态"
      buttonHint="作为兜底，只展示一个通用的关系卡片"
    >
      {(active) => (
        <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-link)] bg-[var(--color-link-bg-soft)]' : 'border-[var(--color-hairline)] bg-white'}`}>
          <div className="text-[11px] text-[var(--color-mute)]">通用逻辑</div>
          <div className="mt-2 text-sm text-[var(--color-ink)]">
            {active ? '已进入轻量高亮态' : '等待更具体的逻辑块来接管'}
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}
