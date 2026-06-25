import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'

export function PointSegmentComponent({ block, mathAnalysis, mode }: MathComponentProps) {
  return (
    <MathComponentShell
      block={block}
      mathAnalysis={mathAnalysis}
      mode={mode}
      accent="purple"
      buttonLabel="点亮点段"
      buttonHint="点击后只展示点和段的连接关系"
    >
      {(active) => (
        <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
          <div className="text-[11px] text-[var(--color-mute)]">点段关系</div>
          <div className="mt-4 flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full transition-all duration-300 ${active && index <= 2 ? 'bg-[var(--color-link)]' : 'bg-[var(--color-canvas-soft-2)]'}`} />
                {index < 4 && <div className={`h-1 w-12 rounded-full transition-all duration-300 ${active && index < 3 ? 'bg-[var(--color-gradient-start)]' : 'bg-[var(--color-canvas-soft)]'}`} />}
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-[var(--color-body)]">{active ? '点和段的对应关系已轻量高亮' : '点击按钮让点和段更醒目'}</div>
        </div>
      )}
    </MathComponentShell>
  )
}
