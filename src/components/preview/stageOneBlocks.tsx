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
  question_type: '工程问题',
  core_discovery: '工作总量一定，效率和时间成反比',
  known_conditions: [
    '每天铺 60 米，15 天完成任务',
    '要求 12 天完工',
  ],
  hidden_conditions: [
    '铺设总长度不变',
    '先求出总长度，再除以新的天数',
  ],
  verification_target: '平均每天要铺多少米',
  discovery_flow: [
    '先观察总长度保持不变',
    '再发现天数变少时，每天铺设量要增大',
    '最后推理出新的平均每天铺设米数',
  ],
  challenge_steps: [
    '先求出总长度：60 × 15 = 900（米）',
    '再用总长度除以 12 天',
    '得到答案：75 米',
  ],
  interaction_flow: {
    trigger: '拖动天数滑块',
    action: '总长度保持不变，每天铺设米数自动调整',
    feedback: [
      '显示总长度恒为 900 米',
      '天数减少时，每天米数同步增加',
      '反比例关系被直观展示',
    ],
    reset: '重置后回到初始 15 天、每天 60 米',
  },
  animation_flow: {
    type: '拆分与合并',
    description: '动画展示总长度被均分成 15 段，再动态合并成 12 段',
    visual_effect: [
      '线段伸缩变换',
      '数值随段数变化跳动',
      '总数 900 始终显示',
    ],
    duration: '1s',
  },
  answer: {
    unit: '米',
    value: 75,
  },
}

