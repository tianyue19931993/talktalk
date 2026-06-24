/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

type SectionKey = 'scene' | 'observation' | 'discovery' | 'challenge'

type StageOneItem = {
  name: string
  description: string
  node: ReactNode
}

export type StageOneSection = {
  key: SectionKey
  title: string
  subtitle: string
  items: StageOneItem[]
}

type CardProps = {
  title?: string
  hint?: string
  children: ReactNode
  className?: string
}

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: ReactNode
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>

type InputProps = {
  value?: string
  placeholder?: string
}

type ResultProps = {
  label: string
  value: string
  unit?: string
  note?: string
}

type IconProps = {
  emoji: string
  label: string
  tone?: 'pink' | 'purple' | 'blue' | 'green' | 'amber'
}

const toneClassMap: Record<NonNullable<IconProps['tone']>, string> = {
  pink: 'from-[rgba(255,0,128,0.18)] to-[rgba(255,0,128,0.06)] text-[var(--color-highlight-pink)]',
  purple: 'from-[rgba(121,40,202,0.18)] to-[rgba(121,40,202,0.06)] text-[var(--color-gradient-start)]',
  blue: 'from-[rgba(0,112,243,0.18)] to-[rgba(0,112,243,0.06)] text-[var(--color-link)]',
  green: 'from-[rgba(34,197,94,0.18)] to-[rgba(34,197,94,0.06)] text-green-600',
  amber: 'from-[rgba(245,158,11,0.18)] to-[rgba(245,158,11,0.06)] text-amber-600',
}

function blockClass(className = '') {
  return `rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] shadow-[var(--shadow-l2)] ${className}`
}

export function PreviewCard({ title, hint, children, className = '' }: CardProps) {
  return (
    <div className={blockClass(`p-4 ${className}`)}>
      {(title || hint) && (
        <div className="mb-3">
          {title && <h3 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h3>}
          {hint && <p className="text-[11px] text-[var(--color-mute)] mt-0.5">{hint}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

export function MTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-[var(--color-ink)] tracking-tight">{children}</h2>
}

export function MHint({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-canvas-soft)] px-3 py-1 text-xs text-[var(--color-body)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-link)]" />
      {children}
    </div>
  )
}

export function MCard({ title, hint, children, className = '' }: CardProps) {
  return (
    <div className={blockClass(`p-5 ${className}`)}>
      {(title || hint) && (
        <div className="mb-3">
          {title && <MTitle>{title}</MTitle>}
          {hint && <p className="mt-1 text-xs text-[var(--color-mute)]">{hint}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

export function MButton({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const styles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)] text-white shadow-[0_1px_8px_rgba(121,40,202,0.2)]',
    secondary: 'bg-[var(--color-canvas-soft)] text-[var(--color-ink)] border border-[var(--color-hairline)]',
    ghost: 'bg-transparent text-[var(--color-body)]',
  }

  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-all ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function MInput({ value = '在此输入文字...', placeholder = '在此输入文字...' }: InputProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-4 py-3">
      <div className="text-[11px] text-[var(--color-mute)] mb-1">输入框</div>
      <div className="text-sm text-[var(--color-ink)]">{value || placeholder}</div>
    </div>
  )
}

export function MProgress({ value = 68 }: { value?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--color-body)]">
        <span>进度</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-canvas-soft)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

export function MResult({ label, value, unit = '', note }: ResultProps) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-gradient-to-r from-[rgba(121,40,202,0.08)] to-[rgba(255,0,128,0.08)] p-4">
      <div className="text-xs text-[var(--color-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-[var(--color-body)]">{unit}</span>}
      </div>
      {note && <div className="mt-1 text-xs text-[var(--color-body)]">{note}</div>}
    </div>
  )
}

export function ClickControl({ label = '点击一下', helper = '点击后执行操作' }: { label?: string; helper?: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-link)] bg-[var(--color-link-bg-soft)] p-4">
      <div className="text-xs text-[var(--color-link)] mb-2">ClickControl</div>
      <MButton variant="primary">{label}</MButton>
      <div className="mt-2 text-[11px] text-[var(--color-body)]">{helper}</div>
    </div>
  )
}

export function DragControl({ from = '苹果', to = '盒子' }: { from?: string; to?: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">DragControl</div>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-white px-3 py-2 text-sm shadow-sm">{from}</div>
        <div className="flex-1 h-px bg-[var(--color-hairline)] relative">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[var(--color-link)]">⇆</div>
        </div>
        <div className="rounded-full bg-white px-3 py-2 text-sm shadow-sm">{to}</div>
      </div>
    </div>
  )
}

