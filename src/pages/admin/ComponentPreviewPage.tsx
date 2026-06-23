'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeInfo,
  Grid2x2,
  LayoutPanelTop,
  MonitorUp,
  Sparkles,
} from 'lucide-react'
import {
  MotionStyles,
  PreviewCard,
  STAGE_ONE_SECTIONS,
  type StageOneSection,
} from '../../components/preview/stageOneBlocks'

export default function ComponentPreviewPage() {
  const [activeKey, setActiveKey] = useState(STAGE_ONE_SECTIONS[0]?.key ?? 'ui')

  const activeSection = useMemo(
    () => STAGE_ONE_SECTIONS.find((section) => section.key === activeKey) ?? STAGE_ONE_SECTIONS[0],
    [activeKey],
  ) as StageOneSection

  const totalBlocks = STAGE_ONE_SECTIONS.reduce((sum, section) => sum + section.items.length, 0)

  return (
    <div className="space-y-6">
      <MotionStyles />

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
                阶段一组件展台
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--color-body)] md:text-base">
                这里先把基础 UI、操作控件、数学视觉、素材和动画拆成独立积木。你在这里看到的内容，后面会成为 DeepSeek 生成 HTML 时的可用模板库。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white/80 p-3 backdrop-blur">
              <div className="text-xs text-[var(--color-mute)]">分组</div>
              <div className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{STAGE_ONE_SECTIONS.length}</div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white/80 p-3 backdrop-blur">
              <div className="text-xs text-[var(--color-mute)]">积木</div>
              <div className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{totalBlocks}</div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white/80 p-3 backdrop-blur">
              <div className="text-xs text-[var(--color-mute)]">状态</div>
              <div className="mt-1 text-lg font-semibold text-[var(--color-ink)]">可预览</div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white/80 p-3 backdrop-blur">
              <div className="text-xs text-[var(--color-mute)]">目标</div>
              <div className="mt-1 text-lg font-semibold text-[var(--color-ink)]">PC 优先</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <PreviewCard title="预览分组" hint="点选后切换右侧演示内容">
            <div className="space-y-2">
              {STAGE_ONE_SECTIONS.map((section) => {
                const isActive = section.key === activeSection.key
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveKey(section.key)}
                    className={`w-full rounded-[var(--radius-xl)] border px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-[var(--color-link)] bg-[var(--color-link-bg-soft)] shadow-[0_8px_24px_rgba(0,112,243,0.08)]'
                        : 'border-[var(--color-hairline)] bg-white hover:border-[var(--color-link)]/50 hover:bg-[var(--color-canvas-soft)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`text-sm font-semibold ${isActive ? 'text-[var(--color-link)]' : 'text-[var(--color-ink)]'}`}>
                          {section.title}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-[var(--color-mute)]">{section.subtitle}</div>
                      </div>
                      <ArrowRight className={`mt-0.5 h-4 w-4 ${isActive ? 'text-[var(--color-link)]' : 'text-[var(--color-mute)]'}`} />
                    </div>
                    <div className="mt-2 text-[11px] text-[var(--color-body)]">{section.items.length} 个积木</div>
                  </button>
                )
              })}
            </div>
          </PreviewCard>

          <PreviewCard title="阶段一说明" hint="先把可复用的骨架搭稳">
            <div className="space-y-3 text-sm text-[var(--color-body)]">
              <div className="flex items-start gap-2">
                <BadgeInfo className="mt-0.5 h-4 w-4 text-[var(--color-link)]" />
                <p>先做组件库，不直接碰生成链路，避免把逻辑改乱。</p>
              </div>
              <div className="flex items-start gap-2">
                <Grid2x2 className="mt-0.5 h-4 w-4 text-[var(--color-link)]" />
                <p>每个题型后面只需填数据和选组件，不用再让模型从零画界面。</p>
              </div>
              <div className="flex items-start gap-2">
                <LayoutPanelTop className="mt-0.5 h-4 w-4 text-[var(--color-link)]" />
                <p>如果这版样式确认没问题，下一步就可以开始把 analysis json 对到积木参数。</p>
              </div>
            </div>
          </PreviewCard>
        </aside>

        <main className="space-y-6">
          <PreviewCard
            title={activeSection.title}
            hint={activeSection.subtitle}
            className="overflow-hidden"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1 text-xs text-[var(--color-link)]">
                <Sparkles className="h-3.5 w-3.5" />
                组合示例
              </span>
              <span className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1 text-xs text-[var(--color-body)]">
                用于 PC 端核对视觉、交互和动画
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
              <div className="rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(244,247,251,1))] p-5 shadow-[var(--shadow-l2)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-[var(--color-link)]">示例场景</div>
                    <h2 className="mt-1 text-xl font-semibold text-[var(--color-ink)]">把 12 个苹果平均分给 3 个人</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-body)]">
                      这里是一个小组合预览，展示积木在同一个页面里如何协同工作。
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-xl)] bg-[var(--color-canvas-soft)] px-4 py-3 text-right">
                    <div className="text-[11px] text-[var(--color-mute)]">当前分组</div>
                    <div className="text-sm font-semibold text-[var(--color-ink)]">{activeSection.title}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
                    <div className="text-xs text-[var(--color-body)]">题目区</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--color-ink)]">平均分配</div>
                    <div className="mt-3">
                      <div className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-4 py-3 text-sm text-[var(--color-ink)]">
                        在此输入文字...
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="rounded-full bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)] px-4 py-2 text-sm font-medium text-white">
                        立即生成
                      </button>
                      <button className="rounded-full border border-[var(--color-hairline)] bg-white px-4 py-2 text-sm text-[var(--color-body)]">
                        查看提示
                      </button>
                    </div>
                  </div>
                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
                    <div className="text-xs text-[var(--color-body)]">结果区</div>
                    <div className="mt-3">
                      <div className="rounded-[var(--radius-xl)] bg-gradient-to-r from-[rgba(121,40,202,0.08)] to-[rgba(255,0,128,0.08)] p-4">
                        <div className="text-xs text-[var(--color-mute)]">最终答案</div>
                        <div className="mt-1 text-3xl font-semibold text-[var(--color-ink)]">4</div>
                        <div className="mt-1 text-xs text-[var(--color-body)]">12 个苹果平均分给 3 个人</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 rounded-full bg-[var(--color-canvas-soft)] overflow-hidden">
                        <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]" />
                      </div>
                      <div className="mt-2 text-xs text-[var(--color-body)]">步骤完成度 68%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-[var(--color-body)]">当前分组节点</div>
                    <div className="text-base font-semibold text-[var(--color-ink)]">{activeSection.title}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs text-[var(--color-body)]">
                    {activeSection.items.length} 个组件
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {activeSection.items.map((item, index) => (
                    <div
                      key={item.name}
                      className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[var(--color-ink)]">
                            {index + 1}. {item.name}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-[var(--color-mute)]">{item.description}</div>
                        </div>
                      </div>
                      <div className="mt-3">{item.node}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PreviewCard>
        </main>
      </div>
    </div>
  )
}
