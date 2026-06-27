import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'
import { buildVisualMeta, getToneForComponent, splitMathObject } from './mathHelpers'

function phraseChips(text: string) {
  return splitMathObject(text).slice(0, 4)
}

function scenePill(text: string, active = false) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs transition-all duration-300 ${
        active
          ? 'border-[rgba(0,112,243,0.24)] bg-[rgba(0,112,243,0.08)] text-[var(--color-link)]'
          : 'border-[var(--color-hairline)] bg-white text-[var(--color-body)]'
      }`}
    >
      {text}
    </span>
  )
}

function renderTokens(tokens: string[], active: boolean, dense = false) {
  return (
    <div className={`flex flex-wrap gap-2 ${dense ? 'items-center' : ''}`}>
      {tokens.map((token, index) => (
        <span
          key={`${token}-${index}`}
          className={`rounded-full px-3 py-1 text-xs transition-all duration-300 ${active ? 'bg-[var(--color-link)] text-white' : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}
        >
          {token}
        </span>
      ))}
    </div>
  )
}

function extractTimes(text: string) {
  const matches = text.match(/\b\d{1,2}:\d{2}\b/g)
  return matches && matches.length > 0 ? matches.slice(0, 2) : ['开始时刻', '结束时刻']
}

export interface PartitionProps {
  total: number
  stepValue: number
  unit: string
  stepLabel: string
  buttonText: string
}

export interface TotalAmountProps {
  count: number
  perValue: number
  unit: string
  stepLabel: string
  totalLabel: string
  buttonText: string
}

export interface RoundingProps {
  strategy: 'ceil' | 'floor'
  remainderValue: number
  unit: string
  remainderLabel: string
  buttonText: string
}

export interface PatternCycleProps {
  type: 'find_position' | 'count_total'
  targetN: number
  cycleLength: number
  cycleItems: string[]
  fullCycles: number
  perCycleCount: number
  remainderCount: number
  buttonText: string
}

function readBlockProps(block: MathComponentProps['block']) {
  const props = (block as MathComponentProps['block'] & { props?: Record<string, unknown> })?.props
  return props && typeof props === 'object' && !Array.isArray(props) ? props : {}
}

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return fallback
  return String(value)
}

function toNumber(value: unknown, fallback = 0) {
  const next = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(next) ? next : fallback
}

function extractTotalAmountProps(block: MathComponentProps['block']): TotalAmountProps {
  const props = readBlockProps(block)
  const source = String(block.math_object || '')
  const numbers = extractAllNumbers(source)
  const countMatch = source.match(/共\s*(\d+(?:\.\d+)?)\s*([^\d\s，,。；;]*)/)
  const perMatch = source.match(/每[^0-9]*?(\d+(?:\.\d+)?)\s*([^\d\s，,。；;]*)/)
  const count = toNumber(props.count, countMatch ? Number(countMatch[1]) : (numbers[1] ?? numbers[0] ?? 1))
  const perValue = toNumber(props.perValue, perMatch ? Number(perMatch[1]) : (numbers[0] ?? 1))
  const unit = toText(props.unit, perMatch?.[2] || countMatch?.[2] || extractUnit(source) || '个')

  return {
    count: count > 0 ? count : 1,
    perValue: perValue > 0 ? perValue : 1,
    unit,
    stepLabel: toText(props.stepLabel, `每组 ${perValue > 0 ? perValue : 1}${unit}`),
    totalLabel: toText(props.totalLabel, '一共有'),
    buttonText: toText(props.buttonText, '聚合总量') || '聚合总量',
  }
}

function extractRoundingProps(block: MathComponentProps['block']): RoundingProps {
  const props = readBlockProps(block)
  const source = String(block.math_object || '')
  const numbers = extractAllNumbers(source)
  const strategy: 'ceil' | 'floor' = String(props.strategy || '').toLowerCase() === 'ceil' || /进一|ceil/i.test(block.type) ? 'ceil' : 'floor'
  const remainderValue = toNumber(props.remainderValue, numbers.length > 0 ? numbers[numbers.length - 1] : 0)
  const unit = toText(props.unit, extractUnit(source) || '个')

  return {
    strategy,
    remainderValue,
    unit,
    remainderLabel: toText(props.remainderLabel, strategy === 'ceil'
      ? `还差 ${remainderValue}${unit}，需要再来一次`
      : `剩余 ${remainderValue}${unit}，先把尾巴去掉`),
    buttonText: toText(props.buttonText, strategy === 'ceil' ? '再运一次' : '去掉尾巴') || (strategy === 'ceil' ? '再运一次' : '去掉尾巴'),
  }
}

function extractPatternCycleProps(block: MathComponentProps['block']): PatternCycleProps {
  const props = readBlockProps(block)
  const cycleItems = readStringArray(props.cycleItems, ['图形'])
  const normalizedItems = cycleItems.length > 0 ? cycleItems : ['图形']
  const cycleLength = Math.max(1, toNumber(props.cycleLength, normalizedItems.length))
  const targetN = Math.max(1, toNumber(props.targetN, extractAllNumbers(block.math_object)[0] ?? cycleLength))
  const fullCycles = Math.max(0, toNumber(props.fullCycles, Math.floor(targetN / cycleLength)))
  const remainderCount = Math.max(0, toNumber(props.remainderCount, targetN % cycleLength))
  const queue = Array.from({ length: targetN }, (_, index) => normalizedItems[index % normalizedItems.length] || '图形')
  const targetToken = queue[targetN - 1] || normalizedItems[0] || '图形'
  const derivedPerCycleCount = normalizedItems.slice(0, cycleLength).filter((item) => item === targetToken).length
  const perCycleCount = Math.max(0, toNumber(props.perCycleCount, derivedPerCycleCount))
  const rawType = toText(props.type, block.type && /count|总|数/i.test(block.type) ? 'count_total' : 'find_position')
  const type: PatternCycleProps['type'] = rawType === 'count_total' ? 'count_total' : 'find_position'

  return {
    type,
    targetN,
    cycleLength,
    cycleItems: normalizedItems,
    fullCycles,
    perCycleCount,
    remainderCount,
    buttonText: toText(props.buttonText, '开始探究') || '开始探究',
  }
}

function extractAllNumbers(text: string) {
  return String(text || '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0) ?? []
}

function extractUnit(text: string) {
  const source = String(text || '')
  const candidates = [
    '千米', '公里', '小时', '分钟', '秒', '元/张', '元/把', '元/个', '元/件', '元',
    '米', '厘米', '毫米', '吨', '千克', '克', '瓶', '张', '把', '个', '套', '只', '次', '份', '组',
  ]

  for (const unit of candidates) {
    if (source.includes(unit)) return unit
  }

  return ''
}

function toPartitionProps(blockText: string): PartitionProps {
  const numbers = extractAllNumbers(blockText)
  const total = numbers[0] ?? 0
  const stepValue = numbers[1] ?? 1
  const unit = extractUnit(blockText)

  return {
    total,
    stepValue: stepValue > 0 ? stepValue : 1,
    unit,
    stepLabel: unit ? `每次 ${stepValue} ${unit}` : `每次 ${stepValue}`,
    buttonText: '开始分',
  }
}

function getButtonText(block: MathComponentProps['block'], fallback: string) {
  const props = readBlockProps(block)
  return toText(props.buttonText, fallback) || fallback
}

function readNumberArray(value: unknown, fallback: number[] = []) {
  if (Array.isArray(value)) {
    return value.map((item) => toNumber(item, 0)).filter((item) => Number.isFinite(item) && item >= 0)
  }

  if (typeof value === 'number') {
    return [value]
  }

  return fallback
}

function readStringArray(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item, '')).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(/[,，、/|]/).map((item) => item.trim()).filter(Boolean)
  }

  return fallback
}

function joinUnit(value: number, unit: string) {
  return `${value}${unit || ''}`
}

type MaterialLiteShellProps = {
  block: MathComponentProps['block']
  buttonLabel: string
  children: (active: boolean, visual: ReturnType<typeof buildVisualMeta>) => ReactNode
}

