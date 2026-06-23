import type { ReactNode } from 'react'
import {
  ArrowRight,
  Activity,
  Boxes,
  CircleDot,
  MoveRight,
  MousePointer2,
  WandSparkles,
  Plus,
  Layers3,
  TimerReset,
  Grid3x3,
  SplitSquareVertical,
  Link2,
  Sparkles,
  Hash,
  Waypoints,
  SquareDashedMousePointer,
  Columns3,
  NotebookTabs,
} from 'lucide-react'
import {
  MButton,
  MCard,
  MHint,
  MProgress,
  MResult,
  MTitle,
  PreviewCard,
  ItemIcon,
  ItemGroup,
  Counter,
  Box,
  DashedBox,
  SolidBox,
  Arrow,
  Balance,
  Bar,
  Timeline,
  NumberLine,
  PointSegment,
  ClickControl,
  DragControl,
  SliderControl,
  StepButton,
  ChoiceControl,
  AnswerInput,
} from '../preview/stageOneBlocks'

export type ComponentChoice = {
  key: string
  zh: string
  en: string
  description: string
  preview: ReactNode
}

export type ComponentGroup = {
  id: 'layout' | 'control' | 'visual' | 'animation' | 'asset'
  label: string
  helper: string
  choices: ComponentChoice[]
}

function miniCard(title: string, subtitle: string, body: ReactNode) {
  return (
    <div className="rounded-[14px] border border-[var(--color-hairline)] bg-white p-3 shadow-sm">
      <div className="text-[11px] font-semibold text-[var(--color-ink)]">{title}</div>
      <div className="mt-0.5 text-[10px] text-[var(--color-mute)]">{subtitle}</div>
      <div className="mt-2">{body}</div>
    </div>
  )
}

function animationPill(label: string, className: string) {
  return (
    <div className={`rounded-full px-3 py-1.5 text-xs text-white ${className}`}>
      {label}
    </div>
  )
}