export function FallbackTemplatePreview({
  questionText = '煤气公司铺设煤气管道、如果每天铺60米，15天完成任务，如果要求12天完工，那么平均每天要铺多少米？',
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
  const [days, setDays] = useState(15)
  const [verifyValue, setVerifyValue] = useState('')
  const [verifyFeedback, setVerifyFeedback] = useState('把天数拖到 12，再输入答案验证。')
  const [revealCore, setRevealCore] = useState(false)
  const totalWork = 900
  const currentDaily = useMemo(() => Math.round(totalWork / Math.max(days, 1)), [days])
  const isCorrect = useMemo(() => {
    const value = String(verifyValue || '').replace(/\s+/g, '')
    return value === '75' || value === '75米' || value === '75米/天'
  }, [verifyValue])

  const handleVerify = () => {
    if (!String(verifyValue || '').trim()) {
      setVerifyFeedback('先输入答案再验证。')
      return
    }
    if (isCorrect) {
      setVerifyFeedback('正确！每天要铺 75 米。')
      setRevealCore(true)
      return
    }
    setVerifyFeedback('还差一点，再看看总工作量是否不变。')
  }

  const handleReset = () => {
    setDays(15)
    setVerifyValue('')
    setVerifyFeedback('把天数拖到 12，再输入答案验证。')
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

      <div className="grid gap-4 xl:grid-cols-2">
        <PreviewCard title="1. 观察区" hint="只放题目原文、已知条件、隐含条件。">
          <div className="space-y-4">
            <MCard title="题目原文" hint="先让孩子看到完整题干">
              <div className="rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] px-4 py-3 text-sm leading-7 text-[var(--color-ink)]">
                {questionText}
              </div>
            </MCard>

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
            <MCard title="拖动天数" hint="拖到 12 天，看看每天铺设量怎么变">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--color-body)]">天数</span>
                  <span className="text-sm font-semibold text-[var(--color-ink)]">{days} 天</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={15}
                  step={1}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full accent-[var(--color-link)]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <MResult label="总工作量" value={String(totalWork)} unit="米" note="始终不变" />
                  <MResult label="每天铺设" value={String(currentDaily)} unit="米" note="跟着天数变化" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--color-body)]">
                    <span>总量条</span>
                    <span>{days === 12 ? '已变到 12 天' : '继续拖动'}</span>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--color-canvas-soft)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)] transition-all duration-300"
                      style={{ width: `${(days / 15) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-[var(--color-mute)]">
                    每天铺设量会从 60 米变成 75 米
                  </div>
                </div>
              </div>
            </MCard>

            <MCard title="关系变化" hint="用一个小动画感受反比例">
              <div className="space-y-3">
                <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
                  <div className="text-xs text-[var(--color-mute)]">当前状态</div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                    15 天 → {days} 天
                  </div>
                  <div className="mt-1 text-sm text-[var(--color-body)]">
                    每天 {days === 15 ? 60 : currentDaily} 米
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {feedbackItems.slice(0, 3).map((item) => (
                    <div key={item} className="rounded-[var(--radius-md)] bg-white px-3 py-2 text-xs leading-5 text-[var(--color-body)] border border-[var(--color-hairline)]">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <MButton onClick={() => setDays((prev) => Math.max(12, prev - 1))}>减少 1 天</MButton>
                  <MButton variant="secondary" onClick={() => setDays(12)}>直接到 12 天</MButton>
                </div>
                <div className="text-xs text-[var(--color-body)]">
                  {days === 12 ? '已经到 12 天了，继续去挑战区验证答案。' : '继续调整，直到看到 12 天对应的结果。'}
                </div>
              </div>
            </MCard>
          </div>
        </PreviewCard>

        <PreviewCard title="3. 挑战区" hint="输入答案，真验证。">
          <div className="space-y-4">
            <MCard title="验证答案" hint="这里对应 html 模板里的输入验证区">
              <div className="space-y-3">
                <div className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-4 py-3 text-sm text-[var(--color-ink)]">
                  {verifyValue || '请输入答案'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <MButton onClick={handleVerify}>验证</MButton>
                  <MButton variant="secondary" onClick={() => setRevealCore((prev) => !prev)}>
                    {revealCore ? '隐藏核心发现' : '显示核心发现'}
                  </MButton>
                  <MButton variant="ghost" onClick={handleReset}>重置</MButton>
                </div>
                <input
                  value={verifyValue}
                  onChange={(e) => setVerifyValue(e.target.value)}
                  placeholder="请输入你的答案"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-mute)] focus:outline-none focus:border-[var(--color-link)]"
                />
                <div className={`rounded-[var(--radius-xl)] border px-4 py-3 text-sm leading-6 ${isCorrect ? 'border-green-200 bg-green-50 text-green-700' : 'border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}>
                  {verifyFeedback}
                </div>
                {revealCore && (
                  <div className="rounded-[var(--radius-xl)] bg-[var(--color-link-bg-soft)] px-4 py-3 text-sm text-[var(--color-link)]">
                    核心发现：{coreDiscovery}
                  </div>
                )}
              </div>
            </MCard>

            <MCard title="挑战步骤" hint="引导孩子一步一步推理">
              <div className="space-y-2">
                {challengeSteps.map((item, index) => (
                  <div key={item} className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-xs leading-5 text-[var(--color-body)]">
                    {index + 1}. {item}
                  </div>
                ))}
              </div>
            </MCard>
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
    subtitle: '负责“看见题目”和“看懂条件”。',
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
          <MCard title="观察区示例" hint="把题干、图片、提示放在同一个信息卡里">
            <div className="space-y-3">
              <div className="rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] px-4 py-3 text-sm text-[var(--color-ink)]">
                在此输入文字...
              </div>
              <MProgress value={42} />
            </div>
          </MCard>
        ),
      },
      {
        name: 'MInput',
        description: '输入框的统一样式，可用于观察阶段收集信息。',
        node: <MInput value="在此输入文字..." />,
      },
      {
        name: 'MProgress',
        description: '观察完成度或信息收集进度。',
        node: <MProgress value={74} />,
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
      {
        name: 'Box',
        description: '基础容器盒子。',
        node: <Box label="基础 Box" />,
      },
      {
        name: 'DashedBox',
        description: '虚线区域，适合观察待拖入的位置。',
        node: <DashedBox label="观察区空位" />,
      },
      {
        name: 'SolidBox',
        description: '实线目标框，适合观察结果区。',
        node: <SolidBox label="目标区域" />,
      },
      {
        name: 'Arrow',
        description: '用箭头说明移动、指向和对应关系。',
        node: <Arrow label="指向" />,
      },
      {
        name: 'Balance',
        description: '适合比较差额、平衡和移多补少。',
        node: <Balance left={3} right={5} />,
      },
      {
        name: 'Bar',
        description: '把数量关系转成长度关系。',
        node: <Bar value={7} max={10} />,
      },
      {
        name: 'Timeline',
        description: '时间推进的观察骨架。',
        node: <Timeline activeIndex={1} />,
      },
      {
        name: 'NumberLine',
        description: '数轴表达数量位置。',
        node: <NumberLine marker={4} />,
      },
      {
        name: 'PointSegment',
        description: '点段图，用于观察点数与段数关系。',
        node: <PointSegment start={2} end={7} />,
      },
    ],
  },
  {
    key: 'discovery',
    title: '发现区组件',
    subtitle: '负责“让孩子自己动手发现规律”。',
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
    subtitle: '负责“输入、验证、回收答案”。',
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
        name: 'MProgress',
        description: '挑战完成度。',
        node: <MProgress value={86} />,
      },
      {
        name: 'MCard',
        description: '挑战区统一容器。',
        node: (
          <MCard title="验证结果" hint="输入答案后，系统给出即时反馈">
            <div className="flex flex-wrap gap-2">
              <MButton>验证</MButton>
              <MButton variant="secondary">重来</MButton>
            </div>
          </MCard>
        ),
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