function MaterialLiteShell({ block, buttonLabel, children }: MaterialLiteShellProps) {
  const [active, setActive] = useState(false)

  return (
    <div className="rounded-[22px] border border-[#EAEAEA] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="rounded-[18px] border border-[#EAEAEA] bg-[#FAFAFA] p-3">
        {children(active, buildVisualMeta(block.visual_object))}
      </div>

      <div className="mt-3 flex items-center justify-start gap-2">
        <button
          type="button"
          onClick={() => setActive(false)}
          className="inline-flex items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FAFAFA]"
        >
          重置
        </button>
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className="inline-flex items-center justify-center rounded-[14px] bg-[#0070F3] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-95"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

export function TotalAmountComponent({ block }: MathComponentProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [droppedCount, setDroppedCount] = useState(0)
  const [isPopping, setIsPopping] = useState(false)
  const timerRef = useRef<number | null>(null)
  const popTimerRef = useRef<number | null>(null)

  const totalProps = useMemo(() => extractTotalAmountProps(block), [block])

  const totalValue = totalProps.count * totalProps.perValue
  const stepWidth = totalProps.count > 0 ? 100 / totalProps.count : 100

  useEffect(() => {
    setIsAnimating(false)
    setIsFinished(false)
    setDroppedCount(0)
    setIsPopping(false)
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    if (popTimerRef.current !== null) window.clearTimeout(popTimerRef.current)
  }, [block.math_object, block.visual_object, block.component])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      if (popTimerRef.current !== null) window.clearTimeout(popTimerRef.current)
    }
  }, [])

  const startAggregation = () => {
    if (isAnimating || isFinished || totalProps.count <= 0) return
    setIsAnimating(true)
    setIsFinished(false)
    setDroppedCount(0)

    let next = 0
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      next += 1
      setDroppedCount(next)

      if (next >= totalProps.count) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current)
        timerRef.current = null
        setTimeout(() => {
          setIsAnimating(false)
          setIsFinished(true)
          setIsPopping(true)
          popTimerRef.current = window.setTimeout(() => setIsPopping(false), 260)
        }, 180)
      }
    }, 420)
  }

  const resultText = `${totalValue}${totalProps.unit}`

  return (
    <div className="space-y-4 rounded-[24px] border border-[#EAEAEA] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="grid gap-4 md:grid-rows-[auto_auto]">
        <div className="relative rounded-[22px] border border-[#EAEAEA] bg-[#FAFAFA] p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-[#888888]">
            <span>{totalProps.totalLabel || '总量'}</span>
            <span>{totalValue}{totalProps.unit}</span>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${totalProps.count}, minmax(0, 1fr))` }}>
            {Array.from({ length: totalProps.count }).map((_, index) => {
              const isDropped = droppedCount > index || isFinished
              const isCurrent = droppedCount === index + 1 && isAnimating
              return (
                <div
                  key={index}
                  className={`flex min-h-[100px] flex-col justify-between rounded-[18px] border-r-2 border-white px-3 py-3 text-left text-white transition-all duration-500 ease-out ${
                    isDropped || isCurrent
                      ? 'bg-gradient-to-br from-[#7928CA] to-[#FF0080]'
                      : 'bg-[#D9D9D9]'
                  } ${isPopping && isFinished ? 'scale-[1.03]' : 'scale-100'} ${isCurrent ? 'translate-y-1' : isDropped ? 'translate-y-0' : '-translate-y-0'}`}
                  style={{
                    transform: `translateY(${isDropped ? '0' : isCurrent ? '8px' : '-8px'}) scale(${isPopping && isFinished ? 1.03 : 1})`,
                  }}
                >
                  <div className="text-[11px] font-medium opacity-90">{totalProps.stepLabel || '每份数'}</div>
                  <div className="text-sm font-semibold">{totalProps.perValue}{totalProps.unit}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[22px] border border-[#EAEAEA] bg-[#FAFAFA] p-4">
          <div className="flex items-center justify-between text-xs text-[#888888]">
            <span>Track</span>
            <span>{isFinished ? resultText : '?'}</span>
          </div>

          <div className={`relative mt-3 h-[88px] overflow-hidden rounded-[20px] border-2 border-dashed border-[#D9D9D9] bg-white transition-all duration-300 ${isPopping && isFinished ? 'scale-[1.01]' : 'scale-100'}`}>
            <div className="absolute inset-2 overflow-hidden rounded-[16px] bg-[#F5F5F5]">
              <div className="relative flex h-full w-full">
                {Array.from({ length: totalProps.count }).map((_, index) => {
                  const filled = droppedCount > index || isFinished
                  return (
                    <div
                      key={index}
                      className={`h-full border-r-2 border-white transition-all duration-500 ${
                        filled ? 'bg-gradient-to-r from-[#7928CA] to-[#FF0080]' : 'bg-transparent'
                      }`}
                      style={{ width: `${stepWidth}%`, opacity: filled ? 1 : 0.2 }}
                    />
                  )
                })}
              </div>
            </div>

            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl font-semibold text-[#888888] transition-all duration-300">
              {isFinished ? resultText : '?'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-start gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsAnimating(false)
              setIsFinished(false)
              setDroppedCount(0)
              setIsPopping(false)
              if (timerRef.current !== null) window.clearInterval(timerRef.current)
              if (popTimerRef.current !== null) window.clearTimeout(popTimerRef.current)
            }}
            className="inline-flex items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FAFAFA]"
          >
            重置
          </button>
          <button
            type="button"
            disabled={isAnimating || isFinished || totalProps.count <= 0}
            onClick={startAggregation}
            className="inline-flex items-center justify-center rounded-[14px] bg-[#0070F3] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isFinished ? '已完成' : isAnimating ? '播放中' : (totalProps.buttonText || '聚合总量')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PartitionComponent({ block }: MathComponentProps) {
  const props = readBlockProps(block)
  const visual = buildVisualMeta(block.visual_object)
  const { total, stepValue, unit, stepLabel, buttonText } = useMemo(() => {
    const fallback = toPartitionProps(block.math_object)
    return {
      total: toNumber(props.total, fallback.total),
      stepValue: toNumber(props.stepValue, fallback.stepValue),
      unit: toText(props.unit, fallback.unit),
      stepLabel: toText(props.stepLabel, fallback.stepLabel),
      buttonText: toText(props.buttonText, fallback.buttonText) || fallback.buttonText,
    }
  }, [block.math_object, props.buttonText, props.stepLabel, props.stepValue, props.total, props.unit])
  const quotient = useMemo(() => (stepValue > 0 ? Math.floor(total / stepValue) : 0), [total, stepValue])
  const remainder = useMemo(() => (stepValue > 0 ? total % stepValue : 0), [total, stepValue])
  const segmentWidth = total > 0 ? (stepValue / total) * 100 : 0
  const [currentCutCount, setCurrentCutCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    setCurrentCutCount(0)
    setIsAnimating(false)
    setIsFinished(false)
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
  }, [block.component, block.math_object, block.visual_object])

  const startCutting = () => {
    if (isAnimating || isFinished || quotient <= 0) return
    setCurrentCutCount(0)
    setIsAnimating(true)
    setIsFinished(false)

    let nextCut = 0

    intervalRef.current = window.setInterval(() => {
      nextCut += 1
      setCurrentCutCount(nextCut)

      if (nextCut >= quotient) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
        intervalRef.current = null
        timeoutRef.current = window.setTimeout(() => {
          setIsAnimating(false)
          setIsFinished(true)
        }, 420)
      }
    }, 760)
  }

  const cutterLeft = `${Math.min(currentCutCount * segmentWidth, 100)}%`

  return (
    <div className="rounded-[24px] border border-[#EAEAEA] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between text-xs text-[#888888]">
        <span>0</span>
        <span>{total}{unit}</span>
      </div>

      <div className="relative mt-4">
        <div className="relative h-16 overflow-hidden rounded-[18px] bg-[#E5E5E5]">
          <div className="absolute inset-y-0 left-0 flex h-full w-full">
            {Array.from({ length: quotient }).map((_, index) => {
              const filled = currentCutCount > index || (isFinished && index < quotient)
              return (
                <div
                  key={index}
                  className={`h-full border-r-2 border-white transition-all duration-500 ${
                    filled ? 'bg-gradient-to-r from-[#7928CA] to-[#FF0080]' : 'bg-[#D9D9D9]'
                  }`}
                  style={{ width: `${segmentWidth}%` }}
                />
              )
            })}
            {remainder > 0 && (
              <div
                className={`h-full border-r-2 border-white transition-all duration-500 ${
                  isFinished ? 'bg-[rgba(217,217,217,0.45)]' : 'bg-[#D9D9D9]'
                }`}
                style={{ width: `${total > 0 ? (remainder / total) * 100 : 0}%` }}
              />
            )}
          </div>

          <div
            className={`absolute top-[-6px] z-10 transition-all duration-500 ease-out ${
              isAnimating || currentCutCount > 0 || isFinished ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ left: cutterLeft, transform: 'translateX(-50%)' }}
          >
            <div className="mx-auto h-0 w-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-[#0070F3]" />
            <div className="mx-auto mt-[-1px] h-12 w-[2px] rounded-full bg-[#0070F3]" />
          </div>
        </div>

      </div>

      <div className="mt-4 flex items-center justify-start gap-2">
        <button
          type="button"
          onClick={() => {
            setCurrentCutCount(0)
            setIsAnimating(false)
            setIsFinished(false)
            if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
            if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
          }}
          className="inline-flex items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FAFAFA]"
        >
          重置
        </button>
        <button
          type="button"
          disabled={isAnimating || isFinished || quotient <= 0}
          onClick={startCutting}
          className="inline-flex items-center justify-center rounded-[14px] bg-[#0070F3] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isFinished ? '已完成' : isAnimating ? '播放中' : (buttonText || '开始分')}
        </button>
      </div>
    </div>
  )
}

export function DifferenceComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  const phrases = phraseChips(block.math_object)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="对齐比较">
      {(active) => (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">两个量</div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs text-[var(--color-body)]">{phrases[0] || '量 A'}</div>
                <div className={`h-4 flex-1 rounded-full transition-all duration-300 ${active ? 'bg-[var(--color-link)]' : 'bg-[var(--color-canvas-soft)]'}`} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs text-[var(--color-body)]">{phrases[1] || '量 B'}</div>
                <div className="h-4 flex-1 rounded-full bg-[var(--color-canvas-soft)]" />
              </div>
            </div>
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-highlight-pink)] bg-[rgba(255,0,128,0.06)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">比较感</div>
            <div className="mt-2 text-sm text-[var(--color-ink)]">把差出来的那一段轻轻高亮。</div>
            <div className="mt-3 flex items-center gap-2 text-2xl">{active ? '↔️' : '↔'}</div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}

export function RemainderComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  const phrases = phraseChips(block.math_object)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="看看剩下的">
      {(active, visual) => (
        <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">完整部分</div>
            <div className="mt-3 flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={`h-10 flex-1 rounded-[14px] transition-all duration-300 ${index < 4 ? 'bg-[var(--color-link)]/20' : active ? 'bg-[var(--color-highlight-pink)]/25' : 'bg-[var(--color-canvas-soft)]'}`} />
              ))}
            </div>
            <div className="mt-3 text-sm text-[var(--color-body)]">{phrases[0] || block.math_object}</div>
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-green-300 bg-[rgba(34,197,94,0.08)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">剩余尾巴</div>
            <div className="mt-2 flex items-center gap-3 text-2xl">{visual.emoji}<span className="text-sm text-[var(--color-body)]">{active ? '剩下的部分单独亮出来' : '点击后看剩余怎么被提取'}</span></div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}

export function MultipleComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  const tokens = buildVisualMeta(block.visual_object).tokens
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="展示倍数">
      {(active, visual) => (
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">基础单位</div>
            <div className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{block.math_object}</div>
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${active ? 'bg-[var(--color-link)] text-white' : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}>
            × 倍数
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-gradient-start)] bg-[rgba(121,40,202,0.06)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">放大后的排布</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: active ? 6 : 3 }).map((_, index) => (
                <div key={index} className="rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-3 text-center text-xl">
                  {tokens[index % tokens.length] || visual.emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}

export function UnitConvertComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  const phrases = phraseChips(block.math_object)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="统一单位">
      {(active) => (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">原单位</div>
            <div className="mt-2">{scenePill(phrases[0] || '原单位', false)}</div>
          </div>
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">统一后</div>
            <div className="mt-2">{scenePill(phrases[1] || '统一单位', active)}</div>
          </div>
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">关系提示</div>
            <div className="mt-2 text-sm text-[var(--color-ink)]">{active ? '现在看起来像同一种单位了' : '点击后标签会更统一'}</div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}

export function PointSegmentComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="点亮点段">
      {(active, visual) => (
        <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
          <div className="text-[11px] text-[var(--color-mute)]">点段关系</div>
          <div className="mt-4 flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full transition-all duration-300 ${active && index <= 2 ? 'bg-[var(--color-link)]' : 'bg-[var(--color-canvas-soft-2)]'}`} />
                {index < 4 && <div className={`h-1 w-12 rounded-full transition-all duration-300 ${active && index < 3 ? 'bg-[var(--color-gradient-start)]' : 'bg-[var(--color-canvas-soft)]'}`} />}
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-[var(--color-body)]">{active ? '点和段的对应关系已轻量高亮' : '点击按钮让点和段更醒目'}</div>
          <div className="mt-3 flex items-center gap-2 text-xl">{visual.emoji}</div>
        </div>
      )}
    </MathComponentShell>
  )
}