export function SliderControl({ value = 70 }: { value?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">SliderControl</div>
      <div className="relative h-2 rounded-full bg-[var(--color-canvas-soft)]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]" style={{ width: `${value}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white bg-[var(--color-link)] shadow-md" style={{ left: `${value}%`, transform: 'translate(-50%, -50%)' }} />
      </div>
    </div>
  )
}

export function StepButton({ label = '下一步' }: { label?: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">StepButton</div>
      <MButton variant="secondary">{label}</MButton>
    </div>
  )
}

export function ChoiceControl({ options = ['A', 'B', 'C'], activeIndex = 1 }: { options?: string[]; activeIndex?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">ChoiceControl</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <span
            key={option}
            className={`rounded-full px-3 py-1.5 text-sm ${
              index === activeIndex
                ? 'bg-[var(--color-link-bg-soft)] text-[var(--color-link)]'
                : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'
            }`}
          >
            {option}
          </span>
        ))}
      </div>
    </div>
  )
}

export function AnswerInput({ value = '4' }: { value?: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">AnswerInput</div>
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-3 py-2 text-sm text-[var(--color-ink)]">
          {value}
        </div>
        <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs text-green-700">已填写</span>
      </div>
    </div>
  )
}

export function ItemIcon({ emoji, label, tone = 'pink' }: IconProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br ${toneClassMap[tone]}`}>
        <span className="text-xl">{emoji}</span>
      </div>
      <span className="text-[11px] text-[var(--color-body)]">{label}</span>
    </div>
  )
}

export function ItemGroup({ emoji = '🍎', count = 6 }: { emoji?: string; count?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">ItemGroup</div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] p-3 text-center text-xl">
            {emoji}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Counter({ value = 12, unit = '个' }: { value?: number; unit?: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-gradient-to-br from-[rgba(121,40,202,0.08)] to-[rgba(0,112,243,0.08)] p-4 text-center">
      <div className="text-xs text-[var(--color-body)] mb-2">Counter</div>
      <div className="text-3xl font-semibold text-[var(--color-ink)]">
        {value}
        <span className="ml-1 text-sm text-[var(--color-body)]">{unit}</span>
      </div>
    </div>
  )
}

export function Box({ label = '盒子' }: { label?: string }) {
  return <div className="rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] px-4 py-3 text-center text-sm text-[var(--color-body)]">{label}</div>
}

export function DashedBox({ label = '虚线盒子' }: { label?: string }) {
  return <div className="rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-link)] bg-[var(--color-link-bg-soft)] px-4 py-3 text-center text-sm text-[var(--color-link)]">{label}</div>
}

export function SolidBox({ label = '实线盒子' }: { label?: string }) {
  return <div className="rounded-[var(--radius-md)] border border-[var(--color-ink)] bg-white px-4 py-3 text-center text-sm text-[var(--color-ink)]">{label}</div>
}

export function Arrow({ label = '指向' }: { label?: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">Arrow</div>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-2 text-sm">A</div>
        <div className="flex-1 border-t border-dashed border-[var(--color-link)]" />
        <div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-2 text-sm">{label}</div>
      </div>
    </div>
  )
}

export function Balance({ left = 3, right = 5 }: { left?: number; right?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">Balance</div>
      <div className="relative mx-auto h-24 w-full max-w-[280px]">
        <div className="absolute left-1/2 top-1/2 h-1 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-ink)]" />
        <div className="absolute left-1/2 top-1/2 h-14 w-1 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-ink)]" />
        <div className="absolute left-6 top-10 w-24 rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] px-3 py-2 text-center text-sm shadow-sm">
          {left}
        </div>
        <div className="absolute right-6 top-14 w-24 rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] px-3 py-2 text-center text-sm shadow-sm">
          {right}
        </div>
      </div>
    </div>
  )
}

export function Bar({ value = 7, max = 10 }: { value?: number; max?: number }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">Bar</div>
      <div className="h-24 rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] p-3">
        <div className="h-full flex items-end">
          <div className="w-12 rounded-t-lg bg-gradient-to-t from-[var(--color-link)] to-[var(--color-highlight-pink)]" style={{ height: `${percent}%` }} />
        </div>
      </div>
    </div>
  )
}

export function Timeline({ steps = ['开始', '操作', '结果'], activeIndex = 1 }: { steps?: string[]; activeIndex?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">Timeline</div>
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-1 items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${index <= activeIndex ? 'bg-[var(--color-link)]' : 'bg-[var(--color-hairline)]'}`} />
            <div className={`text-[11px] ${index === activeIndex ? 'text-[var(--color-link)] font-medium' : 'text-[var(--color-body)]'}`}>{step}</div>
            {index < steps.length - 1 && <div className="h-px flex-1 bg-[var(--color-hairline)]" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function NumberLine({ min = 0, max = 10, marker = 4 }: { min?: number; max?: number; marker?: number }) {
  const ticks = Array.from({ length: max - min + 1 }).map((_, index) => min + index)
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">NumberLine</div>
      <div className="relative px-1 pt-6">
        <div className="h-1 rounded-full bg-[var(--color-hairline)]" />
        <div className="relative -mt-2 flex justify-between">
          {ticks.map((tick) => (
            <div key={tick} className="flex flex-col items-center">
              <div className="h-3 w-px bg-[var(--color-ink)]" />
              <span className="mt-1 text-[10px] text-[var(--color-body)]">{tick}</span>
            </div>
          ))}
        </div>
        <div className="absolute top-0 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-[var(--color-highlight-pink)] shadow-md" style={{ left: `${((marker - min) / (max - min)) * 100}%` }} />
      </div>
    </div>
  )
}

export function PointSegment({ start = 2, end = 7 }: { start?: number; end?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-xs text-[var(--color-body)] mb-3">PointSegment</div>
      <div className="relative py-8">
        <div className="h-1 rounded-full bg-[var(--color-hairline)]" />
        <div className="absolute left-10 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[var(--color-link)]" />
        <div className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[var(--color-highlight-pink)]" />
        <div className="absolute left-10 top-6 -translate-x-1/2 text-xs text-[var(--color-body)]">{start}</div>
        <div className="absolute right-10 top-6 translate-x-1/2 text-xs text-[var(--color-body)]">{end}</div>
      </div>
    </div>
  )
}

function makeAsset(emoji: string, tone: NonNullable<IconProps['tone']>) {
  return function AssetDemo({ label }: { label: string }) {
    return <ItemIcon emoji={emoji} label={label} tone={tone} />
  }
}

export const AssetPeople = makeAsset('🧒', 'blue')
export const AssetBox = makeAsset('📦', 'purple')
export const AssetCup = makeAsset('☕', 'amber')
export const AssetTree = makeAsset('🌳', 'green')
export const AssetCherry = makeAsset('🍒', 'pink')
export const AssetApple = makeAsset('🍎', 'pink')
export const AssetRoad = makeAsset('🛣️', 'blue')
export const AssetCoin = makeAsset('🪙', 'amber')
export const AssetMachine = makeAsset('⚙️', 'purple')
export const AssetAnimal = makeAsset('🐯', 'green')

export function MotionStyles() {
  return (
    <style>{`
      @keyframes preview-slide {
        0% { transform: translateX(0); }
        50% { transform: translateX(92px); }
        100% { transform: translateX(0); }
      }
      @keyframes preview-shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-3px); }
        40% { transform: translateX(3px); }
        60% { transform: translateX(-2px); }
        80% { transform: translateX(2px); }
      }
      @keyframes preview-fade {
        0% { opacity: 1; }
        60% { opacity: 1; }
        100% { opacity: 0.25; }
      }
      @keyframes preview-reveal {
        0% { width: 0%; }
        100% { width: 100%; }
      }
      @keyframes preview-glow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(121, 40, 202, 0.18); }
        50% { box-shadow: 0 0 0 14px rgba(121, 40, 202, 0); }
      }
      @keyframes preview-countup {
        0% { transform: scale(0.95); opacity: 0.75; }
        100% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  )
}

