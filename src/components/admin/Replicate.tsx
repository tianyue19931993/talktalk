import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface ReplicateBarData {
  label: string
  value: number | string | null
  unit: string
  color?: string
}

export interface ReplicateScript {
  bars: ReplicateBarData[]
  formula: string
  component: 'Replicate'
  step_info: {
    unit: string
    current: number | string
    answer_name: string
    answer_value: number | string | null
  }
  multiplier: number | string
  interaction: 'pull_replicate' | string
}

interface ReplicateProps {
  componentAnalysisJson?: ReplicateScript[]
  onStepComplete?: () => void
}

interface ReplicateStageProps {
  formula: string
  sourceBar: ReplicateBarData
  multiplier: number
  totalValue: number
  answerName: string
  onStepComplete?: () => void
}

const defaultReplicateScripts: ReplicateScript[] = [
  {
    bars: [
      { unit: '', color: '#7928CA', label: '乘数', value: 50 },
    ],
    formula: '乘数 × 被乘数 = 积',
    component: 'Replicate',
    step_info: {
      unit: '',
      current: 1,
      answer_name: '积',
      answer_value: 1000,
    },
    multiplier: 20,
    interaction: 'pull_replicate',
  },
]

function toNumber(value: number | string | null, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function ReplicateStage({
  formula,
  sourceBar,
  multiplier,
  totalValue,
  answerName,
  onStepComplete,
}: ReplicateStageProps) {
  const [isSnapped, setIsSnapped] = useState(false)
  const [visibleCount, setVisibleCount] = useState(1)
  const [showBracket, setShowBracket] = useState(false)
  const [displayValue, setDisplayValue] = useState('???')
  const [dragY, setDragY] = useState(150)

  const isDragging = useRef(false)
  const startY = useRef(0)
  const origTop = useRef(150)
  const intervalRef = useRef<number | null>(null)
  const resultTimerRef = useRef<number | null>(null)

  const canvasMaxWidth = 432
  const safeMultiplier = Math.max(1, Math.min(Math.floor(multiplier), 100))
  const gap = safeMultiplier <= 12 ? 6 : 2
  const totalGapsWidth = (safeMultiplier - 1) * gap
  const subBlockWidth = (canvasMaxWidth - totalGapsWidth) / safeMultiplier

  const runSlotMachine = useCallback((target: number) => {
    const duration = 500
    const startTime = performance.now()

    const update = (now: number) => {
      if (now - startTime < duration) {
        setDisplayValue(Math.floor(Math.random() * Math.max(target * 1.5, 1)).toString())
        requestAnimationFrame(update)
        return
      }
      setDisplayValue(`${target} ${sourceBar.unit}`.trim())
      onStepComplete?.()
    }
    requestAnimationFrame(update)
  }, [onStepComplete, sourceBar.unit])

  const triggerMultiplySequence = useCallback(() => {
    setIsSnapped(true)

    if (safeMultiplier === 1) {
      setShowBracket(true)
      runSlotMachine(totalValue)
      return
    }

    let currentCloned = 1
    intervalRef.current = window.setInterval(() => {
      currentCloned += 1
      setVisibleCount(currentCloned)

      if (currentCloned >= safeMultiplier) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
        intervalRef.current = null
        resultTimerRef.current = window.setTimeout(() => {
          setShowBracket(true)
          runSlotMachine(totalValue)
        }, 200)
      }
    }, 120)
  }, [runSlotMachine, safeMultiplier, totalValue])

  useEffect(() => {
    const handleMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
      const newY = origTop.current + clientY - startY.current

      if (newY <= 60) {
        isDragging.current = false
        triggerMultiplySequence()
      } else {
        setDragY(Math.min(newY, 180))
      }
    }

    const handleEnd = () => {
      if (!isDragging.current) return
      isDragging.current = false
      setDragY(150)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [triggerMultiplySequence])

  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    if (resultTimerRef.current !== null) window.clearTimeout(resultTimerRef.current)
  }, [])

  const handleStart = (event: React.MouseEvent | React.TouchEvent) => {
    if (isSnapped) return
    isDragging.current = true
    startY.current = 'touches' in event ? event.touches[0].clientY : event.clientY
    origTop.current = dragY
  }

  const handleReset = () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    if (resultTimerRef.current !== null) window.clearTimeout(resultTimerRef.current)
    intervalRef.current = null
    resultTimerRef.current = null
    isDragging.current = false
    setIsSnapped(false)
    setVisibleCount(1)
    setShowBracket(false)
    setDisplayValue('???')
    setDragY(150)
  }

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center">
      <div className="relative flex h-[350px] w-full select-none flex-col items-center overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 pb-3 shadow-sm box-border">
        <div className={`rounded-full px-6 py-2 text-lg font-bold tracking-wide transition-all duration-300 ${
          showBracket ? 'bg-pink-50 text-[#FF0080]' : 'bg-slate-100 text-slate-600'
        }`}>
          {showBracket ? `${sourceBar.value} × ${safeMultiplier} = ${totalValue}` : formula}
        </div>

        <div className="relative mt-2 flex h-[260px] w-full flex-col items-center">
          <div className="relative flex h-[72px] w-[444px] items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-1 box-border">
            <div className="flex h-[60px] w-full" style={{ gap: `${gap}px` }}>
              {Array.from({ length: safeMultiplier }).map((_, index) => {
                const isVisible = index < visibleCount
                const isCloned = index > 0

                return (
                  <div
                    key={index}
                    style={{
                      width: `${subBlockWidth}px`,
                      transform: isVisible ? 'scale(1)' : 'scale(0.6)',
                      opacity: isVisible ? 1 : 0,
                      backgroundColor: isCloned ? undefined : sourceBar.color || '#7928CA',
                    }}
                    className={`flex h-full shrink-0 items-center justify-center overflow-hidden rounded-md text-white transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                      isCloned ? 'bg-gradient-to-br from-[#7928CA] to-[#9061F9]' : ''
                    } ${subBlockWidth >= 28 ? 'text-sm font-bold' : 'text-[9px] font-extrabold'}`}
                  >
                    {sourceBar.value}
                  </div>
                )
              })}
            </div>
          </div>

          {!isSnapped && (
            <div
              onMouseDown={handleStart}
              onTouchStart={handleStart}
              style={{ top: `${dragY}px` }}
              className="group absolute left-1/2 z-20 flex h-[48px] w-[248px] -translate-x-1/2 touch-none select-none items-center justify-center rounded-full border-2 border-[#FF0080] bg-gradient-to-b from-pink-50 to-rose-50 text-sm font-bold text-[#FF0080] shadow-sm cursor-grab active:cursor-grabbing"
            >
              <div className="pointer-events-none absolute inset-0 animate-[ping_2s_infinite] rounded-full border-2 border-pink-400 opacity-40" />
              <span className="mr-2 inline-block animate-bounce font-sans text-[#FF0080]">▲</span>
              拖动推入叠加 {safeMultiplier} 倍
            </div>
          )}

          <div className={`absolute top-[84px] flex w-[432px] flex-col items-center transition-all duration-500 ${
            showBracket ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
          }`}>
            <svg className="h-5 w-full fill-none stroke-[#FF0080] stroke-[1.5]" viewBox="0 0 432 24" preserveAspectRatio="none">
              <path d="M 0,0 C 0,15 20,20 216,20 C 412,20 432,15 432,0 M 216,20 L 216,24" />
            </svg>
            <div className="mt-1.5 whitespace-nowrap text-xl font-extrabold text-[#FF0080]">
              {answerName}: {displayValue}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex w-full items-center justify-between px-2 box-border">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700"
        >
          重置
        </button>
      </div>
    </div>
  )
}

export function Replicate({
  componentAnalysisJson = defaultReplicateScripts,
  onStepComplete,
}: ReplicateProps) {
  const script = componentAnalysisJson.find((item) => item.component === 'Replicate')
    || defaultReplicateScripts[0]
  const sourceBar = script.bars[0] || defaultReplicateScripts[0].bars[0]
  const multiplier = Math.max(1, toNumber(script.multiplier, 1))
  const eachValue = toNumber(sourceBar.value)
  const totalValue = toNumber(script.step_info.answer_value, eachValue * multiplier)

  return (
    <ReplicateStage
      formula={script.formula}
      sourceBar={sourceBar}
      multiplier={multiplier}
      totalValue={totalValue}
      answerName={script.step_info.answer_name}
      onStepComplete={onStepComplete}
    />
  )
}

export default Replicate