export function PriceQuantityComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  const phrases = phraseChips(block.math_object)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="查看价格关系">
      {(active) => (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: '单价', value: phrases[0] || '每个多少钱' },
            { label: '数量', value: phrases[1] || '有几个' },
            { label: '总价', value: phrases[2] || '合起来多少钱' },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`rounded-[20px] border p-4 transition-all duration-300 ${
                active && index === 2 ? 'border-[var(--color-highlight-pink)] bg-[rgba(255,0,128,0.06)]' : 'border-[var(--color-hairline)] bg-white'
              }`}
            >
              <div className="text-[11px] text-[var(--color-mute)]">{item.label}</div>
              <div className="mt-2 text-sm font-medium text-[var(--color-ink)]">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </MathComponentShell>
  )
}

export function DistanceSpeedTimeComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="建立关系">
      {(active) => (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: '路程', value: '走了多远' },
            { label: '时间', value: '走了多久' },
            { label: '速度', value: '每小时多快' },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`rounded-[20px] border p-4 transition-all duration-300 ${
                active && index === 1 ? 'border-[var(--color-link)] bg-[rgba(0,112,243,0.06)]' : 'border-[var(--color-hairline)] bg-white'
              }`}
            >
              <div className="text-[11px] text-[var(--color-mute)]">{item.label}</div>
              <div className="mt-2 text-sm font-medium text-[var(--color-ink)]">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </MathComponentShell>
  )
}

