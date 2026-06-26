import { useMemo, useState } from 'react'
import { PreviewCard } from '../../components/preview/stageOneBlocks'
import { MathComponentRenderer, MATH_COMPONENT_CATALOG } from '../../components/math'

export default function MathComponentPreviewPage() {
  return <MathComponentPreviewPanel />
}

export function MathComponentPreviewPanel() {
  const [selected, setSelected] = useState(MATH_COMPONENT_CATALOG[0]?.mathComponent ?? 'GenericLogicComponent')

  const activeItem = useMemo(
    () => MATH_COMPONENT_CATALOG.find((item) => item.mathComponent === selected) ?? MATH_COMPONENT_CATALOG[0],
    [selected],
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <PreviewCard title="逻辑块列表" hint="每个逻辑块都对应一个数学组件">
            <div className="space-y-2">
              {MATH_COMPONENT_CATALOG.map((item) => {
                const isActive = item.mathComponent === activeItem?.mathComponent
                return (
                  <button
                    key={item.mathComponent}
                    type="button"
                    onClick={() => setSelected(item.mathComponent)}
                    className={`w-full rounded-[var(--radius-xl)] border px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-[var(--color-link)] bg-[var(--color-link-bg-soft)] shadow-[0_8px_24px_rgba(0,112,243,0.08)]'
                        : 'border-[var(--color-hairline)] bg-white hover:border-[var(--color-link)]/50 hover:bg-[var(--color-canvas-soft)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`text-sm font-semibold ${isActive ? 'text-[var(--color-link)]' : 'text-[var(--color-ink)]'}`}>
                          {item.title}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-[var(--color-mute)]">{item.description}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.blocks.map((block) => (
                        <span key={block} className="rounded-full bg-[var(--color-canvas-soft)] px-2.5 py-1 text-[11px] text-[var(--color-body)]">
                          {block}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </PreviewCard>
        </aside>

        <main className="space-y-6">
          {activeItem && (
            <PreviewCard title={activeItem.title} hint={`${activeItem.mathComponent} · ${activeItem.blocks.join(' / ')}`}>
              <MathComponentRenderer block={activeItem.block} />
            </PreviewCard>
          )}
        </main>
      </div>
    </div>
  )
}