export const COMPONENT_GROUPS: ComponentGroup[] = [
  {
    id: 'layout',
    label: 'Layout / Scene',
    helper: '页面骨架。推荐先选它，再选交互和视觉。',
    choices: [
      {
        key: 'SceneFrame',
        zh: '场景外框',
        en: 'SceneFrame',
        description: '统一标题、题干、工作区和结果区的基础框架。',
        preview: miniCard('场景外框', 'SceneFrame', <div className="space-y-2"><div className="h-2 rounded-full bg-[var(--color-canvas-soft)]" /><div className="grid grid-cols-2 gap-2"><div className="h-10 rounded-[10px] bg-[var(--color-link-bg-soft)]" /><div className="h-10 rounded-[10px] bg-[var(--color-canvas-soft)]" /></div></div>),
      },
      {
        key: 'TwoColumnLayout',
        zh: '双栏骨架',
        en: 'TwoColumnLayout',
        description: '左题干右操作，适合大多数比较和分析题。',
        preview: miniCard('双栏骨架', 'TwoColumnLayout', <div className="grid grid-cols-2 gap-2"><div className="h-12 rounded-[10px] bg-[var(--color-canvas-soft)]" /><div className="h-12 rounded-[10px] bg-[var(--color-link-bg-soft)]" /></div>),
      },
      {
        key: 'SingleColumnLayout',
        zh: '单列流程',
        en: 'SingleColumnLayout',
        description: '适合逐步讲解、时间推进、规则生长。',
        preview: miniCard('单列流程', 'SingleColumnLayout', <div className="space-y-2"><div className="h-4 rounded-full bg-[var(--color-canvas-soft)]" /><div className="h-4 rounded-full bg-[var(--color-canvas-soft)]" /><div className="h-4 rounded-full bg-[var(--color-link-bg-soft)]" /></div>),
      },
      {
        key: 'ThreeZoneLayout',
        zh: '三段布局',
        en: 'ThreeZoneLayout',
        description: '导入、操作、总结三段式。',
        preview: miniCard('三段布局', 'ThreeZoneLayout', <div className="grid grid-cols-3 gap-2"><div className="h-12 rounded-[10px] bg-[var(--color-canvas-soft)]" /><div className="h-12 rounded-[10px] bg-[var(--color-canvas-soft)]" /><div className="h-12 rounded-[10px] bg-[var(--color-link-bg-soft)]" /></div>),
      },
      {
        key: 'StickyAsideLayout',
        zh: '侧栏骨架',
        en: 'StickyAsideLayout',
        description: '左侧说明固定，右侧主区持续操作。',
        preview: miniCard('侧栏骨架', 'StickyAsideLayout', <div className="grid grid-cols-[0.7fr_1.3fr] gap-2"><div className="h-14 rounded-[10px] bg-[var(--color-link-bg-soft)]" /><div className="h-14 rounded-[10px] bg-[var(--color-canvas-soft)]" /></div>),
      },
    ],
  },
  {
    id: 'control',
    label: '操作控件',
    helper: '孩子怎么点、拖、选、填。',
    choices: [
      {
        key: 'ClickControl',
        zh: '点击按钮',
        en: 'ClickControl',
        description: '一步一步点，适合简单推进。',
        preview: <ClickControl label="点一下" helper="点击后继续" />,
      },
      {
        key: 'DragControl',
        zh: '拖拽控制',
        en: 'DragControl',
        description: '拖动到目标位置，适合分组、匹配、移动。',
        preview: <DragControl from="🍎" to="📦" />,
      },
      {
        key: 'SliderControl',
        zh: '滑块控制',
        en: 'SliderControl',
        description: '拖动滑块选择数值。',
        preview: <SliderControl value={65} />,
      },
      {
        key: 'StepButton',
        zh: '步骤按钮',
        en: 'StepButton',
        description: '按步骤推进，适合流程题。',
        preview: <StepButton label="下一步" />,
      },
      {
        key: 'ChoiceControl',
        zh: '选项控制',
        en: 'ChoiceControl',
        description: '单选/多选，适合判断和选择。',
        preview: <ChoiceControl options={['A', 'B', 'C']} activeIndex={1} />,
      },
      {
        key: 'AnswerInput',
        zh: '答案输入',
        en: 'AnswerInput',
        description: '孩子自己输入答案。',
        preview: <AnswerInput value="4" />,
      },
    ],
  },
  {
    id: 'visual',
    label: '数学视觉',
    helper: '数量、关系、比较、段、线、图怎么画。',
    choices: [
      { key: 'Counter', zh: '数字计数', en: 'Counter', description: '大数字显示。', preview: <Counter value={12} unit="个" /> },
      { key: 'Box', zh: '基础盒子', en: 'Box', description: '普通容器。', preview: <Box label="Box" /> },
      { key: 'DashedBox', zh: '虚线盒子', en: 'DashedBox', description: '可拖入/可标记区域。', preview: <DashedBox label="可拖入" /> },
      { key: 'SolidBox', zh: '实线盒子', en: 'SolidBox', description: '目标区域/结果框。', preview: <SolidBox label="目标区" /> },
      { key: 'Arrow', zh: '箭头关系', en: 'Arrow', description: '表达移动/指向。', preview: <Arrow label="指向" /> },
      { key: 'Balance', zh: '平衡秤', en: 'Balance', description: '比较差额/移多补少。', preview: <Balance left={3} right={5} /> },
      { key: 'Bar', zh: '条形图', en: 'Bar', description: '数量关系转为长度。', preview: <Bar value={7} max={10} /> },
      { key: 'Timeline', zh: '时间线', en: 'Timeline', description: '时间推进。', preview: <Timeline activeIndex={1} /> },
      { key: 'NumberLine', zh: '数轴', en: 'NumberLine', description: '数轴比较和定位。', preview: <NumberLine marker={4} /> },
      { key: 'PointSegment', zh: '点段图', en: 'PointSegment', description: '点数和段数关系。', preview: <PointSegment start={2} end={7} /> },
      { key: 'ItemGroup', zh: '物体分组', en: 'ItemGroup', description: '多个对象成组。', preview: <ItemGroup emoji="🍎" count={6} /> },
      { key: 'MCard', zh: '统一卡片', en: 'MCard', description: '统一内容承载卡。', preview: <MCard title="标题" hint="副标题"><div className="text-xs text-[var(--color-body)]">示例内容</div></MCard> },
    ],
  },
  {
    id: 'animation',
    label: '动画积木',
    helper: '页面怎么演、怎么提示、怎么反馈。',
    choices: [
      { key: 'Highlight', zh: '高亮', en: 'Highlight', description: '强调关键位置。', preview: animationPill('Highlight', 'bg-[var(--color-link)]') },
      { key: 'Move', zh: '移动', en: 'Move', description: '元素位移。', preview: animationPill('Move', 'bg-[var(--color-gradient-start)]') },
      { key: 'Split', zh: '拆分', en: 'Split', description: '一个变多个。', preview: animationPill('Split', 'bg-[var(--color-highlight-pink)]') },
      { key: 'Merge', zh: '合并', en: 'Merge', description: '多个合成一个。', preview: animationPill('Merge', 'bg-[var(--color-body)]') },
      { key: 'FadeOut', zh: '淡出', en: 'FadeOut', description: '旧内容退场。', preview: animationPill('FadeOut', 'bg-[var(--color-mute)]') },
      { key: 'CountUp', zh: '计数跳动', en: 'CountUp', description: '数字变化动画。', preview: animationPill('CountUp', 'bg-[var(--color-link)]') },
      { key: 'Shake', zh: '轻抖', en: 'Shake', description: '错误或提醒提示。', preview: animationPill('Shake', 'bg-[var(--color-error)]') },
      { key: 'Glow', zh: '发光', en: 'Glow', description: '关键步骤发光。', preview: animationPill('Glow', 'bg-[var(--color-gradient-start)]') },
      { key: 'ConnectLine', zh: '连线', en: 'ConnectLine', description: '关联关系连线。', preview: animationPill('ConnectLine', 'bg-[var(--color-link)]') },
      { key: 'RevealGap', zh: '揭示空位', en: 'RevealGap', description: '答案慢慢显现。', preview: animationPill('RevealGap', 'bg-[var(--color-highlight-pink)]') },
    ],
  },
  {
    id: 'asset',
    label: '素材积木',
    helper: '题目故事里出现的物件。',
    choices: [
      { key: 'PersonIcon', zh: '人物', en: 'PersonIcon', description: '小朋友/角色。', preview: <ItemIcon emoji="🧒" label="PersonIcon" tone="blue" /> },
      { key: 'BoxIcon', zh: '盒子', en: 'BoxIcon', description: '容器/箱子。', preview: <ItemIcon emoji="📦" label="BoxIcon" tone="purple" /> },
      { key: 'CupIcon', zh: '杯子', en: 'CupIcon', description: '杯、碗、容器。', preview: <ItemIcon emoji="☕" label="CupIcon" tone="amber" /> },
      { key: 'TreeIcon', zh: '树', en: 'TreeIcon', description: '生长/规律场景。', preview: <ItemIcon emoji="🌳" label="TreeIcon" tone="green" /> },
      { key: 'CherryIcon', zh: '樱桃', en: 'CherryIcon', description: '成组物体。', preview: <ItemIcon emoji="🍒" label="CherryIcon" tone="pink" /> },
      { key: 'AppleIcon', zh: '苹果', en: 'AppleIcon', description: '常见数量对象。', preview: <ItemIcon emoji="🍎" label="AppleIcon" tone="pink" /> },
      { key: 'RoadIcon', zh: '道路', en: 'RoadIcon', description: '路径/时间/移动。', preview: <ItemIcon emoji="🛣️" label="RoadIcon" tone="blue" /> },
      { key: 'CoinIcon', zh: '硬币', en: 'CoinIcon', description: '钱币/计数对象。', preview: <ItemIcon emoji="🪙" label="CoinIcon" tone="amber" /> },
      { key: 'MachineIcon', zh: '机器', en: 'MachineIcon', description: '假设、变化、操作。', preview: <ItemIcon emoji="⚙️" label="MachineIcon" tone="purple" /> },
      { key: 'AnimalIcon', zh: '动物', en: 'AnimalIcon', description: '故事化对象。', preview: <ItemIcon emoji="🐯" label="AnimalIcon" tone="green" /> },
    ],
  },
]