export function GeometryAreaComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="切换图形">
      {(active) => (
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">图形轮廓</div>
            <div className={`mt-3 h-24 rounded-[24px] border-2 transition-all duration-300 ${active ? 'border-green-400 bg-green-50' : 'border-[var(--color-canvas-soft-2)] bg-[var(--color-canvas-soft)]'}`} />
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${active ? 'bg-green-600 text-white' : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}>
            面积 / 周长
          </div>
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">基础关系</div>
            <div className="mt-2 text-sm text-[var(--color-ink)]">长、宽、边长只做展示</div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}

export function TimeComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  const times = extractTimes(block.math_object)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="让时间走一走">
      {(active, visual) => (
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">时间轴</div>
            <div className="mt-4 flex items-center gap-3">
              <div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1 text-xs text-[var(--color-body)]">{times[0]}</div>
              <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${active ? 'bg-[var(--color-link)]' : 'bg-[var(--color-canvas-soft)]'}`} />
              <div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1 text-xs text-[var(--color-body)]">{times[1]}</div>
            </div>
            <div className="mt-3 text-sm text-[var(--color-body)]">{active ? '指针从起点向终点走了一段' : '点击后让时间线动起来'}</div>
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-gradient-start)] bg-[rgba(121,40,202,0.06)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">钟表感</div>
            <div className="mt-3 text-4xl">{visual.emoji}</div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}

export function RoundingComponent({ block }: MathComponentProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [showPop, setShowPop] = useState(false)
  const [removing, setRemoving] = useState(false)
  const timerRef = useRef<number | null>(null)
  const popTimerRef = useRef<number | null>(null)

  const roundingProps = useMemo(() => extractRoundingProps(block), [block])
  const completeCount = useMemo(() => {
    const firstNumber = extractAllNumbers(block.math_object)[0] ?? roundingProps.remainderValue
    return Math.max(1, Math.floor(firstNumber || 1))
  }, [block.math_object, roundingProps.remainderValue])
  const resultCount = roundingProps.strategy === 'ceil' ? completeCount + 1 : completeCount

  useEffect(() => {
    setIsAnimating(false)
    setIsFinished(false)
    setShowPop(false)
    setRemoving(false)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    if (popTimerRef.current !== null) window.clearTimeout(popTimerRef.current)
  }, [block.type, block.math_object, block.visual_object])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      if (popTimerRef.current !== null) window.clearTimeout(popTimerRef.current)
    }
  }, [])

  const startRound = () => {
    if (isAnimating || isFinished) return
    setIsAnimating(true)
    setRemoving(false)
    setShowPop(false)

    timerRef.current = window.setTimeout(() => {
      if (roundingProps.strategy === 'ceil') {
        setShowPop(true)
        popTimerRef.current = window.setTimeout(() => {
          setShowPop(false)
          setIsAnimating(false)
          setIsFinished(true)
        }, 320)
      } else {
        setRemoving(true)
        popTimerRef.current = window.setTimeout(() => {
          setRemoving(false)
          setIsAnimating(false)
          setIsFinished(true)
        }, 260)
      }
    }, 420)
  }

  const resultText = `${resultCount}${roundingProps.unit}`

  return (
    <div className="space-y-4 rounded-[24px] border border-[#EAEAEA] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between text-xs text-[#888888]">
        <span>{roundingProps.strategy === 'ceil' ? '进一法' : '去尾法'}</span>
        <span>{isFinished ? resultText : '?'}</span>
      </div>

      <div className="rounded-[22px] border border-[#EAEAEA] bg-[#FAFAFA] p-4">
        <div className="flex items-center justify-between text-sm text-[#888888]">
          <span>{roundingProps.strategy === 'ceil' ? '完整块 + 尾巴' : '完整块 + 余数块'}</span>
          <span className={`rounded-full px-3 py-1 text-xs ${roundingProps.strategy === 'ceil' ? 'bg-[rgba(255,0,128,0.08)] text-[var(--color-highlight-pink)]' : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'}`}>
            {roundingProps.remainderLabel}
          </span>
        </div>

        <div className="mt-4 flex items-end gap-2">
          {Array.from({ length: completeCount }).map((_, index) => (
            <div
              key={index}
              className={`h-14 flex-1 rounded-[16px] border-r-2 border-white bg-gradient-to-br from-[#7928CA] to-[#FF0080] transition-all duration-300 ${
                isAnimating ? 'opacity-60' : 'opacity-35'
              }`}
            />
          ))}
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-[16px] border-r-2 border-white text-sm font-semibold transition-all duration-300 ${
              roundingProps.strategy === 'ceil'
                ? (showPop || isFinished)
                  ? 'bg-gradient-to-br from-[#7928CA] to-[#FF0080] text-white scale-105'
                  : 'animate-pulse bg-[rgba(255,0,128,0.18)] text-[var(--color-highlight-pink)]'
                : removing
                  ? 'translate-y-8 bg-[#EAEAEA] text-[var(--color-body)] opacity-0'
                  : 'bg-[#EAEAEA] text-[var(--color-body)]'
            }`}
          >
            {roundingProps.strategy === 'ceil' ? '+' : roundingProps.remainderValue}
          </div>
        </div>
      </div>

      <div className={`rounded-[22px] border border-[#EAEAEA] bg-[#FAFAFA] p-4 transition-all duration-300 ${isFinished ? 'ring-2 ring-[rgba(0,112,243,0.14)]' : ''}`}>
        <div className="flex items-center justify-between text-xs text-[#888888]">
          <span>整除结果</span>
          <span className="text-lg font-semibold text-[#171717]">{isFinished ? resultText : '?'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsAnimating(false)
              setIsFinished(false)
              setShowPop(false)
              setRemoving(false)
              if (timerRef.current !== null) window.clearTimeout(timerRef.current)
              if (popTimerRef.current !== null) window.clearTimeout(popTimerRef.current)
            }}
            className="inline-flex items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FAFAFA]"
          >
            重置
          </button>
          <button
            type="button"
            disabled={isAnimating || isFinished}
            onClick={startRound}
            className="inline-flex items-center justify-center rounded-[14px] bg-[#0070F3] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isFinished ? '已完成' : isAnimating ? '播放中' : (roundingProps.buttonText || '去尾/进一')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SumComponent({ block }: MathComponentProps) {
  const props = readBlockProps(block)
  const fallbackParts = extractAllNumbers(block.math_object).slice(0, 4)
  const parts = readNumberArray(props.parts, fallbackParts.length > 0 ? fallbackParts : [12, 18])
  const labels = readStringArray(props.labels, parts.map((_, index) => `部分 ${index + 1}`))
  const unit = toText(props.unit, extractUnit(block.math_object) || '个')
  const total = parts.reduce((sum, value) => sum + value, 0)

  const [placed, setPlaced] = useState<boolean[]>(() => Array.from({ length: parts.length }, () => false))
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dropZoneRect, setDropZoneRect] = useState<DOMRect | null>(null)
  const [overDropZone, setOverDropZone] = useState(false)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    setPlaced(Array.from({ length: parts.length }, () => false))
    setDragIndex(null)
    setIsDragging(false)
    setDragPos({ x: 0, y: 0 })
    setOverDropZone(false)
  }, [block.component, block.math_object, block.visual_object, parts.length])

  useEffect(() => {
    const updateRects = () => {
      if (dropRef.current) setDropZoneRect(dropRef.current.getBoundingClientRect())
    }
    updateRects()
    window.addEventListener('resize', updateRects)
    return () => window.removeEventListener('resize', updateRects)
  }, [])

  const allPlaced = placed.every(Boolean)
  const sumText = joinUnit(total, unit)

  const startDrag = (index: number, event: React.PointerEvent<HTMLDivElement>) => {
    if (placed[index] || !boardRef.current) return
    const boardRect = boardRef.current.getBoundingClientRect()
    const current = itemRefs.current[index]?.getBoundingClientRect()
    if (!current) return
    setDragIndex(index)
    setIsDragging(true)
    setDragPos({
      x: current.left - boardRect.left,
      y: current.top - boardRect.top,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragIndex === null || !boardRef.current) return
    const boardRect = boardRef.current.getBoundingClientRect()
    const currentRef = itemRefs.current[dragIndex]?.getBoundingClientRect()
    const width = currentRef?.width ?? 120
    const height = currentRef?.height ?? 56
    const nextPos = {
      x: event.clientX - boardRect.left - width / 2,
      y: event.clientY - boardRect.top - height / 2,
    }
    setDragPos(nextPos)
    if (dropZoneRect) {
      setOverDropZone(
        event.clientX >= dropZoneRect.left &&
        event.clientX <= dropZoneRect.right &&
        event.clientY >= dropZoneRect.top &&
        event.clientY <= dropZoneRect.bottom,
      )
    }
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragIndex === null || !dropZoneRect || !boardRef.current) return
    const insideDrop =
      event.clientX >= dropZoneRect.left &&
      event.clientX <= dropZoneRect.right &&
      event.clientY >= dropZoneRect.top &&
      event.clientY <= dropZoneRect.bottom

    if (insideDrop) {
      setPlaced((prev) => prev.map((item, index) => (index === dragIndex ? true : item)))
    }

    setDragIndex(null)
    setIsDragging(false)
    setOverDropZone(false)
  }

  return (
    <div ref={boardRef} className="relative rounded-[22px] border border-[#EAEAEA] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="grid gap-2 sm:grid-cols-2">
        {parts.map((part, index) => {
          const isPlaced = placed[index]
          const isDraggingItem = dragIndex === index && isDragging
            const baseNode = (
              <div className={`rounded-[16px] border p-3 transition-all duration-300 ${isPlaced ? 'border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)] opacity-50' : 'border-[#EAEAEA] bg-white'}`}>
                <div className="text-[11px] text-[#888888]">{labels[index] || `部分 ${index + 1}`}</div>
                <div className="mt-2 text-sm font-semibold text-[#171717]">{joinUnit(part, unit)}</div>
              </div>
          )

          return (
            <div key={`${part}-${index}`} className="relative">
              <div
                ref={(node) => {
                  itemRefs.current[index] = node
                }}
                onPointerDown={(event) => startDrag(index, event)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={`touch-none select-none ${isDraggingItem ? 'opacity-0' : ''} ${isPlaced ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
              >
                {baseNode}
              </div>

              {isDraggingItem && (
                <div
                  className="pointer-events-none absolute z-20 w-full max-w-[calc(50%-8px)]"
                  style={{
                    left: `${dragPos.x}px`,
                    top: `${dragPos.y}px`,
                  }}
                >
                  <div className="rounded-[16px] border border-[#7928CA]/20 bg-white p-3 shadow-[0_16px_28px_rgba(121,40,202,0.18)]">
                    <div className="text-[11px] text-[#888888]">{labels[index] || `部分 ${index + 1}`}</div>
                    <div className="mt-2 text-sm font-semibold text-[#171717]">{joinUnit(part, unit)}</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div
        ref={dropRef}
        className={`mt-3 rounded-[16px] border p-3 transition-all duration-300 ${allPlaced || overDropZone ? 'border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)]' : 'border-dashed border-[#EAEAEA] bg-[#FAFAFA]'}`}
      >
        <div className="text-[11px] text-[#888888]">合成区</div>
        <div className="mt-2 flex min-h-[64px] flex-wrap items-center gap-2 rounded-[14px] bg-white px-3 py-3 text-center text-xl font-semibold text-[#171717]">
          {placed.some(Boolean) ? (
            <>
              {parts.map((part, index) =>
                placed[index] ? (
                  <span key={`placed-${index}`} className="rounded-full border border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)] px-3 py-1 text-sm font-semibold text-[#171717]">
                    {labels[index] || `部分 ${index + 1}`} {joinUnit(part, unit)}
                  </span>
                ) : null,
              )}
              {allPlaced && (
                <span className="rounded-full bg-gradient-to-r from-[#7928CA] to-[#FF0080] px-3 py-1 text-sm font-semibold text-white">
                  {sumText}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-[#888888]">把上面的部分拖进来</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-start">
        <button
          type="button"
          onClick={() => {
            setPlaced(Array.from({ length: parts.length }, () => false))
            setDragIndex(null)
            setIsDragging(false)
            setDragPos({ x: 0, y: 0 })
            setOverDropZone(false)
          }}
          className="inline-flex items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FAFAFA]"
        >
          重置
        </button>
      </div>
    </div>
  )
}

export function AverageComponent({ block }: MathComponentProps) {
  const props = readBlockProps(block)
  const total = toNumber(props.total, extractAllNumbers(block.math_object)[0] ?? 0)
  const count = Math.max(1, toNumber(props.count, extractAllNumbers(block.math_object)[1] ?? 4))
  const unit = toText(props.unit, extractUnit(block.math_object) || '个')
  const average = count > 0 ? total / count : 0
  const cutCountTotal = Math.max(0, count - 1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [cutProgress, setCutProgress] = useState(0)
  const cutTimerRef = useRef<number | null>(null)
  const finishTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setIsAnimating(false)
    setIsCompleted(false)
    setCutProgress(0)
    if (cutTimerRef.current !== null) window.clearInterval(cutTimerRef.current)
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current)
  }, [block.component, block.math_object, block.visual_object, total, count, unit])

  useEffect(() => {
    return () => {
      if (cutTimerRef.current !== null) window.clearInterval(cutTimerRef.current)
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current)
    }
  }, [])

  const resetDemo = () => {
    if (cutTimerRef.current !== null) window.clearInterval(cutTimerRef.current)
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current)
    setIsAnimating(false)
    setIsCompleted(false)
    setCutProgress(0)
  }

  const startDemo = () => {
    if (isAnimating) return
    if (isCompleted) {
      resetDemo()
      return
    }

    if (cutCountTotal <= 0) {
      setIsCompleted(true)
      return
    }

    setIsAnimating(true)
    setIsCompleted(false)
    setCutProgress(0)

    let nextCut = 0
    cutTimerRef.current = window.setInterval(() => {
      nextCut += 1
      setCutProgress(nextCut)

      if (nextCut >= cutCountTotal) {
        if (cutTimerRef.current !== null) window.clearInterval(cutTimerRef.current)
        cutTimerRef.current = null
        finishTimerRef.current = window.setTimeout(() => {
          setIsAnimating(false)
          setIsCompleted(true)
        }, 520)
      }
    }, 520)
  }

  const visibleSegments = isCompleted ? count : Math.min(count, cutProgress + 1)
  const segmentWidth = 100 / Math.max(1, visibleSegments)

  return (
    <div className="rounded-[22px] border border-[#EAEAEA] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="relative overflow-hidden rounded-[18px] border border-[#EAEAEA] bg-[#FAFAFA] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] text-[#888888]">{props.totalLabel || '总量展示'}</div>
            <div className="mt-1 text-sm font-medium text-[#171717]">
              {isCompleted ? '均分结果' : isAnimating ? '正在均分' : '总量展示'}
            </div>
          </div>
          <div className="rounded-full bg-[rgba(0,112,243,0.08)] px-3 py-1 text-sm font-semibold text-[#0070F3]">
            {joinUnit(total, unit)}
          </div>
        </div>

        <div className="relative mt-6 h-[92px]">
          <div className="absolute left-0 right-0 top-1/2 h-6 -translate-y-1/2 rounded-full bg-[#EAEAEA]/75" />

          <div className="absolute left-0 right-0 top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-full">
            <div
              className="flex h-full transition-all duration-500 ease-out"
              style={{ width: isCompleted || isAnimating ? '100%' : '100%' }}
            >
              {Array.from({ length: visibleSegments }).map((_, index) => (
                <div
                  key={index}
                  className={`relative h-full border-r-2 border-white transition-all duration-500 ease-out ${
                    isCompleted || isAnimating
                      ? 'bg-gradient-to-r from-[#7928CA] to-[#FF0080]'
                      : 'bg-gradient-to-r from-[#7928CA] to-[#FF0080]'
                  }`}
                  style={{ width: `${segmentWidth}%` }}
                >
                <div
                  className={`absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 px-1 text-[10px] font-medium leading-none tracking-wide text-white transition-all duration-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${
                      isCompleted
                        ? 'translate-y-0 scale-100 opacity-100'
                        : isAnimating
                          ? 'scale-95 opacity-100'
                          : 'scale-95 opacity-90'
                    }`}
                  >
                    {isCompleted ? joinUnit(average, unit) : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      <div className="mt-3 flex items-center justify-end text-xs text-[#888888]">
        <span>{isCompleted ? `每段 ${joinUnit(average, unit)}` : ''}</span>
      </div>
      </div>

      <div className="mt-3 flex items-center justify-start gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FAFAFA]"
          >
            重置
          </button>
          <button
            type="button"
            disabled={isAnimating || isCompleted}
            onClick={startDemo}
            className="inline-flex items-center justify-center rounded-[14px] bg-[#0070F3] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:bg-[#EAEAEA] disabled:text-[#888888] disabled:opacity-100"
          >
            {isCompleted ? '已完成' : isAnimating ? '播放中' : getButtonText(block, '开始均分')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function FractionComponent({ block }: MathComponentProps) {
  const props = readBlockProps(block)
  const total = toNumber(props.total, extractAllNumbers(block.math_object)[0] ?? 1)
  const part = toNumber(props.part, extractAllNumbers(block.math_object)[1] ?? 1)
  const numerator = Math.max(1, toNumber(props.numerator, part))
  const denominator = Math.max(numerator, toNumber(props.denominator, total))
  const segmentWidth = denominator > 0 ? 100 / denominator : 100
  const [isAnimating, setIsAnimating] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [segmentProgress, setSegmentProgress] = useState(0)
  const [highlightProgress, setHighlightProgress] = useState(0)
  const segmentTimerRef = useRef<number | null>(null)
  const highlightDelayRef = useRef<number | null>(null)
  const highlightIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    setIsAnimating(false)
    setIsCompleted(false)
    setSegmentProgress(0)
    setHighlightProgress(0)
    if (segmentTimerRef.current !== null) window.clearInterval(segmentTimerRef.current)
    if (highlightDelayRef.current !== null) window.clearTimeout(highlightDelayRef.current)
    if (highlightIntervalRef.current !== null) window.clearInterval(highlightIntervalRef.current)
  }, [block.component, block.math_object, block.visual_object, total, part, numerator, denominator])

  useEffect(() => {
    return () => {
      if (segmentTimerRef.current !== null) window.clearInterval(segmentTimerRef.current)
      if (highlightDelayRef.current !== null) window.clearTimeout(highlightDelayRef.current)
      if (highlightIntervalRef.current !== null) window.clearInterval(highlightIntervalRef.current)
    }
  }, [])

  const resetDemo = () => {
    if (segmentTimerRef.current !== null) window.clearInterval(segmentTimerRef.current)
    if (highlightDelayRef.current !== null) window.clearTimeout(highlightDelayRef.current)
    if (highlightIntervalRef.current !== null) window.clearInterval(highlightIntervalRef.current)
    setIsAnimating(false)
    setIsCompleted(false)
    setSegmentProgress(0)
    setHighlightProgress(0)
  }

  const startDemo = () => {
    if (isAnimating) return
    if (isCompleted) {
      resetDemo()
      return
    }

    setIsAnimating(true)
    setIsCompleted(false)
    setSegmentProgress(0)
    setHighlightProgress(0)

    let nextSegment = 0
    segmentTimerRef.current = window.setInterval(() => {
      nextSegment += 1
      setSegmentProgress(nextSegment)

      if (nextSegment >= Math.max(0, denominator - 1)) {
        if (segmentTimerRef.current !== null) window.clearInterval(segmentTimerRef.current)
        segmentTimerRef.current = null
        highlightDelayRef.current = window.setTimeout(() => {
          let nextHighlight = 0
          const maxHighlight = Math.min(numerator, denominator)
          highlightIntervalRef.current = window.setInterval(() => {
            nextHighlight += 1
            setHighlightProgress(nextHighlight)

            if (nextHighlight >= maxHighlight) {
              if (highlightIntervalRef.current !== null) window.clearInterval(highlightIntervalRef.current)
              highlightIntervalRef.current = null
              highlightDelayRef.current = window.setTimeout(() => {
                setIsAnimating(false)
                setIsCompleted(true)
              }, 180)
            }
          }, 260)
        }, 220)
      }
    }, 380)
  }

  return (
    <div className="rounded-[22px] border border-[#EAEAEA] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="rounded-[18px] border border-[#EAEAEA] bg-[#FAFAFA] p-3">
        <div className="relative overflow-hidden rounded-full bg-[#E5E5E5]">
          <div className="flex h-6 w-full">
            {Array.from({ length: Math.max(1, isCompleted ? denominator : Math.max(1, segmentProgress + 1)) }).map((_, index) => {
              const filled = (isCompleted || highlightProgress > index) && index < numerator
              return (
                <div
                  key={index}
                  className={`h-full border-r-2 border-white transition-all duration-300 ${filled ? 'bg-gradient-to-r from-[#7928CA] to-[#FF0080]' : 'bg-[#D9D9D9]'}`}
                  style={{ width: `${segmentWidth}%` }}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-start gap-2">
        <button
          type="button"
          onClick={resetDemo}
          className="inline-flex items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FAFAFA]"
        >
          重置
        </button>
        <button
          type="button"
          disabled={isAnimating || isCompleted}
          onClick={startDemo}
          className="inline-flex items-center justify-center rounded-[14px] bg-[#0070F3] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:bg-[#EAEAEA] disabled:text-[#888888] disabled:opacity-100"
        >
          {isCompleted ? '已完成' : isAnimating ? '播放中' : getButtonText(block, '开始看分数')}
        </button>
      </div>
    </div>
  )
}

export function PatternCycleComponent({ block }: MathComponentProps) {
  const rawProps = useMemo(() => extractPatternCycleProps(block), [block])
  const useDemoPreset =
    rawProps.targetN === 1 &&
    rawProps.cycleLength === 1 &&
    rawProps.fullCycles === 1 &&
    rawProps.remainderCount === 1 &&
    rawProps.cycleItems.length === 1 &&
    rawProps.cycleItems[0] === '图形'

  const props = useMemo(() => {
    if (!useDemoPreset) return rawProps

    return {
      ...rawProps,
      type: 'find_position' as const,
      targetN: 11,
      cycleLength: 3,
      cycleItems: ['🔴', '🔺', '🟦'],
      fullCycles: 3,
      perCycleCount: 1,
      remainderCount: 2,
      buttonText: rawProps.buttonText || '开始探究',
    }
  }, [rawProps, useDemoPreset])

  const queueItems = useMemo(
    () => Array.from({ length: props.targetN }, (_, index) => props.cycleItems[index % props.cycleItems.length] || '图形'),
    [props.cycleItems, props.targetN],
  )
  const targetToken = queueItems[props.targetN - 1] || props.cycleItems[0] || '图形'
  const remainderItems = queueItems.slice(props.fullCycles * props.cycleLength)
  const fullGroups = Math.max(0, props.fullCycles)

  const [isAnimating, setIsAnimating] = useState(false)
  const [activeGroups, setActiveGroups] = useState(0)
  const [remainderGlow, setRemainderGlow] = useState(false)
  const [targetGlow, setTargetGlow] = useState(false)
  const [matchedGlow, setMatchedGlow] = useState(false)
  const groupTimerRef = useRef<number | null>(null)
  const stageTimerRef = useRef<number | null>(null)

  const clearTimers = () => {
    if (groupTimerRef.current !== null) window.clearInterval(groupTimerRef.current)
    if (stageTimerRef.current !== null) window.clearTimeout(stageTimerRef.current)
    groupTimerRef.current = null
    stageTimerRef.current = null
  }

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  useEffect(() => {
    clearTimers()
    setIsAnimating(false)
    setActiveGroups(0)
    setRemainderGlow(false)
    setTargetGlow(false)
    setMatchedGlow(false)
  }, [block.component, block.math_object, block.visual_object, props.targetN, props.cycleLength, props.fullCycles, props.remainderCount, props.perCycleCount, props.cycleItems])

  const resetDemo = () => {
    if (isAnimating) return
    clearTimers()
    setActiveGroups(0)
    setRemainderGlow(false)
    setTargetGlow(false)
    setMatchedGlow(false)
    setIsAnimating(false)
  }

  const finishTargetStage = () => {
    setRemainderGlow(false)
    setTargetGlow(true)
    setMatchedGlow(true)
    stageTimerRef.current = window.setTimeout(() => {
      setIsAnimating(false)
    }, 600)
  }

  const enterTargetStage = () => {
    if (props.remainderCount > 0) {
      setRemainderGlow(true)
      stageTimerRef.current = window.setTimeout(() => {
        finishTargetStage()
      }, 620)
      return
    }

    finishTargetStage()
  }

  const startAnimation = () => {
    if (isAnimating) return

    clearTimers()
    setIsAnimating(true)
    setActiveGroups(0)
    setRemainderGlow(false)
    setTargetGlow(false)
    setMatchedGlow(false)

    if (fullGroups <= 0) {
      stageTimerRef.current = window.setTimeout(() => {
        enterTargetStage()
      }, 180)
      return
    }

    let nextGroup = 0
    groupTimerRef.current = window.setInterval(() => {
      nextGroup += 1
      setActiveGroups(nextGroup)

      if (nextGroup >= fullGroups) {
        if (groupTimerRef.current !== null) window.clearInterval(groupTimerRef.current)
        groupTimerRef.current = null
        stageTimerRef.current = window.setTimeout(() => {
          enterTargetStage()
        }, 180)
      }
    }, 400)
  }

  const groups = useMemo(() => {
    const list: Array<{ kind: 'full' | 'remainder'; items: string[]; key: string; index: number }> = []

    for (let groupIndex = 0; groupIndex < fullGroups; groupIndex += 1) {
      list.push({
        kind: 'full',
        items: queueItems.slice(groupIndex * props.cycleLength, (groupIndex + 1) * props.cycleLength),
        key: `full-${groupIndex}`,
        index: groupIndex,
      })
    }

    if (props.remainderCount > 0) {
      list.push({
        kind: 'remainder',
        items: remainderItems,
        key: 'remainder',
        index: fullGroups,
      })
    }

    if (list.length === 0) {
      list.push({
        kind: 'remainder',
        items: queueItems,
        key: 'fallback',
        index: 0,
      })
    }

    return list
  }, [fullGroups, props.cycleLength, props.remainderCount, queueItems, remainderItems])

  return (
    <div className="w-full max-w-2xl rounded-[28px] border border-neutral-100 bg-white p-8 shadow-xl shadow-black/5">
      <style>{`
        @keyframes patternCycleJelly {
          0%, 100% { transform: scale(1, 1); }
          30% { transform: scale(1.25, 0.75); }
          40% { transform: scale(0.75, 1.25); }
          50% { transform: scale(1.15, 0.85); }
          65% { transform: scale(0.95, 1.05); }
          75% { transform: scale(1.05, 0.95); }
        }
      `}</style>

      <div className="rounded-[18px] border border-neutral-200/60 bg-[#FAFAFA] p-6 min-h-[140px] flex flex-col justify-center">
        <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-8">
          {groups.map((group, groupIndex) => {
            const activeGroup = isAnimating && (group.kind === 'full' ? groupIndex < activeGroups : (props.remainderCount > 0 && remainderGlow) || targetGlow || matchedGlow)
            const isRemainderGroup = group.kind === 'remainder'
            const groupClassName = activeGroup
              ? isRemainderGroup
                ? 'border-[#FF0080] bg-[rgba(255,0,128,0.04)] shadow-[0_10px_24px_rgba(255,0,128,0.08)]'
                : 'border-[#7928CA] bg-[rgba(121,40,202,0.04)] shadow-[0_10px_24px_rgba(121,40,202,0.08)]'
              : 'border-dashed border-neutral-300 bg-white'

            return (
              <div
                key={group.key}
                className={`flex gap-2 rounded-xl border p-2 transition-all duration-500 ${groupClassName}`}
              >
                {group.items.map((item, itemIndex) => {
                  const absoluteIndex = group.kind === 'full'
                    ? groupIndex * props.cycleLength + itemIndex
                    : fullGroups * props.cycleLength + itemIndex
                  const isTarget = absoluteIndex === props.targetN - 1
                  const isMatch = item === targetToken
                  const nodeClassName = isTarget
                    ? 'bg-gradient-to-br from-[#7928CA] to-[#FF0080] text-white border-transparent shadow-md'
                    : isMatch && matchedGlow
                      ? 'bg-[#0070F3] text-white border-transparent shadow-md'
                      : 'bg-white text-[var(--text-body)] border-neutral-200/80 shadow-xs'

                  return (
                    <div key={`${group.key}-${absoluteIndex}`} className="flex flex-col items-center justify-start gap-1">
                      <div
                        className={`flex h-10 w-10 select-none items-center justify-center rounded-lg border text-xl transition-all duration-300 ${nodeClassName} ${isTarget && targetGlow ? 'scale-110' : ''}`}
                        style={isTarget && targetGlow ? { animation: 'patternCycleJelly 0.6s ease-in-out' } : undefined}
                        data-char={item}
                      >
                        {item}
                      </div>
                      <span className="text-[10px] font-medium text-[var(--text-muted)]">{absoluteIndex + 1}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-start gap-3">
        <button
          type="button"
          onClick={resetDemo}
          disabled={isAnimating}
          className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 px-5 py-2.5 text-sm font-medium text-neutral-600 transition-all active:scale-95 hover:bg-neutral-200 disabled:pointer-events-none disabled:opacity-60"
        >
          重置
        </button>
        <button
          type="button"
          onClick={startAnimation}
          disabled={isAnimating}
          className="inline-flex items-center justify-center rounded-xl bg-[#0070F3] px-5 py-2.5 text-sm font-medium text-white transition-all active:scale-95 hover:bg-[#0063d7] disabled:pointer-events-none disabled:opacity-50"
        >
          {props.buttonText || '开始探究'}
        </button>
      </div>
    </div>
  )
}

export function ReverseComponent({ block }: MathComponentProps) {
  const props = readBlockProps(block)
  const steps = readStringArray(props.steps, splitMathObject(block.math_object))
  const op = toText(props.op, 'add')
  const currentValue = toNumber(props.currentValue, extractAllNumbers(block.math_object)[0] ?? 0)
  const stepValue = toNumber(props.stepValue, extractAllNumbers(block.math_object)[1] ?? 1)

  return (
    <MaterialLiteShell
      block={block}
      buttonLabel={getButtonText(block, '开始倒推')}
    >
      {(active) => (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { title: steps[0] || '起点', value: active ? '正在回推' : '盲盒' },
            { title: steps[1] || '算子', value: active ? `${op === 'add' ? '-' : op === 'sub' ? '+' : op === 'mul' ? '÷' : '×'} ${stepValue}` : `${op} ${stepValue}` },
            { title: steps[2] || '结果', value: currentValue },
          ].map((item, index) => (
            <div key={item.title} className={`rounded-[16px] border p-3 transition-all duration-300 ${active && index === 1 ? 'border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)]' : 'border-[#EAEAEA] bg-white'}`}>
              <div className="text-[11px] text-[#888888]">{item.title}</div>
              <div className="mt-2 text-lg font-semibold text-[#171717]">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </MaterialLiteShell>
  )
}

export function CompareComponent({ block }: MathComponentProps) {
  const props = readBlockProps(block)
  const numA = toNumber(props.numA, extractAllNumbers(block.math_object)[0] ?? 0)
  const numB = toNumber(props.numB, extractAllNumbers(block.math_object)[1] ?? 0)
  const operator = toText(props.operator, numA > numB ? '>' : numA < numB ? '<' : '=')
  const contextType = toText(props.contextType, 'pure_compare')

  return (
    <MaterialLiteShell
      block={block}
      buttonLabel={getButtonText(block, '开始比较')}
    >
      {(active) => (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="rounded-[16px] border border-[#EAEAEA] bg-white p-3 text-center">
              <div className="text-[11px] text-[#888888]">A</div>
              <div className="mt-2 text-2xl font-semibold text-[#171717]">{numA}</div>
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${active ? 'bg-gradient-to-r from-[#7928CA] to-[#FF0080] text-white' : 'bg-[#FAFAFA] text-[#4D4D4D]'}`}>
              {contextType === 'threshold_check' ? '限界' : operator}
            </div>
            <div className="rounded-[16px] border border-[#EAEAEA] bg-white p-3 text-center">
              <div className="text-[11px] text-[#888888]">B</div>
              <div className="mt-2 text-2xl font-semibold text-[#171717]">{numB}</div>
            </div>
          </div>

          <div className={`rounded-[16px] border p-3 transition-all duration-300 ${active ? 'border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)]' : 'border-[#EAEAEA] bg-white'}`}>
            <div className="text-[11px] text-[#888888]">比较结论</div>
            <div className="mt-2 text-sm text-[#171717]">
              {active ? `当前关系是 ${numA} ${operator} ${numB}` : '点击按钮后只高亮最终关系，不做计算展示。'}
            </div>
          </div>
        </div>
      )}
    </MaterialLiteShell>
  )
}

export function EstimateComponent({ block }: MathComponentProps) {
  const props = readBlockProps(block)
  const rawValue = toNumber(props.rawValue, extractAllNumbers(block.math_object)[0] ?? 0)
  const roundTo = toNumber(props.roundTo, Math.round(rawValue / 10) * 10)
  const snapped = Math.round(rawValue / 10) * 10

  return (
    <MaterialLiteShell
      block={block}
      buttonLabel={getButtonText(block, '开始吸附')}
    >
      {(active) => (
        <div className="space-y-3">
          <div className="rounded-[16px] border border-[#EAEAEA] bg-white p-3">
            <div className="flex items-center justify-between text-[11px] text-[#888888]">
              <span>{Math.max(0, roundTo - 10)}</span>
              <span>{roundTo}</span>
              <span>{roundTo + 10}</span>
            </div>
            <div className="relative mt-4 h-16">
              <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#EAEAEA]" />
              <div
                className={`absolute top-1/2 -translate-y-1/2 rounded-[18px] border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                  active ? 'border-[#7928CA]/20 bg-gradient-to-r from-[#7928CA] to-[#FF0080] text-white translate-x-0' : 'border-[#EAEAEA] bg-[rgba(255,255,255,0.9)] text-[#171717]'
                }`}
                style={{ left: '50%', transform: active ? 'translate(-50%, -50%) scale(1.03)' : 'translate(-50%, -50%)' }}
              >
                {rawValue}
              </div>
            </div>
          </div>

          <div className={`rounded-[16px] border p-3 transition-all duration-300 ${active ? 'border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)]' : 'border-[#EAEAEA] bg-white'}`}>
            <div className="text-[11px] text-[#888888]">估算结果</div>
            <div className="mt-2 text-lg font-semibold text-[#171717]">{active ? snapped : '待吸附'}</div>
          </div>
        </div>
      )}
    </MaterialLiteShell>
  )
}

export function NumberSenseComponent({ block }: MathComponentProps) {
  const props = readBlockProps(block)
  const numA = toNumber(props.numA, extractAllNumbers(block.math_object)[0] ?? 0)
  const numB = toNumber(props.numB, extractAllNumbers(block.math_object)[1] ?? 0)
  const op = toText(props.op, 'multiply')
  const digits = String(Math.max(1, op === 'divide' ? Math.max(1, Math.floor(numA / Math.max(1, numB))) : numA * numB)).split('')

  return (
    <MaterialLiteShell
      block={block}
      buttonLabel={getButtonText(block, '开始扫描')}
    >
      {(active) => (
        <div className="space-y-3">
          <div className="rounded-[16px] border border-[#EAEAEA] bg-white p-3 text-center text-2xl font-semibold text-[#171717]">
            {numA} {op === 'divide' ? '÷' : '×'} {numB}
          </div>
          <div className="grid gap-2 sm:grid-cols-6">
            {Array.from({ length: Math.max(6, digits.length) }).map((_, index) => (
              <div key={index} className={`rounded-[16px] border p-3 text-center transition-all duration-300 ${active && index < digits.length ? 'border-[#7928CA]/20 bg-gradient-to-b from-[#7928CA] to-[#FF0080] text-white' : 'border-[#EAEAEA] bg-white text-[#4D4D4D]'}`}>
                <div className="text-[11px] opacity-70">{['个位', '十位', '百位', '千位', '万位', '十万位'][index] || `位 ${index + 1}`}</div>
                <div className="mt-1 text-lg font-semibold">{active && index < digits.length ? digits[index] : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </MaterialLiteShell>
  )
}

export function AgeComponent({ block }: MathComponentProps) {
  const props = readBlockProps(block)
  const ageA = toNumber(props.ageA, extractAllNumbers(block.math_object)[0] ?? 0)
  const ageB = toNumber(props.ageB, extractAllNumbers(block.math_object)[1] ?? 0)
  const ageDiff = Math.abs(toNumber(props.ageDiff, ageA - ageB))
  const years = toNumber(props.years, 0)
  const targetMultiple = toNumber(props.targetMultiple, 2)
  const type = toText(props.type, 'diff_constant')

  return (
    <MaterialLiteShell
      block={block}
      buttonLabel={getButtonText(block, '开始推演')}
    >
      {(active) => (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { label: '甲', value: ageA },
              { label: '乙', value: ageB },
            ].map((item, index) => (
              <div key={item.label} className="rounded-[16px] border border-[#EAEAEA] bg-white p-3">
                <div className="text-[11px] text-[#888888]">{item.label}年龄</div>
                <div className="mt-3 h-3 rounded-full bg-[#EAEAEA]">
                  <div className={`h-full rounded-full transition-all duration-300 ${active ? 'bg-gradient-to-r from-[#7928CA] to-[#FF0080]' : 'bg-[#0070F3]'}`} style={{ width: `${Math.min(100, Math.max(30, item.value * 4))}%` }} />
                </div>
                <div className="mt-2 text-lg font-semibold text-[#171717]">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className={`rounded-[16px] border p-3 transition-all duration-300 ${active ? 'border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)]' : 'border-[#EAEAEA] bg-white'}`}>
              <div className="text-[11px] text-[#888888]">年龄差</div>
              <div className="mt-2 text-lg font-semibold text-[#171717]">{ageDiff}</div>
            </div>
            <div className={`rounded-[16px] border p-3 transition-all duration-300 ${active ? 'border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)]' : 'border-[#EAEAEA] bg-white'}`}>
              <div className="text-[11px] text-[#888888]">目标倍数</div>
              <div className="mt-2 text-lg font-semibold text-[#171717]">{targetMultiple} 倍</div>
            </div>
            <div className={`rounded-[16px] border p-3 transition-all duration-300 ${active ? 'border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)]' : 'border-[#EAEAEA] bg-white'}`}>
              <div className="text-[11px] text-[#888888]">时间推进</div>
              <div className="mt-2 text-lg font-semibold text-[#171717]">{years > 0 ? `${years} 年后` : years < 0 ? `${Math.abs(years)} 年前` : '当前'}</div>
            </div>
          </div>

          <div className={`rounded-[16px] border p-3 transition-all duration-300 ${active ? 'border-[#7928CA]/20 bg-[rgba(121,40,202,0.06)]' : 'border-[#EAEAEA] bg-white'}`}>
            <div className="text-[11px] text-[#888888]">推演模式</div>
            <div className="mt-2 text-sm text-[#171717]">
              {type === 'diff_constant' ? '年龄差恒定不变' : '寻找倍数契合点'}
            </div>
          </div>
        </div>
      )}
    </MaterialLiteShell>
  )
}

export function GenericLogicComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="先理解关系">
      {(active, visual) => (
        <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-link)] bg-[rgba(0,112,243,0.06)]' : 'border-[var(--color-hairline)] bg-white'}`}>
          <div className="text-[11px] text-[var(--color-mute)]">通用逻辑</div>
          <div className="mt-2 text-sm text-[var(--color-ink)]">
            {active ? '先理解这个关系，再完成下面的问题。' : '等待更具体的逻辑块来接管。'}
          </div>
          <div className="mt-3 text-3xl">{visual.emoji}</div>
        </div>
      )}
    </MathComponentShell>
  )
}

const componentMap: Record<string, (props: MathComponentProps) => ReactElement> = {
  TotalAmountComponent,
  PartitionComponent,
  SumComponent,
  AverageComponent,
  FractionComponent,
  PatternCycleComponent,
  ReverseComponent,
  CompareComponent,
  EstimateComponent,
  NumberSenseComponent,
  AgeComponent,
  DifferenceComponent,
  RemainderComponent,
  MultipleComponent,
  UnitConvertComponent,
  PointSegmentComponent,
  PriceQuantityComponent,
  DistanceSpeedTimeComponent,
  GeometryAreaComponent,
  TimeComponent,
  RoundingComponent,
  GenericLogicComponent,
}

export function MathComponentRenderer({ block }: MathComponentProps) {
  const Component = componentMap[block.component] || GenericLogicComponent
  return <Component block={block} />
}

export const MATH_COMPONENT_NAMES = Object.keys(componentMap)
