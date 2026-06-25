import {
  Arrow,
  Balance,
  Bar,
  Box,
  ChoiceControl,
  ClickControl,
  Counter,
  DashedBox,
  DragControl,
  ItemGroup,
  MButton,
  MInput,
  MProgress,
  MResult,
  NumberLine,
  PointSegment,
  PreviewCard,
  SliderControl,
  SolidBox,
  StepButton,
  Timeline,
} from '../../components/preview/stageOneBlocks'

function PillList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5 text-xs text-[var(--color-body)]">
          {item}
        </span>
      ))}
    </div>
  )
}

export default function DiscoveryComponentPage() {
  return (
    <div className="space-y-6">
      <PreviewCard title="发现区组件" hint="把交互、展示和变化反馈单独放在这里。">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
              <div className="text-sm font-semibold text-[var(--color-ink)]">交互</div>
              <div className="mt-3 grid gap-3">
                <ClickControl label="点一下" helper="点击后继续探索" />
                <DragControl from="🍎 苹果" to="📦 盒子" />
                <SliderControl value={62} />
                <StepButton label="下一步" />
                <ChoiceControl options={['A', 'B', 'C', 'D']} activeIndex={2} />
                <div className="flex flex-wrap gap-2">
                  <MButton>开始探索</MButton>
                  <MButton variant="secondary">重置</MButton>
                  <MButton variant="ghost">跳过</MButton>
                </div>
              </div>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
              <div className="text-sm font-semibold text-[var(--color-ink)]">展示</div>
              <div className="mt-3 grid gap-3">
                <MInput value="在此输入文字..." />
                <MProgress value={68} />
                <MResult label="当前值" value="68" unit="%" note="拖动后变化" />
                <Counter value={8} unit="步" />
                <ItemGroup emoji="🍎" count={6} />
                <Box label="展示区" />
                <DashedBox label="拖入这里" />
                <SolidBox label="目标区" />
                <Arrow label="指向" />
                <Balance left={3} right={5} />
                <Bar value={7} max={10} />
                <Timeline activeIndex={1} />
                <NumberLine marker={4} />
                <PointSegment start={2} end={7} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
              <div className="text-sm font-semibold text-[var(--color-ink)]">动画</div>
              <div className="mt-3 text-xs text-[var(--color-body)]">
                这里保留动画位的入口，后续可以继续补高亮、移动、拆分、合并等变化效果。
              </div>
              <div className="mt-3">
                <PillList items={['Highlight', 'Move', 'Split', 'Merge', 'FadeOut', 'CountUp', 'Shake', 'Glow', 'ConnectLine', 'RevealGap']} />
              </div>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
              <div className="text-sm font-semibold text-[var(--color-ink)]">说明</div>
              <div className="mt-3 text-sm leading-6 text-[var(--color-body)]">
                发现区只放孩子要做的事和做完后的变化，不再混入观察区内容。
              </div>
            </div>
          </div>
        </div>
      </PreviewCard>
    </div>
  )
}