type FallbackTemplatePreviewProps = {
  questionText?: string
  analysisJson?: Record<string, any>
}

const DEFAULT_FALLBACK_ANALYSIS = {
  question_type: '带余除法：求商和余数',
  core_discovery: '用除法解决购物问题，商就是最多数量，余数就是剩下的钱',
  known_conditions: [
    '乒乓球拍单价 37 元',
    '李老师带的总钱数 280 元',
  ],
  hidden_conditions: [
    '最多可买多少副意味着数量是整数，不能超支',
    '剩下多少钱就是总钱数减去花费',
  ],
  verification_target: '验证商×单价+余数是否等于总钱数',
  discovery_flow: [
    '先估算：把单价看作整十数，估算大概能买几副',
    '选择一个数量尝试，计算总价，看是否超过总钱数',
    '如果未超过，尝试增加数量；如果超过，减少数量',
    '找到恰好不超过的最大数量，并计算剩余钱数',
  ],
  challenge_steps: [
    '写出除法算式：总钱数 ÷ 单价',
    '用竖式计算，想单价乘几最接近总钱数且小于总钱数',
    '得到的积就是花费，从总钱数中减去得到余数',
    '商即为最多能买的副数，余数即为剩余钱数',
  ],
  interaction_flow: {
    trigger: '拖动数量滑块或点击加减按钮',
    action: '改变购买乒乓球拍的数量',
    feedback: [
      '显示当前花费总额',
      '显示剩余钱数',
      '如果花费超过 280，给出警告且数量不可增加',
    ],
    reset: '点击重置按钮将数量归零，剩余钱数恢复 280 元',
  },
  animation_flow: {
    type: '滑块加减和硬币动画',
    description: '乒乓球拍展示，价格标签 37 元，总钱数 280 元以硬币堆表示。拖动滑块增加数量，硬币逐渐减少，显示花费和剩余。当数量导致花费超过总钱数时，硬币变红闪烁警告。',
    visual_effect: [
      '硬币数量动态减少',
      '花费金额数字跳动',
      '超限时红色闪烁',
    ],
    duration: '滑块拖动时实时反馈，无固定时长',
  },
  answer: {
    unit: '副',
    value: 7,
  },
  remaining_answer: {
    unit: '元',
    value: 21,
  },
  default_assets: ['乒乓球拍.png', '硬币.png'],
  component_rules: {
    scene: '页面分为顶部观察区（展示题目条件）和底部发现区（交互操作）以及右侧挑战区（输入答案）',
    look: '观察区展示乒乓球拍图片、单价标签 37 元，李老师带的总钱数 280 元',
    control: '发现区提供数量滑块和加减按钮，数量范围 0-10，滑块限制不超过最大可行数量',
    visual: '发现区实时显示公式：37 × 数量 = 花费，以及剩余 = 280 - 花费，用数字和色块表示',
    animation: '发现区根据数量变化，硬币从总数中减少，花费数字增大，剩余数字减小，超限时红色警示',
    challenge: '挑战区提供两个输入框：第一问“最多可买多少副”，第二问“还剩多少元”，提交后验证答案，正确显示绿色勾，错误显示红色叉并提示',
  },
}

