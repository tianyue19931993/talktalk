import { useMemo, useState } from 'react'
import { MonitorUp, Sparkles } from 'lucide-react'
import { PreviewCard } from '../../components/preview/stageOneBlocks'
import { MATH_COMPONENT_CATALOG } from '../../components/math/catalog'

export default function MathComponentPreviewPage() {
  return <MathComponentPreviewPanel />
}

export function MathComponentPreviewPanel() {
  const [selected, setSelected] = useState(MATH_COMPONENT_CATALOG[0]?.mathComponent ?? 'GenericLogicComponent')

  const activeItem = useMemo(
    () => MATH_COMPONENT_CATALOG.find((item) => item.mathComponent === selected) ?? MATH_COMPONENT_CATALOG[0],
    [selected],
  )

  const ActiveComponent = activeItem?.component

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6 shadow-[var(--shadow-l2)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,0,128,0.10),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(0,112,243,0.10),transparent_28%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-hairline)] bg-white/80 px-3 py-1 text-xs text-[var(--color-body)] backdrop-blur">
              <MonitorUp className="h-3.5 w-3.5 text-[var(--color-link)]" />
              PC 预览区
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] md:text-3xl">
                数学组件预览库
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--color-body)] md:text-base">
                这里基于 logic_types 表里的数学组件配置，预览每一种数学关系组件。每个组件都只做轻量状态变化，不输出答案，也不做真实计算。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[460px]">
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white/80 p-3 backdrop-blur">
              <div className="text-xs text-[var(--color-mute)]">组件</div>
              <div className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{MATH_COMPONENT_CATALOG.length}</div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white/80 p-3 backdrop-blur">
              <div className="text-xs text-[var(--color-mute)]">状态</div>
              <div className="mt-1 text-lg font-semibold text-[var(--color-ink)]">可切换</div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white/80 p-3 backdrop-blur">
              <div className="text-xs text-[var(--color-mute)]">目标</div>
              <div className="mt-1 text-lg font-semibold text-[var(--color-ink)]">PC 优先</div>
            </div>
          </div>
        </div>
      </section>

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
                      <Sparkles className={`mt-0.5 h-4 w-4 ${isActive ? 'text-[var(--color-link)]' : 'text-[var(--color-mute)]'}`} />
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

          <PreviewCard title="使用说明" hint="当前组件库先解决结构一致性">
            <div className="space-y-3 text-sm text-[var(--color-body)]">
              <p>每个组件都接收统一的 MathComponentProps。</p>
              <p>点击按钮只切换轻量状态，不输出答案，也不做真实计算。</p>
              <p>后面可以直接把逻辑块对应的数学组件映射到这里。</p>
            </div>
          </PreviewCard>
        </aside>

        <main className="space-y-6">
          {ActiveComponent && (
            <PreviewCard title={activeItem.title} hint={`${activeItem.mathComponent} · ${activeItem.blocks.join(' / ')}`}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1 text-xs text-[var(--color-link)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  数学组件预览
                </span>
                <span className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1 text-xs text-[var(--color-body)]">
                  统一 props：MathComponentProps
                </span>
              </div>
              <ActiveComponent block={activeItem.block} mathAnalysis={activeItem.mathAnalysis} mode={activeItem.mode} />
            </PreviewCard>
          )}

          <PreviewCard title="映射关系" hint="逻辑块名称 → 数学组件">
            <div className="grid gap-3 md:grid-cols-2">
              {MATH_COMPONENT_CATALOG.map((item) => (
                <div key={item.mathComponent} className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
                  <div className="text-sm font-semibold text-[var(--color-ink)]">{item.blocks.join(' / ')}</div>
                  <div className="mt-1 text-xs text-[var(--color-body)]">数学组件：{item.mathComponent}</div>
                </div>
              ))}
            </div>
          </PreviewCard>
        </main>
      </div>
    </div>
  )
}
