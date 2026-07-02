/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import {
  WandSparkles,
} from 'lucide-react'
import {
  MButton,
  MHint,
  MInput,
  MProgress,
  MResult,
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
  id: 'scene' | 'look' | 'control' | 'visual' | 'animation' | 'challenge' | 'math'
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
    id: 'scene',
    label: 'Layout / Scene',
    helper: '唯一的页面骨架，固定展示观察区和发现区。',
    choices: [
      {
        key: 'ThreeZoneLayout',
        zh: '观察发现布局',
        en: 'ThreeZoneLayout',
        description: '把一张页面固定切成观察区和发现区。',
        preview: miniCard('观察发现布局', 'ThreeZoneLayout', <div className="space-y-2"><div className="h-10 rounded-[10px] bg-[var(--color-canvas-soft)]" /><div className="h-10 rounded-[10px] bg-[var(--color-link-bg-soft)]" /></div>),
      },
    ],
  },
  {
    id: 'look',
    label: '观察区',
    helper: '只保留 MHint，用于展示已知条件、隐含关系和求解目标。',
    choices: [
      {
        key: 'MHint',
        zh: '提示标签',
        en: 'MHint',
        description: '展示已知条件、隐含关系和求解目标。',
        preview: (
          <MHint
            data={{
              goal: { text: '一共需要多少元？', target: '总花费金额' },
              known_conditions: [
                { text: '学校要买12张课桌', unit: '张', value: 12 },
                { text: '学校要买10把椅子', unit: '把', value: 10 },
                { text: '每张课桌90元', unit: '元/张', value: 90 },
                { text: '每把椅子32元', unit: '元/把', value: 32 },
              ],
              hidden_conditions: [
                { text: '总花费等于购买课桌的总价与购买椅子的总价之和' },
              ],
            }}
          />
        ),
      },
    ],
  },
  {
    id: 'control',
    label: '交互',
    helper: '负责孩子怎么点、怎么拖、怎么选。',
    choices: [
      { key: 'ClickControl', zh: '点击按钮', en: 'ClickControl', description: '一步一步点，适合简单推进。', preview: <ClickControl label="点一下" helper="点击后继续" /> },
      { key: 'DragControl', zh: '拖拽控制', en: 'DragControl', description: '拖动到目标位置，适合分组、匹配、移动。', preview: <DragControl from="🍎" to="📦" /> },
      { key: 'SliderControl', zh: '滑块控制', en: 'SliderControl', description: '拖动滑块选择数值。', preview: <SliderControl value={65} /> },
      { key: 'StepButton', zh: '步骤按钮', en: 'StepButton', description: '按步骤推进，适合流程题。', preview: <StepButton label="下一步" /> },
      { key: 'ChoiceControl', zh: '选项控制', en: 'ChoiceControl', description: '单选 / 多选，适合判断和选择。', preview: <ChoiceControl options={['A', 'B', 'C']} activeIndex={1} /> },
      { key: 'MButton', zh: '操作按钮', en: 'MButton', description: '统一风格的操作按钮。', preview: <div className="flex flex-wrap gap-2"><MButton>开始探索</MButton><MButton variant="secondary">重置</MButton></div> },
    ],
  },
  {
    id: 'visual',
    label: '交互 · 展示',
    helper: '负责孩子看见什么、数量关系怎么摆出来。',
    choices: [
      { key: 'MInput', zh: '输入框', en: 'MInput', description: '发现区里的可输入操作。', preview: <MInput value="在此输入文字..." /> },
      { key: 'MProgress', zh: '进度条', en: 'MProgress', description: '交互过程中的进度反馈。', preview: <MProgress value={68} /> },
      { key: 'MResult', zh: '结果卡', en: 'MResult', description: '把中间结果及时展示出来。', preview: <MResult label="当前值" value="68" unit="%" note="拖动后变化" /> },
      { key: 'Counter', zh: '数字计数', en: 'Counter', description: '交互过程中的数字变化。', preview: <Counter value={8} unit="步" /> },
      { key: 'ItemGroup', zh: '物体分组', en: 'ItemGroup', description: '交互中展示多个对象变化。', preview: <ItemGroup emoji="🍎" count={6} /> },
      { key: 'Box', zh: '基础盒子', en: 'Box', description: '展示区域的基础容器。', preview: <Box label="展示区" /> },
      { key: 'DashedBox', zh: '虚线盒子', en: 'DashedBox', description: '可拖入的空位。', preview: <DashedBox label="拖入这里" /> },
      { key: 'SolidBox', zh: '实线盒子', en: 'SolidBox', description: '目标区域或结果框。', preview: <SolidBox label="目标区" /> },
      { key: 'Arrow', zh: '箭头关系', en: 'Arrow', description: '表达移动和指向。', preview: <Arrow label="指向" /> },
      { key: 'Balance', zh: '平衡关系', en: 'Balance', description: '比较差额与移多补少。', preview: <Balance left={3} right={5} /> },
      { key: 'Bar', zh: '条形关系', en: 'Bar', description: '数量转长度。', preview: <Bar value={7} max={10} /> },
      { key: 'Timeline', zh: '时间线', en: 'Timeline', description: '时间推进和状态变化。', preview: <Timeline activeIndex={1} /> },
      { key: 'NumberLine', zh: '数轴', en: 'NumberLine', description: '数轴比较和定位。', preview: <NumberLine marker={4} /> },
      { key: 'PointSegment', zh: '点段图', en: 'PointSegment', description: '点数和段数关系。', preview: <PointSegment start={2} end={7} /> },
    ],
  },
  {
    id: 'animation',
    label: '交互 · 动画',
    helper: '负责操作后页面怎么演。',
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
    id: 'challenge',
    label: '引导与思考',
    helper: '负责系统给孩子 challenge_steps，孩子写答案并验证。',
    choices: [
      { key: 'AnswerInput', zh: '答案输入', en: 'AnswerInput', description: '孩子自己输入最终答案。', preview: <AnswerInput value="4" /> },
      { key: 'MResult', zh: '结果卡', en: 'MResult', description: '把结果突出展示。', preview: <MResult label="最终答案" value="4" unit="个" note="验证正确后显示" /> },
      { key: 'StepButton', zh: '提交按钮', en: 'StepButton', description: '最后一步推进。', preview: <StepButton label="提交答案" /> },
      { key: 'ChoiceControl', zh: '最终选择', en: 'ChoiceControl', description: '也可用于最终判定。', preview: <ChoiceControl options={['正确', '再想想', '看提示']} activeIndex={0} /> },
      { key: 'MButton', zh: '反馈按钮', en: 'MButton', description: '提交 / 查看答案 / 再试一次。', preview: <div className="flex flex-wrap gap-2"><MButton>提交</MButton><MButton variant="secondary">查看答案</MButton></div> },
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
        先按“观察 / 发现操作 / 发现展示 / 发现动画 / 挑战”分区，再在区内选择组件
      </div>
      <div className="mt-2 text-xs leading-5 text-[var(--color-body)]">
        观察区只放展示类；交互区拆成操作、展示和动画三栏；引导与思考放输入、验证和结果反馈。每个分区都支持多选，多个值会用英文逗号保存。
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