export function FallbackTemplatePreview({
  questionText = '一副乒乓球拍 37 元，李老师带了 280 元，最多可买多少副，还剩多少元？',
  analysisJson = DEFAULT_FALLBACK_ANALYSIS,
}: FallbackTemplatePreviewProps) {
  const analysis = analysisJson && typeof analysisJson === 'object' ? analysisJson : DEFAULT_FALLBACK_ANALYSIS
  const normalizeList = (value: any) => {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
    if (value == null) return []
    const text = String(value).trim()
    if (!text) return []
    return [text]
  }

  const questionType = String(analysis.question_type || '暂未分类')
  const coreDiscovery = String(analysis.core_discovery || questionType)
  const knownConditions = normalizeList(analysis.known_conditions)
  const hiddenConditions = normalizeList(analysis.hidden_conditions)
  const challengeSteps = normalizeList(analysis.challenge_steps)
  const feedbackItems = normalizeList(analysis.interaction_flow?.feedback)
  const defaultAssets = normalizeList(analysis.default_assets)
  const componentRules = analysis.component_rules && typeof analysis.component_rules === 'object' ? analysis.component_rules : {}
  const discoverySource = [
    questionType,
    coreDiscovery,
    knownConditions.join(' '),
    hiddenConditions.join(' '),
    String(analysis.interaction_flow?.trigger || ''),
    String(analysis.interaction_flow?.action || ''),
    String(analysis.animation_flow?.description || ''),
    String(analysis.animation_flow?.visual_effect || ''),
    String(componentRules.control || ''),
    String(componentRules.visual || ''),
    String(componentRules.animation || ''),
  ].join(' ')
  const pickUnique = (items: string[], limit = 4) => Array.from(new Set(items.filter(Boolean))).slice(0, limit)
  const selectedControls = pickUnique([
    /(滑块|滑动|拖动|进度)/.test(discoverySource) ? 'SliderControl' : '',
    /(拖拽|拖入|拖到)/.test(discoverySource) ? 'DragControl' : '',
    /(点击|按钮|开始|继续|重置|下一步|加减)/.test(discoverySource) ? 'ClickControl' : '',
    /(点击|按钮|开始|继续|重置|下一步|加减)/.test(discoverySource) ? 'MButton' : '',
    /(选择|选项)/.test(discoverySource) ? 'ChoiceControl' : '',
    /(步骤|推进|下一步)/.test(discoverySource) ? 'StepButton' : '',
  ], 3)
  const selectedVisuals = pickUnique([
    /(数量|总数|剩余|花费|金额|数字|商|余数)/.test(discoverySource) ? 'Counter' : '',
    /(数量|总数|剩余|花费|金额|数字|商|余数)/.test(discoverySource) ? 'Bar' : '',
    /(数量|总数|剩余|花费|金额|数字|商|余数)/.test(discoverySource) ? 'MResult' : '',
    /(硬币|分组|盒子|装入|购物车|篮子)/.test(discoverySource) ? 'ItemGroup' : '',
    /(硬币|分组|盒子|装入|购物车|篮子)/.test(discoverySource) ? 'Box' : '',
    /(硬币|分组|盒子|装入|购物车|篮子)/.test(discoverySource) ? 'DashedBox' : '',
    /(平衡|比较|差额|左右)/.test(discoverySource) ? 'Balance' : '',
    /(平衡|比较|差额|左右)/.test(discoverySource) ? 'Arrow' : '',
    /(线段|数轴|时间|天)/.test(discoverySource) ? 'Timeline' : '',
    /(线段|数轴|时间|天)/.test(discoverySource) ? 'NumberLine' : '',
    /(线段|数轴|时间|天)/.test(discoverySource) ? 'PointSegment' : '',
  ], 4)
  const selectedAnimations = pickUnique([
    /(跳动|增大|减少|变化|递增|递减)/.test(discoverySource) ? 'CountUp' : '',
    /(跳动|增大|减少|变化|递增|递减)/.test(discoverySource) ? 'Move' : '',
    /(闪烁|警告|高亮|强调|变红)/.test(discoverySource) ? 'Glow' : '',
    /(闪烁|警告|高亮|强调|变红)/.test(discoverySource) ? 'Shake' : '',
    /(拆分|分裂)/.test(discoverySource) ? 'Split' : '',
    /(合并|汇总)/.test(discoverySource) ? 'Merge' : '',
    /(连线|对应)/.test(discoverySource) ? 'ConnectLine' : '',
    /(消失|淡出)/.test(discoverySource) ? 'FadeOut' : '',
    /(揭示|缺口|空位)/.test(discoverySource) ? 'RevealGap' : '',
    /(关键|重点|高亮)/.test(discoverySource) ? 'Highlight' : '',
  ], 4)
  const [quantity, setQuantity] = useState(0)
  const [verifyCount, setVerifyCount] = useState('')
  const [verifyRemain, setVerifyRemain] = useState('')
  const [verifyFeedback, setVerifyFeedback] = useState('拖动数量滑块，再输入“最多可买副数”和“剩余钱数”验证。')
  const [revealCore, setRevealCore] = useState(false)
  const unitPrice = 37
  const totalMoney = 280
  const currentSpent = useMemo(() => quantity * unitPrice, [quantity])
  const currentRemain = useMemo(() => totalMoney - currentSpent, [currentSpent])
  const isCorrect = useMemo(() => {
    const countValue = String(verifyCount || '').replace(/\s+/g, '')
    const remainValue = String(verifyRemain || '').replace(/\s+/g, '')
    return (countValue === '7' || countValue === '7副') && (remainValue === '21' || remainValue === '21元')
  }, [verifyCount, verifyRemain])

  const handleVerify = () => {
    if (!String(verifyCount || '').trim() || !String(verifyRemain || '').trim()) {
      setVerifyFeedback('先把两个答案都填完整。')
      return
    }
    if (isCorrect) {
      setVerifyFeedback('正确！最多可买 7 副，还剩 21 元。')
      setRevealCore(true)
      return
    }
    setVerifyFeedback('还差一点，再看看总钱数和单价。')
  }

  const handleReset = () => {
    setQuantity(0)
    setVerifyCount('')
    setVerifyRemain('')
    setVerifyFeedback('拖动数量滑块，再输入“最多可买副数”和“剩余钱数”验证。')
    setRevealCore(false)
  }

  return (
    <div className="space-y-6">
      <PreviewCard title="内置兜底模板预览" hint="这套就是 temp 兜底时生成 HTML 的默认模板，下面直接看三段式交互。">
        <div className="rounded-[28px] border border-[var(--color-hairline)] bg-[linear-gradient(135deg,var(--color-gradient-start),var(--color-highlight-pink))] p-5 text-white shadow-[var(--shadow-l2)]">
          <div className="text-xs text-white/80">📝 题目</div>
          <div className="mt-2 text-base font-semibold leading-8">{questionText}</div>
        </div>
      </PreviewCard>

      <div className="flex flex-col gap-4">
      <PreviewCard title="1. 观察区" hint="只放题目原文、已知条件、隐含条件。">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <MCard title="已知条件" hint="显式条件">
              <div className="space-y-2">
                {knownConditions.map((item) => (
                  <div key={item} className="rounded-[var(--radius-md)] bg-white px-3 py-2 text-xs leading-5 text-[var(--color-body)] border border-[var(--color-hairline)]">
                    {item}
                  </div>
                ))}
              </div>
            </MCard>
            <MCard title="隐含条件" hint="解题必须补出来的关系">
              <div className="space-y-2">
                {hiddenConditions.map((item) => (
                  <div key={item} className="rounded-[var(--radius-md)] bg-white px-3 py-2 text-xs leading-5 text-[var(--color-body)] border border-[var(--color-hairline)]">
                    {item}
                  </div>
                ))}
              </div>
            </MCard>
          </div>
        </div>
      </PreviewCard>

      <PreviewCard title="2. 发现区" hint="这里要真能拖、真能看变化。">
        <div className="space-y-4">
          <div className="rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4 shadow-[var(--shadow-l2)]">
            <div className="text-sm font-semibold text-[var(--color-ink)]">发现区精选组件</div>
            <div className="mt-1 text-xs text-[var(--color-mute)]">系统只展示本题真正匹配出来的组件，不再把整套库摊开</div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
                <div className="text-xs text-[var(--color-body)] mb-3">精选控件</div>
                <div className="flex flex-wrap gap-2">
                  {selectedControls.map((item) => (
                    <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs text-[var(--color-body)] border border-[var(--color-hairline)]">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {(selectedControls.includes('SliderControl') || selectedControls.includes('DragControl')) && (
                    <SliderControl value={Math.round((quantity / 7) * 100)} />
                  )}
                  {selectedControls.includes('ClickControl') && <ClickControl label="买一副" helper="每次花掉 37 元" />}
                  {selectedControls.includes('ChoiceControl') && <ChoiceControl options={['1副', '5副', '7副']} activeIndex={2} />}
                  {selectedControls.includes('StepButton') && <StepButton label="继续尝试" />}
                  {selectedControls.includes('MButton') && (
                    <div className="flex flex-wrap gap-2">
                      <MButton onClick={() => setQuantity((prev) => Math.min(10, prev + 1))}>加 1 副</MButton>
                      <MButton variant="secondary" onClick={() => setQuantity(7)}>直接到 7 副</MButton>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
                <div className="text-xs text-[var(--color-body)] mb-3">精选展示</div>
                <div className="flex flex-wrap gap-2">
                  {selectedVisuals.map((item) => (
                    <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs text-[var(--color-body)] border border-[var(--color-hairline)]">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {selectedVisuals.includes('Counter') && <Counter value={quantity} unit="副" />}
                  {selectedVisuals.includes('Bar') && <MProgress value={Math.min(100, Math.round((quantity / 7) * 100))} />}
                  {selectedVisuals.includes('Balance') && <Balance left={3} right={5} />}
                  {selectedVisuals.includes('NumberLine') && <NumberLine marker={4} />}
                  {selectedVisuals.includes('ItemGroup') && <ItemGroup emoji="🪙" count={6} />}
                </div>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
                <div className="text-xs text-[var(--color-body)] mb-3">精选动画</div>
                <div className="flex flex-wrap gap-2">
                  {selectedAnimations.map((item) => (
                    <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs text-[var(--color-body)] border border-[var(--color-hairline)]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-[var(--color-body)]">
              {quantity === 7 ? '已经到 7 副了，继续去挑战区验证答案。' : '继续调整，直到找到不超支的最大数量。'}
            </div>
          </div>

          <div className="rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4 shadow-[var(--shadow-l2)]">
            <div className="text-sm font-semibold text-[var(--color-ink)]">变化反馈</div>
            <div className="mt-1 text-xs text-[var(--color-mute)]">交互之后，数量、关系和动画都在这里更新</div>
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-3">
                <MResult label="总钱数" value={String(totalMoney)} unit="元" note="始终不变" />
                <MResult label="当前花费" value={String(currentSpent)} unit="元" note="跟着数量变化" />
              </div>
              <MProgress value={Math.min(100, Math.round((quantity / 7) * 100))} />
              <div className="flex flex-col gap-3">
                {feedbackItems.slice(0, 3).map((item) => (
                  <div key={item} className="rounded-[var(--radius-md)] bg-white px-3 py-2 text-xs leading-5 text-[var(--color-body)] border border-[var(--color-hairline)]">
                    {item}
                  </div>
                ))}
              </div>
              <div className="rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-4 py-3 text-sm text-[var(--color-body)]">
                剩余金额：{currentRemain} 元
              </div>
            </div>
          </div>
        </div>
      </PreviewCard>

      <PreviewCard title="3. 挑战区" hint="输入答案，真验证。">
        <div className="space-y-4">
          <div className="rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4 shadow-[var(--shadow-l2)]">
            <div className="text-sm font-semibold text-[var(--color-ink)]">挑战步骤</div>
            <div className="mt-1 text-xs text-[var(--color-mute)]">先引导孩子一步一步推理，再验证答案</div>
            <div className="mt-4 space-y-2">
              {challengeSteps.map((item, index) => (
                <div key={item} className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-xs leading-5 text-[var(--color-body)]">
                  {index + 1}. {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4 shadow-[var(--shadow-l2)]">
            <div className="text-sm font-semibold text-[var(--color-ink)]">验证答案</div>
            <div className="mt-1 text-xs text-[var(--color-mute)]">这里对应 html 模板里的输入验证区</div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-4 py-3 text-sm text-[var(--color-ink)]">
                {verifyCount || verifyRemain ? `${verifyCount || '？'} 副，${verifyRemain || '？'} 元` : '请输入答案'}
              </div>
              <div className="flex flex-wrap gap-2">
                <MButton onClick={handleVerify}>验证</MButton>
                <MButton variant="secondary" onClick={() => setRevealCore((prev) => !prev)}>
                  {revealCore ? '隐藏核心发现' : '显示核心发现'}
                </MButton>
                <MButton variant="ghost" onClick={handleReset}>重置</MButton>
              </div>
              <div className="grid gap-3">
                <input
                  value={verifyCount}
                  onChange={(e) => setVerifyCount(e.target.value)}
                  placeholder="最多可买多少副"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-mute)] focus:outline-none focus:border-[var(--color-link)]"
                />
                <input
                  value={verifyRemain}
                  onChange={(e) => setVerifyRemain(e.target.value)}
                  placeholder="还剩多少元"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-mute)] focus:outline-none focus:border-[var(--color-link)]"
                />
              </div>
              <div className={`rounded-[var(--radius-xl)] border px-4 py-3 text-sm leading-6 ${isCorrect ? 'border-green-200 bg-green-50 text-green-700' : 'border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}>
                {verifyFeedback}
              </div>
              {revealCore && (
                <div className="rounded-[var(--radius-xl)] bg-[var(--color-link-bg-soft)] px-4 py-3 text-sm text-[var(--color-link)]">
                  核心发现：{coreDiscovery}
                </div>
              )}
            </div>
          </div>
        </div>
      </PreviewCard>
      </div>
    </div>
  )
}

export const STAGE_ONE_SECTIONS: StageOneSection[] = [
  {
    key: 'scene',
    title: 'Layout / Scene',
    subtitle: '唯一的页面骨架，固定分成「观察 - 发现 - 挑战」三段。',
    items: [
      {
        name: 'ThreeZoneLayout',
        description: '统一页面框架，把题目自然切成观察区、发现区和挑战区。',
        node: (
          <div className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4">
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-canvas-soft)] p-3">
              <div className="text-xs text-[var(--color-body)]">上：观察区</div>
              <div className="mt-2 text-sm text-[var(--color-ink)]">题干、条件、素材、数量关系</div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-canvas-soft)] p-3">
              <div className="text-xs text-[var(--color-body)]">中：发现区</div>
              <div className="mt-2 text-sm text-[var(--color-ink)]">点击、拖拽、滑动、选择</div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-link-bg-soft)] p-3">
              <div className="text-xs text-[var(--color-link)]">下：挑战区</div>
              <div className="mt-2 text-sm font-medium text-[var(--color-link)]">输入、验证、得出答案</div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    key: 'observation',
    title: '观察区组件',
    subtitle: '负责看见题目、条件和数量关系，只做展示，不做操作。',
    items: [
      {
        name: 'MTitle',
        description: '题目主标题，强调场景和任务。',
        node: (
          <div className="rounded-[var(--radius-2xl)] bg-[var(--color-canvas)] p-5">
            <MTitle>成长表达实验室 M</MTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <MHint>先看题目</MHint>
              <MHint>再看条件</MHint>
              <MHint>最后找关系</MHint>
            </div>
          </div>
        ),
      },
      {
        name: 'MHint',
        description: '观察提示条，帮助孩子抓住关键字。',
        node: (
          <div className="flex flex-wrap gap-2">
            <MHint>已知条件</MHint>
            <MHint>隐含关系</MHint>
            <MHint>验证目标</MHint>
          </div>
        ),
      },
      {
        name: 'MCard',
        description: '承载观察信息的统一卡片。',
        node: (
          <MCard title="观察区示例" hint="把题干、条件、提示放在同一个信息卡里">
            <div className="rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] px-4 py-3 text-sm leading-7 text-[var(--color-ink)]">
              题目条件与数量关系展示区
            </div>
          </MCard>
        ),
      },
      {
        name: 'Counter',
        description: '把数量直接摆出来，让孩子一眼看到数。',
        node: <Counter value={12} unit="个" />,
      },
      {
        name: 'ItemIcon',
        description: '单个素材图标，适合观察题目的角色/物体。',
        node: <ItemIcon emoji="🍎" label="Apple" tone="pink" />,
      },
      {
        name: 'ItemGroup',
        description: '把多个物体直接组合展示出来。',
        node: <ItemGroup emoji="🍎" count={6} />,
      },
    ],
  },
  {
    key: 'discovery',
    title: '发现区组件',
    subtitle: '负责展示方式、操作方式和操作后的变化。',
    items: [
      {
        name: 'ClickControl',
        description: '点击推进一步。',
        node: <ClickControl label="点一下" helper="点击后继续探索" />,
      },
      {
        name: 'DragControl',
        description: '拖拽去发现位置变化。',
        node: <DragControl from="🍎 苹果" to="📦 盒子" />,
      },
      {
        name: 'SliderControl',
        description: '滑动选择数量变化。',
        node: <SliderControl value={62} />,
      },
      {
        name: 'StepButton',
        description: '按步骤推进探索路径。',
        node: <StepButton label="下一步" />,
      },
      {
        name: 'ChoiceControl',
        description: '适合选择判断和分组。',
        node: <ChoiceControl options={['A', 'B', 'C', 'D']} activeIndex={2} />,
      },
      {
        name: 'MButton',
        description: '统一风格的操作按钮。',
        node: (
          <div className="flex flex-wrap gap-2">
            <MButton>开始探索</MButton>
            <MButton variant="secondary">重置</MButton>
            <MButton variant="ghost">跳过</MButton>
          </div>
        ),
      },
      {
        name: 'MInput',
        description: '发现区里的可输入控件，常用于操作中的临时输入。',
        node: <MInput value="在此输入文字..." />,
      },
      {
        name: 'MProgress',
        description: '发现过程中的进度和变化反馈。',
        node: <MProgress value={68} />,
      },
      {
        name: 'Counter',
        description: '发现过程中的数字反馈。',
        node: <Counter value={8} unit="步" />,
      },
      {
        name: 'ItemGroup',
        description: '配合交互展示多个对象的变化。',
        node: <ItemGroup emoji="🍎" count={6} />,
      },
      {
        name: 'Box',
        description: '发现区里的基础展示盒子。',
        node: <Box label="展示区" />,
      },
      {
        name: 'DashedBox',
        description: '发现区里的可操作空位。',
        node: <DashedBox label="拖入这里" />,
      },
      {
        name: 'SolidBox',
        description: '发现区里的目标区域。',
        node: <SolidBox label="目标区" />,
      },
      {
        name: 'Arrow',
        description: '表达移动和对应关系。',
        node: <Arrow label="指向" />,
      },
      {
        name: 'Balance',
        description: '表达平衡、差额和移多补少。',
        node: <Balance left={3} right={5} />,
      },
      {
        name: 'Bar',
        description: '把数量关系转成长度关系。',
        node: <Bar value={7} max={10} />,
      },
      {
        name: 'Timeline',
        description: '时间推进和状态变化。',
        node: <Timeline activeIndex={1} />,
      },
      {
        name: 'NumberLine',
        description: '数轴上的位置变化。',
        node: <NumberLine marker={4} />,
      },
      {
        name: 'PointSegment',
        description: '点数和段数关系。',
        node: <PointSegment start={2} end={7} />,
      },
      {
        name: 'Highlight',
        description: '高亮关键位置。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Highlight</div><div className="rounded-full bg-[var(--color-link-bg-soft)] px-4 py-2 text-[var(--color-link)]" style={{ animation: 'preview-glow 2s ease-in-out infinite' }}>关键数据</div></div>,
      },
      {
        name: 'Move',
        description: '移动动画，表达位置变化。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Move</div><div className="relative h-10 overflow-hidden rounded-full bg-[var(--color-canvas-soft)]"><div className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-[var(--color-gradient-start)] px-3 py-1.5 text-sm text-white" style={{ animation: 'preview-slide 2.2s ease-in-out infinite' }}>移动</div></div></div>,
      },
      {
        name: 'Split',
        description: '拆分变化。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Split</div><div className="flex items-center justify-center gap-3"><div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1.5 text-sm text-[var(--color-link)]" style={{ animation: 'preview-slide 2.2s ease-in-out infinite' }}>1份</div><div className="text-[var(--color-body)]">→</div><div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5 text-sm text-[var(--color-body)]">2份</div></div></div>,
      },
      {
        name: 'Merge',
        description: '合并变化。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Merge</div><div className="flex items-center justify-center gap-2"><div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5 text-sm">A</div><div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5 text-sm">B</div><div className="text-[var(--color-body)]">→</div><div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1.5 text-sm text-[var(--color-link)]">AB</div></div></div>,
      },
      {
        name: 'FadeOut',
        description: '渐隐退场。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">FadeOut</div><div className="rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] px-4 py-3 text-center text-sm text-[var(--color-body)]" style={{ animation: 'preview-fade 2s ease-in-out infinite' }}>旧数据淡出</div></div>,
      },
      {
        name: 'CountUp',
        description: '数值跳动反馈。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">CountUp</div><div className="text-3xl font-semibold text-[var(--color-ink)]" style={{ animation: 'preview-countup 1.8s ease-in-out infinite alternate' }}>4</div></div>,
      },
      {
        name: 'Shake',
        description: '错误或提醒反馈。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Shake</div><div className="rounded-full bg-[var(--color-error-soft)] px-4 py-2 text-[var(--color-error)]" style={{ animation: 'preview-shake 1.2s ease-in-out infinite' }}>再试一次</div></div>,
      },
      {
        name: 'Glow',
        description: '关键状态发光。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Glow</div><div className="rounded-full bg-[var(--color-gradient-start)] px-4 py-2 text-white" style={{ animation: 'preview-glow 2s ease-in-out infinite' }}>重点</div></div>,
      },
      {
        name: 'ConnectLine',
        description: '连线关系提示。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">ConnectLine</div><div className="relative h-14"><div className="absolute left-4 top-5 h-6 w-6 rounded-full bg-[var(--color-link)]" /><div className="absolute right-4 top-5 h-6 w-6 rounded-full bg-[var(--color-highlight-pink)]" /><div className="absolute left-10 right-10 top-1/2 h-px border-t border-dashed border-[var(--color-link)]" /></div></div>,
      },
      {
        name: 'RevealGap',
        description: '空位揭示。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">RevealGap</div><div className="rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-link)] bg-[var(--color-link-bg-soft)] px-4 py-3 text-center text-[var(--color-link)]" style={{ animation: 'preview-reveal 2s ease-in-out infinite alternate' }}>答案藏在这里</div></div>,
      },
    ],
  },
  {
    key: 'challenge',
    title: '挑战区组件',
    subtitle: '负责输入答案、验证结果和回收结论。',
    items: [
      {
        name: 'AnswerInput',
        description: '孩子输入最终答案。',
        node: <AnswerInput value="4" />,
      },
      {
        name: 'MResult',
        description: '把结果明确展示出来。',
        node: <MResult label="最终答案" value="4" unit="个" note="验证正确后再显示" />,
      },
      {
        name: 'ChoiceControl',
        description: '也可用于挑战区的最终选择。',
        node: <ChoiceControl options={['正确', '再想想', '看提示']} activeIndex={0} />,
      },
      {
        name: 'StepButton',
        description: '最后一步推进。',
        node: <StepButton label="提交答案" />,
      },
      {
        name: 'MButton',
        description: '挑战区操作按钮。',
        node: (
          <div className="flex flex-wrap gap-2">
            <MButton>提交</MButton>
            <MButton variant="secondary">查看答案</MButton>
          </div>
        ),
      },
    ],
  },
]
