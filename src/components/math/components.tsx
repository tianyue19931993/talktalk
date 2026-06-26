import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
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

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-[#888888]">
          {isAnimating ? '块正在下落...' : isFinished ? '已聚合完成。' : ''}
        </div>
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
      <div className="mt-2 text-xs text-[#888888]">
        当前分组标签：{stepLabel || '每次分组'}
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

        <div className="mt-3 flex items-center justify-between text-xs text-[#888888]">
          <span>第 1 次</span>
          <span>第 {Math.max(quotient, 1)} 次</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: quotient }).map((_, index) => (
          <span
            key={index}
            className={`rounded-full px-3 py-1 text-xs transition-all duration-300 ${
              currentCutCount > index || isFinished
                ? 'bg-[rgba(121,40,202,0.1)] text-[var(--color-ink)]'
                : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)]'
            }`}
          >
            第 {index + 1} 次
          </span>
        ))}
        {remainder > 0 && (
          <span className="rounded-full bg-[rgba(0,112,243,0.08)] px-3 py-1 text-xs text-[var(--color-link)]">
            剩 {remainder}{unit || '单元'}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-[#888888]">
          {isAnimating ? '播放中，请稍等...' : isFinished ? '已完成，按钮已禁用。' : ''}
        </div>
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
    <MathComponentShell block={block} tone={tone} buttonLabel="对齐比较" buttonHint="点击后只突出差出来的位置">
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
    <MathComponentShell block={block} tone={tone} buttonLabel="看看剩下的" buttonHint="点击后只展示剩余关系">
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
    <MathComponentShell block={block} tone={tone} buttonLabel="展示倍数" buttonHint="点击后只改变排列密度">
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
    <MathComponentShell block={block} tone={tone} buttonLabel="统一单位" buttonHint="点击后两边单位标签会变成同一种风格">
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
    <MathComponentShell block={block} tone={tone} buttonLabel="点亮点段" buttonHint="点击后只展示点和段的连接关系">
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
    <MathComponentShell block={block} tone={tone} buttonLabel="查看价格关系" buttonHint="点击后只展示价格、数量、总价的关系">
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
    <MathComponentShell block={block} tone={tone} buttonLabel="建立关系" buttonHint="点击后把路程、时间、速度连起来">
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
    <MathComponentShell block={block} tone={tone} buttonLabel="切换图形" buttonHint="点击后只改变图形轮廓的轻量状态">
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
    <MathComponentShell block={block} tone={tone} buttonLabel="让时间走一走" buttonHint="点击后只移动指针和时间线">
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
        <div className="mt-2 text-sm text-[#4D4D4D]">
          {isFinished ? '动画结束，结果已固定。' : '点击按钮后，系统会按策略完成取整。'}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-[#888888]">
          {isAnimating ? '处理中...' : isFinished ? '已完成，按钮已禁用。' : ''}
        </div>
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
  )
}

export function GenericLogicComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="先理解关系" buttonHint="点击后只出现一个通用提示">
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
