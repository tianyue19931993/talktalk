import { useEffect, useMemo, useRef, useState } from 'react'

export type TrackDirection = 'left_to_right' | 'right_to_left' | 'none'
export type TrackBracePosition = 'top' | 'bottom'
export type TrackStepAction = 'show_line' | 'show_braces' | 'show_segment' | 'show_formula' | 'show_answer'

export interface MathObject {
  id: string
  name: string
  type: string
  icon: string
  role: string
}

export interface TrackBrace {
  position: TrackBracePosition
  text: string
}

export interface TrackSegment {
  id: string
  label: string
  value: number | null
  unknown: boolean
  display: string
  result: string
  formula: string
  object_id?: string
}

export interface TrackLine {
  id: string
  order: number
  label: string
  object_id?: string
  from_label: string
  to_label: string
  direction: TrackDirection
  value: number | null
  same_as: string | null
  unknown: boolean
  segments: TrackSegment[]
  braces: TrackBrace[]
}

export interface TrackStep {
  order: number
  action: TrackStepAction
  target: string
  text: string
  animation_hint?: string
}

export interface MultiAxisTrackStateEngineJson {
  title: string
  question: string
  math_objects: MathObject[]
  lines: TrackLine[]
  steps: TrackStep[]
  answer: string
}

type RevealState = {
  lines: Record<string, boolean>
  braces: Record<string, boolean>
  segments: Record<string, boolean>
  formulas: Record<string, boolean>
  messages: Record<string, string>
  answer: boolean
}

const iconMap: Record<string, string> = {
  vehicle: '🚗',
  distance: '📏',
  speed: '⚡',
  subject: '👤',
  whole: '⬛',
  part: '◼️',
  unknown: '❓',
}

const defaultMultiAxisTrackStateEngineJson: MultiAxisTrackStateEngineJson = {
  title: '行程问题',
  question: '甲乙两地相距640千米，一辆汽车从甲地开往乙地，开了5小时正好行了全程的一半，这辆车的速度是多少？',
  math_objects: [
    { id: 'car', name: '汽车', type: 'vehicle', icon: '🚗', role: 'subject' },
    { id: 'distance_whole', name: '全程', type: 'distance', icon: '📏', role: 'whole' },
    { id: 'distance_traveled', name: '已行路程', type: 'distance', icon: '📏', role: 'part' },
    { id: 'distance_remain', name: '剩余路程', type: 'distance', icon: '📏', role: 'part' },
    { id: 'speed', name: '速度', type: 'speed', icon: '⚡', role: 'unknown' },
  ],
  lines: [
    {
      id: 'line1',
      order: 1,
      label: '全程',
      object_id: 'distance_whole',
      from_label: '甲地',
      to_label: '乙地',
      direction: 'left_to_right',
      value: 640,
      same_as: null,
      unknown: false,
      segments: [
        {
          id: 'seg1',
          label: '已行',
          value: 320,
          unknown: false,
          display: '？千米',
          result: '320千米',
          formula: '640÷2=320',
          object_id: 'distance_traveled',
        },
        {
          id: 'seg2',
          label: '剩余',
          value: 320,
          unknown: false,
          display: '？千米',
          result: '320千米',
          formula: '640-320=320',
          object_id: 'distance_remain',
        },
      ],
      braces: [
        { position: 'bottom', text: '640千米' },
      ],
    },
  ],
  steps: [
    {
      order: 1,
      action: 'show_line',
      target: 'line1',
      text: '表示甲乙两地全程640千米',
      animation_hint: 'fade_in',
    },
    {
      order: 2,
      action: 'show_braces',
      target: 'line1',
      text: '全程640千米',
      animation_hint: 'fade_in',
    },
    {
      order: 3,
      action: 'show_segment',
      target: 'seg1',
      text: '已行路程是全程的一半',
      animation_hint: 'split_from_left',
    },
    {
      order: 4,
      action: 'show_segment',
      target: 'seg2',
      text: '剩余路程也是全程的一半',
      animation_hint: 'split_from_right',
    },
    {
      order: 5,
      action: 'show_formula',
      target: 'seg1',
      text: '已行路程 = 640÷2 = 320千米',
      animation_hint: 'formula_pop',
    },
    {
      order: 6,
      action: 'show_formula',
      target: 'seg2',
      text: '剩余路程 = 640-320 = 320千米',
      animation_hint: 'formula_pop',
    },
    {
      order: 7,
      action: 'show_formula',
      target: 'line1',
      text: '速度 = 路程÷时间 = 320÷5 = 64千米/时',
      animation_hint: 'formula_pop',
    },
    {
      order: 8,
      action: 'show_answer',
      target: 'line1',
      text: '这辆汽车的速度是64千米/时',
      animation_hint: 'highlight_answer',
    },
  ],
  answer: '64千米/时',
}

function toNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function resolveLineValue(line: TrackLine, lines: TrackLine[], seen = new Set<string>()): number | null {
  const directValue = toNumber(line.value)
  if (directValue !== null) return directValue
  if (!line.same_as || seen.has(line.id)) return null

  const nextSeen = new Set(seen)
  nextSeen.add(line.id)
  const targetLine = lines.find((item) => item.id === line.same_as)
  if (!targetLine) return null
  return resolveLineValue(targetLine, lines, nextSeen)
}

function resolveLineFallbackValue(line: TrackLine, lines: TrackLine[]): number | null {
  const resolved = resolveLineValue(line, lines)
  if (resolved !== null) return resolved

  const segmentValues = line.segments.map((segment) => toNumber(segment.value))
  if (segmentValues.every((value) => value !== null)) {
    return segmentValues.reduce((sum, value) => sum + (value ?? 0), 0)
  }

  return null
}

function getVehicleTargetRatio(line: TrackLine, lines: TrackLine[], reveal: RevealState, stepOrder: number) {
  if (!line.segments.length) return 0

  const lineValue = resolveLineFallbackValue(line, lines) ?? toNumber(line.value) ?? 0
  if (lineValue <= 0) return 0

  const activeValues = line.segments
    .filter((segment) => reveal.segments[segment.id] || reveal.formulas[segment.id])
    .map((segment) => toNumber(segment.value) ?? 0)

  if (reveal.answer || reveal.formulas[line.id]) {
    return 1
  }

  if (activeValues.length > 0) {
    const sum = activeValues.reduce((total, value) => total + value, 0)
    return Math.max(0, Math.min(1, sum / lineValue))
  }

  if (stepOrder <= 1) return 0
  return 0
}

function buildEmptyReveal(): RevealState {
  return {
    lines: {},
    braces: {},
    segments: {},
    formulas: {},
    messages: {},
    answer: false,
  }
}

function buildRevealBySteps(steps: TrackStep[], stepCount: number): RevealState {
  const reveal = buildEmptyReveal()

  steps.slice(0, stepCount).forEach((step) => {
    if (step.action === 'show_line') {
      reveal.lines[step.target] = true
    }
    if (step.action === 'show_braces') {
      reveal.braces[step.target] = true
    }
    if (step.action === 'show_segment') {
      reveal.segments[step.target] = true
    }
    if (step.action === 'show_formula') {
      reveal.formulas[step.target] = true
      reveal.messages[step.target] = step.text
      reveal.segments[step.target] = true
    }
    if (step.action === 'show_answer') {
      reveal.answer = true
      reveal.messages[step.target] = step.text
      reveal.lines[step.target] = true
    }
  })

  return reveal
}

function getObjectIcon(mathObjects: MathObject[], objectId?: string) {
  if (!objectId) return ''
  const found = mathObjects.find((item) => item.id === objectId)
  return found ? (found.icon || iconMap[found.type] || '') : ''
}