export function splitComponentValue(value?: string) {
  return String(value || '')
    .split(/[,，\n；;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function joinComponentValue(values: string[]) {
  return values.filter(Boolean).join(', ')
}

export function ComponentPickerPreviewHelp() {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
        <WandSparkles className="h-4 w-4 text-[var(--color-link)]" />
        选择组件后，右侧会显示中文名 / 英文名 / 预览
      </div>
      <div className="mt-2 text-xs leading-5 text-[var(--color-body)]">
        组件字段支持多选，多个值会用英文逗号保存。你可以先按推荐搭一版，后面再继续微调。
      </div>
    </div>
  )
}

export function ComponentPickerField({
  label,
  helper,
  value,
  onChange,
  group,
}: {
  label: string
  helper: string
  value: string
  onChange: (value: string) => void
  group: ComponentGroup
}) {
  const selected = splitComponentValue(value)
  const toggle = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter((item) => item !== key)
      : [...selected, key]
    onChange(joinComponentValue(next))
  }

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4 shadow-[var(--shadow-l2)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--color-ink)]">{label}</div>
          <div className="mt-1 text-xs text-[var(--color-body)]">{helper}</div>
        </div>
        <div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1 text-[11px] text-[var(--color-mute)]">
          {selected.length > 0 ? `${selected.length} 个已选` : '未选择'}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selected.length === 0 ? (
          <span className="text-xs text-[var(--color-mute)]">还没选，点下面卡片即可</span>
        ) : (
          selected.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1.5 text-xs text-[var(--color-link)]"
            >
              {item} ×
            </button>
          ))
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {group.choices.map((choice) => {
          const active = selected.includes(choice.key)
          return (
            <button
              key={choice.key}
              type="button"
              onClick={() => toggle(choice.key)}
              className={`text-left rounded-[20px] border p-3 transition-all ${
                active
                  ? 'border-[var(--color-link)] bg-[var(--color-link-bg-soft)] shadow-[0_10px_24px_rgba(0,112,243,0.08)]'
                  : 'border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] hover:border-[var(--color-link)]/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-ink)]">{choice.zh}</div>
                  <div className="text-[11px] text-[var(--color-mute)]">{choice.en}</div>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[var(--color-body)]">
                  {active ? '已选' : '可选'}
                </span>
              </div>
              <div className="mt-2 text-[11px] leading-5 text-[var(--color-body)]">{choice.description}</div>
              <div className="mt-2">{choice.preview}</div>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--color-body)]">
        <span>支持多选，保存时会以逗号分隔</span>
        <button type="button" onClick={() => onChange('')} className="text-[var(--color-link)] hover:underline">
          清空
        </button>
      </div>
    </div>
  )
}

export function ComponentMultiSelectPill({
  label,
  value,
  onRemove,
}: {
  label: string
  value: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] text-[var(--color-body)] border border-[var(--color-hairline)]">
      <span className="max-w-[150px] truncate" title={label}>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-[var(--color-mute)] hover:bg-red-50 hover:text-red-600"
        aria-label={`删除 ${value}`}
        title={`删除 ${value}`}
      >
        ×
      </button>
    </span>
  )
}
