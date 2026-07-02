import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface PartitionBarData {
  type?: 'total' | string
  label: string
  value: number | string | null
  unit: string
  color?: string
}

export interface PartitionScript {
  bars: PartitionBarData[]
  parts: number | string
  formula: string
  component: 'Partition'
  step_info: {
    unit: string
    current: number | string
    answer_name: string
    answer_value: number | string | null
  }
  interaction: 'slice_divide' | string
}

interface PartitionProps {
  componentAnalysisJson?: PartitionScript[]
  onStepComplete?: () => void
}

interface PartitionStageProps {
  formula: string
  totalBar: PartitionBarData
  divisor: number
  quotient: number
  answerName: string
  onStepComplete?: () => void
}

const defaultPartitionScripts: PartitionScript[] = [
  {
    bars: [
      { type: 'total', unit: '', color: '#F59E0B', label: '被除数', value: 50 },
    ],
    parts: 25,
    formula: '被除数 ÷ 除数 = 商',
    component: 'Partition',
    step_info: {
      unit: '',
      current: 1,
      answer_name: '商',
      answer_value: 2,
    },
    interaction: 'slice_divide',
  },
]

function toNumber(value: number | string | null, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function PartitionStage({
  formula,
  totalBar,
  divisor,
  quotient,
  answerName,
  onStepComplete,
}: PartitionStageProps) {
  const [isSnapped, setIsSnapped] = useState(false)
  const [showLaser, setShowLaser] = useState(false)
  const [showBlocks, setShowBlocks] = useState(false)
  const [showBracket, setShowBracket] = useState(false)
  const [displayValue, setDisplayValue] = useState('?')
  const [dragY, setDragY] = useState(150)

  const isDragging = useRef(false)
  const startY = useRef(0)
  const origTop = useRef(150)
  const timeoutsRef = useRef<number[]>([])

  const canvasMaxWidth = 432
  const safeDivisor = Math.max(1, Math.min(Math.floor(divisor), 100))
  const gap = safeDivisor <= 12 ? 6 : 2
  const gapTotalWidth = (safeDivisor - 1) * gap
  const subBlockWidth = (canvasMaxWidth - gapTotalWidth) / safeDivisor
  const cutters = Array.from(
    { length: safeDivisor - 1 },
    (_, index) => ((index + 1) / safeDivisor) * 100,
  )

  const runSlotMachine = useCallback((target: number) => {
    const duration = 500
    const startTime = performance.now()

    const update = (now: number) => {
      if (now - startTime < duration) {
        setDisplayValue(Math.floor(Math.random() * Math.max(toNumber(totalBar.value), 1)).toString())
        requestAnimationFrame(update)
        return
      }
      setDisplayValue(target.toString())
      onStepComplete?.()
    }
    requestAnimationFrame(update)
  }, [onStepComplete, totalBar.value])

  const triggerCutSequence = useCallback(() => {
    setIsSnapped(true)
    setShowLaser(true)

    const splitTimer = window.setTimeout(() => {
      setShowBlocks(true)
      const laserTimer = window.setTimeout(() => setShowLaser(false), 300)
      const resultTimer = window.setTimeout(() => {
        setShowBracket(true)
        runSlotMachine(quotient)
      }, 200)
      timeoutsRef.current.push(laserTimer, resultTimer)
    }, 250)
    timeoutsRef.current.push(splitTimer)
  }, [quotient, runSlotMachine])

  useEffect(() => {
    const handleMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
      const newY = origTop.current + clientY - startY.current

      if (newY <= 60) {
        isDragging.current = false
        triggerCutSequence()
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
  }, [triggerCutSequence])

  useEffect(() => () => {
    timeoutsRef.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const handleStart = (event: React.MouseEvent | React.TouchEvent) => {
    if (isSnapped) return
    isDragging.current = true
    startY.current = 'touches' in event ? event.touches[0].clientY : event.clientY
    origTop.current = dragY
  }

  const handleReset = () => {
    timeoutsRef.current.forEach((timer) => window.clearTimeout(timer))
    timeoutsRef.current = []
    isDragging.current = false
    setIsSnapped(false)
    setShowLaser(false)
    setShowBlocks(false)
    setShowBracket(false)
    setDisplayValue('?')
    setDragY(150)
  }

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center">
      <div className="relative flex h-[350px] w-full select-none flex-col items-center overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 pb-3 shadow-sm box-border">
        <div className={`rounded-full px-6 py-2 text-lg font-bold tracking-wide transition-all duration-300 ${
          showBlocks ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
        }`}>
          {showBlocks ? `${totalBar.value} ÷ ${safeDivisor} = ${quotient}` : formula}
        </div>

        <div className="relative mt-2 flex h-[260px] w-full flex-col items-center">
          <div className="relative flex h-[72px] w-[444px] items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-1 box-border">
            <div
              style={{ backgroundColor: totalBar.color || '#F59E0B' }}
              className={`absolute left-1 flex h-[60px] w-[432px] items-center justify-center rounded-xl text-sm font-bold text-white transition-opacity duration-300 ${
                showBlocks ? 'pointer-events-none opacity-0' : 'opacity-100'
              }`}
            >
              {totalBar.label}: {totalBar.value} {totalBar.unit}
            </div>

            <div
              style={{ gap: `${gap}px` }}
              className={`absolute left-1 flex h-[60px] w-[432px] transition-opacity duration-300 ${
                showBlocks ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              {Array.from({ length: safeDivisor }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: `${subBlockWidth}px`,
                    backgroundColor: totalBar.color || '#F59E0B',
                  }}
                  className="flex h-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-md text-xs font-bold text-white"
                >
                  {subBlockWidth >= 36 && <span className="opacity-90">每份</span>}
                  <span className={subBlockWidth >= 36 ? 'mt-0.5 font-extrabold' : 'text-[9px] font-extrabold'}>
                    {displayValue}
                  </span>
                </div>
              ))}
            </div>

            {cutters.map((leftOffset, index) => (
              <div
                key={index}
                style={{
                  left: `calc(${leftOffset}% - 1.5px)`,
                  transform: showLaser ? 'scaleY(1)' : 'scaleY(0)',
                  opacity: showLaser ? 1 : 0,
                }}
                className="absolute -top-3 z-10 h-[92px] w-[3px] bg-cyan-400 shadow-[0_0_12px_#22d3ee] transition-all duration-300"
              />
            ))}
          </div>

          {!isSnapped && (
            <div
              onMouseDown={handleStart}
              onTouchStart={handleStart}
              style={{ top: `${dragY}px` }}
              className="group absolute left-1/2 flex h-[48px] w-[248px] -translate-x-1/2 touch-none select-none items-center justify-center rounded-full border-2 border-blue-500 bg-gradient-to-b from-blue-50 to-blue-100 text-sm font-bold text-blue-700 shadow-md cursor-grab active:cursor-grabbing z-20"
            >
              <div className="pointer-events-none absolute inset-0 animate-[ping_2s_infinite] rounded-full border-2 border-blue-400 opacity-40" />
              <span className="mr-2 inline-block animate-bounce font-sans text-blue-500">▲</span>
              拖动切刀均分 {safeDivisor} 份
            </div>
          )}

          <div className={`absolute top-[84px] flex w-[432px] flex-col items-center transition-all duration-500 ${
            showBracket ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
          }`}>
            <svg className="h-5 w-full fill-none stroke-emerald-500 stroke-[1.5]" viewBox="0 0 432 24" preserveAspectRatio="none">
              <path d="M 0,0 C 0,15 20,20 216,20 C 412,20 432,15 432,0 M 216,20 L 216,24" />
            </svg>
            <div className="mt-1 text-base font-extrabold text-emerald-600">
              {answerName}: {quotient} {totalBar.unit}
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

export function Partition({
  componentAnalysisJson = defaultPartitionScripts,
  onStepComplete,
}: PartitionProps) {
  const script = componentAnalysisJson.find((item) => item.component === 'Partition')
    || defaultPartitionScripts[0]
  const totalBar = script.bars.find((bar) => bar.type === 'total')
    || script.bars[0]
    || defaultPartitionScripts[0].bars[0]
  const divisor = Math.max(1, toNumber(script.parts, 1))
  const total = toNumber(totalBar.value)
  const quotient = toNumber(script.step_info.answer_value, total / divisor)

  return (
    <PartitionStage
      formula={script.formula}
      totalBar={totalBar}
      divisor={divisor}
      quotient={quotient}
      answerName={script.step_info.answer_name}
      onStepComplete={onStepComplete}
    />
  )
}

export default Partition