function BraceCallout({ position, text }: { position: TrackBracePosition; text: string }) {
  return (
    <div className={`flex w-full flex-col items-center ${position === 'top' ? 'mb-1' : 'mt-2'}`}>
      {position === 'top' ? (
        <div className="mb-1 rounded-md border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-500 shadow-sm">
          {text}
        </div>
      ) : null}
      <svg
        className="h-5 w-full fill-none stroke-blue-300"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
      >
        {position === 'top' ? (
          <path d="M 2 16 V 10 C 2 6 4 4 7 4 H 93 C 96 4 98 6 98 10 V 16" strokeWidth="1.5" />
        ) : (
          <path d="M 2 4 V 10 C 2 14 4 16 7 16 H 93 C 96 16 98 14 98 10 V 4" strokeWidth="1.5" />
        )}
      </svg>
      {position === 'bottom' ? <div className="mt-1 text-xs font-semibold text-slate-500">{text}</div> : null}
    </div>
  )
}

function SegmentPiece({
  segment,
  totalValue,
  visible,
  showFinalText,
  accent,
}: {
  segment: TrackSegment
  totalValue: number
  visible: boolean
  showFinalText: boolean
  accent: string
}) {
  const width = segment.value === null || totalValue <= 0 ? 0 : (segment.value / totalValue) * 100
  const isUnknown = segment.unknown || segment.value === null
  const text = showFinalText
    ? (segment.result || (isUnknown ? '?' : String(segment.value ?? '')))
    : (segment.display || (isUnknown ? '?' : '？'))

  return (
    <div
      className="relative flex h-full items-center justify-center"
      style={{
        width: `${Math.max(width, 8)}%`,
        minWidth: 40,
      }}
    >
      <div
        className={`absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full transition-opacity ${
          visible ? 'opacity-100' : 'opacity-25'
        }`}
        style={{ backgroundColor: accent }}
      />
      <div className="absolute left-1/2 top-[8px] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[#ff6a00]">
        {text}
      </div>
    </div>
  )
}

