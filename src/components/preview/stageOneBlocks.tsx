import type { ReactNode } from 'react'

type SectionKey = 'layout' | 'ui' | 'controls' | 'visual' | 'assets' | 'motion'

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
}

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

export function MButton({ variant = 'primary', children, className = '' }: ButtonProps) {
  const styles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)] text-white shadow-[0_1px_8px_rgba(121,40,202,0.2)]',
    secondary: 'bg-[var(--color-canvas-soft)] text-[var(--color-ink)] border border-[var(--color-hairline)]',
    ghost: 'bg-transparent text-[var(--color-body)]',
  }

  return (
    <button
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

export const STAGE_ONE_SECTIONS: StageOneSection[] = [
  {
    key: 'layout',
    title: 'Layout / Scene 层',
    subtitle: '负责整个页面骨架，先把结构搭稳。',
    items: [
      {
        name: 'SceneFrame',
        description: '统一页面外框，负责标题、说明、工作区和结果区的基本骨架。',
        node: (
          <div className="rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(244,247,251,1))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[var(--color-link)]">SceneFrame</div>
                <div className="mt-1 text-base font-semibold text-[var(--color-ink)]">把 12 个苹果平均分给 3 个人</div>
                <div className="mt-1 text-xs text-[var(--color-body)]">先说明场景，再进入互动，再给出结果。</div>
              </div>
              <div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1 text-xs text-[var(--color-link)]">探索中</div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-3">
                <div className="text-xs text-[var(--color-body)]">题目区</div>
                <div className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] px-3 py-2 text-sm text-[var(--color-ink)]">
                  在此输入文字...
                </div>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-3">
                <div className="text-xs text-[var(--color-body)]">工作区</div>
                <div className="mt-2 flex h-16 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-link-bg-soft)] text-sm text-[var(--color-link)]">
                  互动区域
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        name: 'TwoColumnLayout',
        description: '左题干右操作，适合大多数分析题和探索题。',
        node: (
          <div className="grid gap-3 rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4 md:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-canvas-soft)] p-4">
              <div className="text-xs text-[var(--color-body)]">左侧</div>
              <div className="mt-2 text-sm font-medium text-[var(--color-ink)]">题目与观察</div>
              <div className="mt-3 h-20 rounded-[var(--radius-md)] border border-dashed border-[var(--color-link)] bg-[var(--color-link-bg-soft)] p-3 text-xs text-[var(--color-link)]">
                放题干、图片、材料和关键提示
              </div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-canvas-soft)] p-4">
              <div className="text-xs text-[var(--color-body)]">右侧</div>
              <div className="mt-2 text-sm font-medium text-[var(--color-ink)]">操作与反馈</div>
              <div className="mt-3 h-20 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white p-3 text-xs text-[var(--color-body)]">
                放按钮、拖拽、输入、结果反馈
              </div>
            </div>
          </div>
        ),
      },
      {
        name: 'SingleColumnLayout',
        description: '单列叙事流，适合逐步演示、分步提示和结论回收。',
        node: (
          <div className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4">
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-canvas-soft)] p-3">
              <div className="text-xs text-[var(--color-body)]">步骤 1</div>
              <div className="mt-1 text-sm text-[var(--color-ink)]">先看总数</div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-canvas-soft)] p-3">
              <div className="text-xs text-[var(--color-body)]">步骤 2</div>
              <div className="mt-1 text-sm text-[var(--color-ink)]">再做分配</div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-link-bg-soft)] p-3">
              <div className="text-xs text-[var(--color-link)]">步骤 3</div>
              <div className="mt-1 text-sm font-medium text-[var(--color-link)]">最后验证答案</div>
            </div>
          </div>
        ),
      },
      {
        name: 'ThreeZoneLayout',
        description: '三段式骨架：导入、操作、总结。',
        node: (
          <div className="grid gap-3 rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4 md:grid-cols-3">
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-canvas-soft)] p-3">
              <div className="text-xs text-[var(--color-body)]">导入</div>
              <div className="mt-2 text-sm text-[var(--color-ink)]">故事、题目、目标</div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-canvas-soft)] p-3">
              <div className="text-xs text-[var(--color-body)]">操作</div>
              <div className="mt-2 text-sm text-[var(--color-ink)]">拖拽、点击、输入</div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-link-bg-soft)] p-3">
              <div className="text-xs text-[var(--color-link)]">总结</div>
              <div className="mt-2 text-sm font-medium text-[var(--color-link)]">结论、答案、复盘</div>
            </div>
          </div>
        ),
      },
      {
        name: 'StickyAsideLayout',
        description: '固定侧边说明，主区保持聚焦。',
        node: (
          <div className="grid gap-3 rounded-[var(--radius-2xl)] border border-[var(--color-hairline)] bg-white p-4 md:grid-cols-[0.72fr_1.28fr]">
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-link-bg-soft)] p-3">
              <div className="text-xs text-[var(--color-link)]">侧边说明</div>
              <div className="mt-2 text-sm text-[var(--color-link)]">规则、提示、步骤编号始终可见</div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-3">
              <div className="text-xs text-[var(--color-body)]">主工作区</div>
              <div className="mt-2 text-sm text-[var(--color-ink)]">只让孩子操作当前一步</div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    key: 'ui',
    title: '基础 UI 积木',
    subtitle: '负责好看、统一风格。',
    items: [
      {
        name: 'MCard',
        description: '统一内容容器，承载题干、操作、结果。',
        node: (
          <MCard title="平均分配" hint="把 12 个苹果平均分给 3 个人">
            <div className="flex flex-col gap-3">
              <MHint>先看总数，再看份数</MHint>
              <MProgress value={68} />
              <div className="flex gap-2">
                <MButton>开始探索</MButton>
                <MButton variant="secondary">查看提示</MButton>
              </div>
            </div>
          </MCard>
        ),
      },
      {
        name: 'MTitle',
        description: '标题区，强化题型氛围。',
        node: (
          <div className="rounded-[var(--radius-2xl)] bg-[var(--color-canvas)] p-5">
            <MTitle>成长表达实验室 M</MTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <MHint>探索</MHint>
              <MHint>观察</MHint>
              <MHint>比较</MHint>
            </div>
          </div>
        ),
      },
      {
        name: 'MHint',
        description: '微提示标签，承接步骤说明。',
        node: (
          <div className="flex flex-wrap gap-2">
            <MHint>先圈出总量</MHint>
            <MHint>再平均分</MHint>
            <MHint>最后验证答案</MHint>
          </div>
        ),
      },
      {
        name: 'MButton',
        description: '统一按钮风格，主次分明。',
        node: (
          <div className="flex flex-wrap gap-2">
            <MButton>立即生成</MButton>
            <MButton variant="secondary">换一种说法</MButton>
            <MButton variant="ghost">跳过</MButton>
          </div>
        ),
      },
      {
        name: 'MInput',
        description: '稳定统一的输入框样式。',
        node: <MInput value="在此输入文字..." />,
      },
      {
        name: 'MProgress',
        description: '展示当前步骤或完成度。',
        node: <MProgress value={74} />,
      },
      {
        name: 'MResult',
        description: '结论区，突出结果。',
        node: <MResult label="最终答案" value="4" unit="个" note="12 个苹果平均分给 3 个人" />,
      },
    ],
  },
  {
    key: 'controls',
    title: '操作控件积木',
    subtitle: '负责孩子怎么操作。',
    items: [
      {
        name: 'ClickControl',
        description: '点击触发，让孩子逐步推进。',
        node: <ClickControl label="点我开始" helper="点击后亮出下一步" />,
      },
      {
        name: 'DragControl',
        description: '拖拽素材到目标位置。',
        node: <DragControl from="🍎 苹果" to="📦 盒子" />,
      },
      {
        name: 'SliderControl',
        description: '拖动滑块选择数值。',
        node: <SliderControl value={62} />,
      },
      {
        name: 'StepButton',
        description: '按步骤翻页。',
        node: <StepButton label="下一步" />,
      },
      {
        name: 'ChoiceControl',
        description: '单选项，适合判断题或比较题。',
        node: <ChoiceControl options={['A', 'B', 'C', 'D']} activeIndex={2} />,
      },
      {
        name: 'AnswerInput',
        description: '答案输入区。',
        node: <AnswerInput value="4" />,
      },
    ],
  },
  {
    key: 'visual',
    title: '数学视觉积木',
    subtitle: '负责数学对象怎么展示。',
    items: [
      { name: 'ItemIcon', description: '单个物体图标。', node: <ItemIcon emoji="🍎" label="Apple" tone="pink" /> },
      { name: 'ItemGroup', description: '多个物体分组展示。', node: <ItemGroup emoji="🍎" count={6} /> },
      { name: 'Counter', description: '大数字计数器。', node: <Counter value={12} unit="个" /> },
      { name: 'Box', description: '基础容器盒子。', node: <Box label="基础 Box" /> },
      { name: 'DashedBox', description: '虚线盒子。', node: <DashedBox label="可拖入区域" /> },
      { name: 'SolidBox', description: '实线盒子。', node: <SolidBox label="目标区域" /> },
      { name: 'Arrow', description: '关系箭头。', node: <Arrow label="移动到" /> },
      { name: 'Balance', description: '左右平衡。', node: <Balance left={3} right={5} /> },
      { name: 'Bar', description: '条形关系。', node: <Bar value={7} max={10} /> },
      { name: 'Timeline', description: '过程时间线。', node: <Timeline activeIndex={1} /> },
      { name: 'NumberLine', description: '数轴表达。', node: <NumberLine marker={4} /> },
      { name: 'PointSegment', description: '点段关系。', node: <PointSegment start={2} end={7} /> },
    ],
  },
  {
    key: 'assets',
    title: '素材积木',
    subtitle: '负责“故事感”。',
    items: [
      { name: 'PersonIcon', description: '人物素材。', node: <AssetPeople label="PersonIcon" /> },
      { name: 'BoxIcon', description: '盒子素材。', node: <AssetBox label="BoxIcon" /> },
      { name: 'CupIcon', description: '杯子素材。', node: <AssetCup label="CupIcon" /> },
      { name: 'TreeIcon', description: '树素材。', node: <AssetTree label="TreeIcon" /> },
      { name: 'CherryIcon', description: '樱桃素材。', node: <AssetCherry label="CherryIcon" /> },
      { name: 'AppleIcon', description: '苹果素材。', node: <AssetApple label="AppleIcon" /> },
      { name: 'RoadIcon', description: '道路素材。', node: <AssetRoad label="RoadIcon" /> },
      { name: 'CoinIcon', description: '硬币素材。', node: <AssetCoin label="CoinIcon" /> },
      { name: 'MachineIcon', description: '机器素材。', node: <AssetMachine label="MachineIcon" /> },
      { name: 'AnimalIcon', description: '动物素材。', node: <AssetAnimal label="AnimalIcon" /> },
    ],
  },
  {
    key: 'motion',
    title: '动画积木',
    subtitle: '负责页面怎么演。',
    items: [
      {
        name: 'Highlight',
        description: '高亮强调。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Highlight</div><div className="rounded-full bg-[var(--color-link-bg-soft)] px-4 py-2 text-[var(--color-link)]" style={{ animation: 'preview-glow 2s ease-in-out infinite' }}>关键数据</div></div>,
      },
      {
        name: 'Move',
        description: '移动动画。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Move</div><div className="relative h-10 overflow-hidden rounded-full bg-[var(--color-canvas-soft)]"><div className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-[var(--color-gradient-start)] px-3 py-1.5 text-sm text-white" style={{ animation: 'preview-slide 2.2s ease-in-out infinite' }}>移动</div></div></div>,
      },
      {
        name: 'Split',
        description: '拆分动画。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Split</div><div className="flex items-center justify-center gap-3"><div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1.5 text-sm text-[var(--color-link)]" style={{ animation: 'preview-slide 2.2s ease-in-out infinite' }}>1份</div><div className="text-[var(--color-body)]">→</div><div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5 text-sm text-[var(--color-body)]">2份</div></div></div>,
      },
      {
        name: 'Merge',
        description: '合并动画。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Merge</div><div className="flex items-center justify-center gap-2"><div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5 text-sm">A</div><div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1.5 text-sm">B</div><div className="text-[var(--color-body)]">→</div><div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1.5 text-sm text-[var(--color-link)]">AB</div></div></div>,
      },
      {
        name: 'FadeOut',
        description: '渐隐动画。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">FadeOut</div><div className="rounded-[var(--radius-md)] bg-[var(--color-canvas-soft)] px-4 py-3 text-center text-sm text-[var(--color-body)]" style={{ animation: 'preview-fade 2s ease-in-out infinite' }}>旧数据淡出</div></div>,
      },
      {
        name: 'CountUp',
        description: '计数跳动。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">CountUp</div><div className="text-3xl font-semibold text-[var(--color-ink)]" style={{ animation: 'preview-countup 1.8s ease-in-out infinite alternate' }}>4</div></div>,
      },
      {
        name: 'Shake',
        description: '轻微抖动提示。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Shake</div><div className="rounded-full bg-[var(--color-error-soft)] px-4 py-2 text-[var(--color-error)]" style={{ animation: 'preview-shake 1.2s ease-in-out infinite' }}>再试一次</div></div>,
      },
      {
        name: 'Glow',
        description: '发光强调。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">Glow</div><div className="rounded-full bg-[var(--color-gradient-start)] px-4 py-2 text-white" style={{ animation: 'preview-glow 2s ease-in-out infinite' }}>重点</div></div>,
      },
      {
        name: 'ConnectLine',
        description: '连线提示。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">ConnectLine</div><div className="relative h-14"><div className="absolute left-4 top-5 h-6 w-6 rounded-full bg-[var(--color-link)]" /><div className="absolute right-4 top-5 h-6 w-6 rounded-full bg-[var(--color-highlight-pink)]" /><div className="absolute left-10 right-10 top-1/2 h-px border-t border-dashed border-[var(--color-link)]" /></div></div>,
      },
      {
        name: 'RevealGap',
        description: '空位揭示。',
        node: <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-4"><div className="text-xs text-[var(--color-body)] mb-3">RevealGap</div><div className="rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-link)] bg-[var(--color-link-bg-soft)] px-4 py-3 text-center text-[var(--color-link)]" style={{ animation: 'preview-reveal 2s ease-in-out infinite alternate' }}>答案藏在这里</div></div>,
      },
    ],
  },
]
