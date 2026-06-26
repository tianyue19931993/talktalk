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

function sceneLabel(title: string, body: string) {
  return (
    <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-mute)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--color-ink)]">{body}</div>
    </div>
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
  const tone = getToneForComponent(block.component)
  const phrases = phraseChips(block.math_object)
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="合起来看看" buttonHint="点击后只做总量感的轻量变化">
      {(active, visual) => (
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-link)] bg-[rgba(0,112,243,0.06)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">每份数</div>
            <div className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{phrases[0] || block.math_object}</div>
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-gradient-start)] bg-[rgba(121,40,202,0.06)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">份数</div>
            <div className="mt-2 flex flex-wrap gap-2">{renderTokens(visual.tokens.slice(0, 3), active)}</div>
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-[var(--color-highlight-pink)] bg-[rgba(255,0,128,0.06)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">总量感</div>
            <div className="mt-2 flex items-center gap-2 text-3xl">{visual.emoji}<span className="text-sm text-[var(--color-body)]">合在一起</span></div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}

export function PartitionComponent({ block }: MathComponentProps) {
  const tone = getToneForComponent(block.component)
  const visual = buildVisualMeta(block.visual_object)
  const { total, stepValue, unit, stepLabel, buttonText } = useMemo(
    () => toPartitionProps(block.math_object),
    [block.math_object],
  )
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
    <MathComponentShell block={block} tone={tone} buttonLabel={buttonText} buttonHint="点击后切刀会逐段移动，最后留下尾巴">
      {() => (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1.35fr_0.65fr]">
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
            </div>

            <div className="space-y-3">
              <div className="rounded-[24px] border border-[#EAEAEA] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] text-[#888888]">切刀标签</div>
                <div className="mt-2 text-base font-semibold text-[#171717]">{stepLabel}</div>
                <div className="mt-3 flex items-center gap-3 text-3xl">{visual.emoji}<span className="text-sm text-[#4D4D4D]">按组往前推进</span></div>
              </div>

              <div className={`rounded-[24px] border border-[#EAEAEA] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 ${isFinished ? 'ring-2 ring-[rgba(0,112,243,0.14)]' : ''}`}>
                <div className="text-[11px] text-[#888888]">除法算式</div>
                <div className="mt-3 text-lg font-semibold text-[#171717]">
                  {total} ÷ {stepValue} = {quotient}
                  {remainder > 0 ? ` 余 ${remainder}` : ''}
                </div>
                <div className="mt-2 text-sm text-[#4D4D4D]">
                  {isFinished ? '切分完成，最后的余数已经被标出来。' : '动画结束后这里会点亮。'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-[#888888]">
              {isAnimating ? '播放中，请稍等...' : isFinished ? '已完成，按钮已禁用。' : '点击按钮开始分。'}
            </div>
            <button
              type="button"
              disabled={isAnimating || isFinished || quotient <= 0}
              onClick={startCutting}
              className="inline-flex items-center justify-center rounded-[14px] bg-[#0070F3] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isFinished ? '已完成' : isAnimating ? '播放中' : buttonText}
            </button>
          </div>
        </div>
      )}
    </MathComponentShell>
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
  const tone = getToneForComponent(block.component)
  const isCarry = block.type.includes('进一')
  const isDrop = block.type.includes('去尾')
  return (
    <MathComponentShell block={block} tone={tone} buttonLabel="看看剩下的怎么办" buttonHint="点击后只突出“补一组”或“舍掉尾巴”">
      {(active) => (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-[11px] text-[var(--color-mute)]">完整组 + 剩余组</div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-10 rounded-[14px] transition-all duration-300 ${
                    index < 6
                      ? 'bg-[var(--color-link)]/20'
                      : active
                        ? isCarry
                          ? 'bg-[var(--color-highlight-pink)]/25'
                          : 'bg-[var(--color-canvas-soft)]'
                        : 'bg-[var(--color-canvas-soft)]'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className={`rounded-[20px] border p-4 transition-all duration-300 ${active ? 'border-amber-300 bg-[rgba(245,158,11,0.08)]' : 'border-[var(--color-hairline)] bg-white'}`}>
            <div className="text-[11px] text-[var(--color-mute)]">处理提示</div>
            <div className="mt-2 text-sm text-[var(--color-ink)]">
              {isCarry ? '还需要再来一次，轻轻补上一组。' : isDrop ? '剩下的不够一整组，先把尾巴放一边。' : '先看看余数怎么处理。'}
            </div>
            <div className="mt-3 text-3xl">{active ? '✨' : '🧮'}</div>
          </div>
        </div>
      )}
    </MathComponentShell>
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