function TrackLineRow({
  line,
  lines,
  mathObjects,
  reveal,
  vehicleLeftRatio,
}: {
  line: TrackLine
  lines: TrackLine[]
  mathObjects: MathObject[]
  reveal: RevealState
  vehicleLeftRatio: number
}) {
  const resolvedValue = resolveLineFallbackValue(line, lines)
  const isVisible = Boolean(reveal.lines[line.id])
  const reverse = line.direction === 'right_to_left'
  const segments = reverse ? [...line.segments].reverse() : line.segments
  const totalValue = resolvedValue ?? (segments.reduce((sum, segment) => sum + (toNumber(segment.value) ?? 0), 0) || 1)
  const accent = ['#111827', '#2563eb', '#7c3aed', '#f97316'][line.order % 4]
  const lineObjectIcon = getObjectIcon(mathObjects, line.object_id)
  const vehicleObject = mathObjects.find((item) => item.type === 'vehicle')
  const vehicleIcon = vehicleObject?.icon || iconMap.vehicle
  const firstSegment = segments[0]
  const showFirstBubble = Boolean(firstSegment)
  const showFinalText = segments.some((segment) => reveal.formulas[segment.id])
  const bubbleText = firstSegment
    ? (showFinalText ? firstSegment.result : firstSegment.display)
    : ''
  const splitOffset = firstSegment && totalValue > 0 && firstSegment.value !== null
    ? (firstSegment.value / totalValue) * 100
    : 0

  return (
    <div className="py-6">
      <div className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-slate-800">
        <span className="h-5 w-1.5 rounded-full bg-[#3B82F6]" />
        {lineObjectIcon ? <span>{lineObjectIcon}</span> : null}
        <span>{line.label}</span>
      </div>

      <div className={`transition-opacity ${isVisible ? 'opacity-100' : 'opacity-45'}`}>
        <div className="relative px-2 sm:px-4">
          <div className="relative h-[120px]">
            <div className="absolute left-0 right-0 top-[38px] h-[8px] rounded-full bg-slate-200/80" />
            <div className="absolute left-0 top-[18px] bottom-[14px] border-l border-dashed border-slate-300" />
            <div className="absolute right-0 top-[18px] bottom-[14px] border-l border-dashed border-slate-300" />
            {segments.length > 1 ? (
              <div
                className="absolute top-[18px] bottom-[14px] border-l border-dashed border-slate-300"
                style={{ left: `${splitOffset}%` }}
              />
            ) : null}

            {line.braces.some((brace) => brace.position === 'top') ? (
              <div className="absolute left-0 right-0 top-[-4px]">
                {line.braces
                  .filter((brace) => brace.position === 'top')
                  .map((brace, index) => (
                    <BraceCallout key={`${line.id}-top-${index}`} position={brace.position} text={brace.text} />
                  ))}
              </div>
            ) : null}

            {vehicleObject ? (
              <>
                <div
                  className="pointer-events-none absolute top-[4px] z-20 -translate-x-1/2 text-[26px]"
                  style={{
                    left: `${Math.max(0, Math.min(100, vehicleLeftRatio * 100))}%`,
                    filter: isVisible ? 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.18))' : 'none',
                    opacity: isVisible ? 1 : 0.25,
                    transform: `translateX(-50%) translateY(${isVisible ? '-2px' : '0px'}) scale(${isVisible ? 1 : 0.92})`,
                    transition: 'left 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease, transform 250ms ease',
                  }}
                >
                  <span style={{ display: 'inline-block', animation: 'track-bounce 1.25s ease-in-out infinite' }}>
                    {vehicleIcon}
                  </span>
                </div>

                {showFirstBubble ? (
                  <div
                    className="absolute top-[-2px] z-10 -translate-x-1/2 rounded-md border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-500 shadow-sm"
                    style={{ left: `${Math.max(0, Math.min(100, vehicleLeftRatio * 100))}%` }}
                  >
                    {bubbleText}
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="absolute left-0 right-0 top-[58px] flex h-[34px] items-center">
              {segments.map((segment) => (
                <SegmentPiece
                  key={segment.id}
                  segment={segment}
                  totalValue={totalValue}
                  visible={Boolean(reveal.segments[segment.id]) || isVisible}
                  showFinalText={Boolean(reveal.formulas[segment.id])}
                  accent={accent}
                />
              ))}
            </div>

            <div className="absolute left-0 right-0 top-[98px] flex items-center justify-between text-[13px] font-semibold text-slate-800">
              <span>{reverse ? line.to_label : line.from_label}</span>
              <span>{reverse ? line.from_label : line.to_label}</span>
            </div>
          </div>

          {line.braces.some((brace) => brace.position === 'bottom') ? (
            <div className="mt-1">
              {line.braces
                .filter((brace) => brace.position === 'bottom')
                .map((brace, index) => (
                  <BraceCallout key={`${line.id}-bottom-${index}`} position={brace.position} text={brace.text} />
                ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function MultiAxisTrackStateEngine({
  jsonData = defaultMultiAxisTrackStateEngineJson,
}: {
  jsonData?: MultiAxisTrackStateEngineJson
}) {
  const scene = jsonData ?? defaultMultiAxisTrackStateEngineJson
  const sortedLines = useMemo(
    () => [...scene.lines].sort((a, b) => a.order - b.order),
    [scene.lines],
  )
  const sortedSteps = useMemo(
    () => [...scene.steps].sort((a, b) => a.order - b.order),
    [scene.steps],
  )

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const reveal = useMemo(
    () => buildRevealBySteps(sortedSteps, currentStepIndex),
    [sortedSteps, currentStepIndex],
  )

  const [animatedVehicleRatios, setAnimatedVehicleRatios] = useState<Record<string, number>>({})
  const animationRef = useRef<number | null>(null)

  const currentStep = sortedSteps[currentStepIndex]
  const isCompleted = currentStepIndex >= sortedSteps.length
  const canGoBack = currentStepIndex > 0

  useEffect(() => {
    const nextTargets = Object.fromEntries(
      sortedLines.map((line) => [line.id, getVehicleTargetRatio(line, sortedLines, reveal, currentStep?.order ?? 0)]),
    ) as Record<string, number>

    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    const startTime = performance.now()
    const duration = 700
    const initialTargets = { ...animatedVehicleRatios }

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedVehicleRatios(() => {
        const nextState: Record<string, number> = {}
        sortedLines.forEach((line) => {
          const from = initialTargets[line.id] ?? 0
          const to = nextTargets[line.id] ?? 0
          nextState[line.id] = from + (to - from) * eased
        })
        return nextState
      })

      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(tick)
      }
    }

    animationRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, sortedLines])

  const handleNextStep = () => {
    if (!currentStep || isCompleted) return
    setCurrentStepIndex((prev) => prev + 1)
  }

  const handlePrevStep = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1))
  }

  return (
    <div className="flex w-full justify-center">
      <style>{`
        @keyframes track-bounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-3px) scale(1.04); }
        }
      `}</style>
      <div className="w-full max-w-[760px] rounded-[18px] border border-[#D9E2F0] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-1 h-5 w-1.5 rounded-full bg-[#3B82F6]" />
          <div className="text-[18px] font-semibold text-slate-800">{scene.title}</div>
        </div>

        <div className="rounded-[10px] bg-[#F4F7FB] px-4 py-4 text-[15px] leading-7 text-slate-600">
          {scene.question}
        </div>

        <div className="mt-4 divide-y divide-dashed divide-slate-200 border-t border-slate-100">
          {sortedLines.map((line) => (
            <TrackLineRow
              key={line.id}
              line={line}
              lines={sortedLines}
              mathObjects={scene.math_objects}
              reveal={reveal}
              vehicleLeftRatio={animatedVehicleRatios[line.id] ?? getVehicleTargetRatio(line, sortedLines, reveal, currentStep?.order ?? 0)}
            />
          ))}
        </div>

        <div className="mt-10 rounded-[6px] border border-slate-200 bg-[#FBFCFE] px-4 py-4">
          {reveal.answer ? (
            <div className="flex items-center gap-2 text-[16px] font-semibold text-slate-800">
              <span className="text-lg">🎉</span>
              <span>答题完成：</span>
              <span className="text-[#FF6A00]">{scene.answer}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-[15px]">
              <span className="font-semibold text-slate-800">
                步骤 {currentStep ? currentStep.order : 0}：
                {' '}
                {currentStep ? currentStep.text : '暂无步骤'}
              </span>
              {currentStep?.action === 'show_formula' ? (
                currentStep.text.includes('=')
                  ? (
                    <span className="font-semibold text-[#3777FF]">
                      {currentStep.text.split('=').slice(0, 1).join('=')}
                      {' = '}
                      {currentStep.text.split('=').slice(1).join('=').trim()}
                    </span>
                  )
                  : (
                    <span className="font-semibold text-[#3777FF]">{currentStep.text}</span>
                  )
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={!canGoBack}
            className="rounded-lg border border-[#D4DDF0] bg-white px-6 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一步
          </button>

          <button
            type="button"
            onClick={handleNextStep}
            disabled={isCompleted}
            className={`rounded-lg px-6 py-2 text-sm font-semibold text-white transition-colors ${
              isCompleted
                ? 'cursor-not-allowed bg-slate-400'
                : 'bg-[#3777FF] hover:bg-[#2F67E6]'
            }`}
          >
            下一步 ➔
          </button>
        </div>
      </div>
    </div>
  )
}

export default MultiAxisTrackStateEngine
export { defaultMultiAxisTrackStateEngineJson }
