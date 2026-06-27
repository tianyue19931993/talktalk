import { MathComponentRenderer, MATH_COMPONENT_CATALOG } from '../../components/math'
import { PreviewCard } from '../../components/preview/stageOneBlocks'

export default function MathComponentPreviewPage() {
  return (
    <div className="space-y-6">
      <PreviewCard
        title="数学组件"
        hint="这里不再单独切换组件了，直接按三列分区展示所有组件的轻量预览。"
      >
        <div className="flex flex-wrap gap-2 text-xs text-[var(--color-body)]">
          <span className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1">
            共 {MATH_COMPONENT_CATALOG.length} 个组件
          </span>
          <span className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1">
            一行三个组件区
          </span>
          <span className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1">
            每个分区独立预览
          </span>
        </div>
      </PreviewCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MATH_COMPONENT_CATALOG.map((item) => (
          <section
            key={item.mathComponent}
            className="rounded-[28px] border border-[var(--color-hairline)] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--color-ink)]">
                  {item.title}
                </div>
              </div>
              <div className="shrink-0 rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1 text-[11px] font-medium text-[var(--color-link)]">
                {item.blocks.length} 类逻辑
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.blocks.map((block) => (
                <span
                  key={block}
                  className="rounded-full bg-[var(--color-canvas-soft)] px-2.5 py-1 text-[11px] text-[var(--color-body)]"
                >
                  {block}
                </span>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-3">
              <div className="mb-3 flex items-center justify-between text-[11px] text-[var(--color-mute)]">
                <span>轻量预览</span>
                <span>{item.mathComponent}</span>
              </div>
              <div className="scale-[0.9] origin-top-left">
                <MathComponentRenderer block={item.block} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
