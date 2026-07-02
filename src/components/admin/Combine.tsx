import React, { useEffect, useRef, useState } from 'react'

export interface CombineBarData {
  label: string
  value: number | string | null
  unit: string
  color?: string
}

export interface CombineScript {
  bars: CombineBarData[]
  formula: string
  component: 'Combine'
  step_info: {
    unit: string
    current: number | string
    answer_name: string
    answer_value: number | string | null
  }
  interaction: 'drag_merge' | string
}

interface CombineProps {
  componentAnalysisJson?: CombineScript[]
  onStepComplete?: () => void
}

interface CombineStageProps {
  formula: string
  leftBar: CombineBarData
  rightBar: CombineBarData
  targetAnswer: {
    answerName: string
    value: number | string | null
    unit: string
  }
  onStepComplete?: () => void
}

const defaultCombineScripts: CombineScript[] = [
  {
    bars: [
      { unit: '', color: '#7928CA', label: '第一个加数', value: 50 },
      { unit: '', color: '#FF0080', label: '第二个加数', value: 60 },
    ],
    formula: '50 + 60 = 和',
    component: 'Combine',
    step_info: {
      unit: '',
      current: 1,
      answer_name: '和',
      answer_value: 110,
    },
    interaction: 'drag_merge',
  },
]

function CombineStage({
  formula,
  leftBar,
  rightBar,
  targetAnswer,
  onStepComplete,
}: CombineStageProps) {
  const [leftSnapped, setLeftSnapped] = useState(false)
  const [rightSnapped, setRightSnapped] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showBracket, setShowBracket] = useState(false)
  const [displayValue, setDisplayValue] = useState('???')

  const slotRef = useRef<HTMLDivElement>(null)
  const leftBlockRef = useRef<HTMLDivElement>(null)
  const rightBlockRef = useRef<HTMLDivElement>(null)

  const initialPos = {
    left: { x: 50, y: 125 },
    right: { x: 320, y: 125 },
  }

  useEffect(() => {
    if (!leftSnapped || !rightSnapped || isCompleted) return

    const timer = window.setTimeout(() => {
      setIsCompleted(true)
      setShowBracket(true)
      const target = typeof targetAnswer.value === 'number' ? targetAnswer.value : 0
      const duration = 600
      const startTime = performance.now()

      const update = (now: number) => {
        const elapsed = now - startTime
        if (elapsed < duration) {
          setDisplayValue(Math.floor(Math.random() * (target + 50)).toString())
          requestAnimationFrame(update)
          return
        }
        setDisplayValue(`${targetAnswer.value ?? ''} ${targetAnswer.unit}`.trim())
        onStepComplete?.()
      }
      requestAnimationFrame(update)
    }, 550)

    return () => window.clearTimeout(timer)
  }, [isCompleted, leftSnapped, onStepComplete, rightSnapped, targetAnswer])

  const handleReset = () => {
    setLeftSnapped(false)
    setRightSnapped(false)
    setIsCompleted(false)
    setShowBracket(false)
    setDisplayValue('???')

    if (leftBlockRef.current) {
      leftBlockRef.current.style.left = `${initialPos.left.x}px`
      leftBlockRef.current.style.top = `${initialPos.left.y}px`
    }
    if (rightBlockRef.current) {
      rightBlockRef.current.style.left = `${initialPos.right.x}px`
      rightBlockRef.current.style.top = `${initialPos.right.y}px`
    }
  }

  const bindDrag = (id: 'left' | 'right') => {
    return (event: React.MouseEvent | React.TouchEvent) => {
      const element = id === 'left' ? leftBlockRef.current : rightBlockRef.current
      if (!element || element.classList.contains('pointer-events-none')) return

      let isDragging = true
      const isTouch = 'touches' in event
      const startX = isTouch ? event.touches[0].pageX : event.pageX
      const startY = isTouch ? event.touches[0].pageY : event.pageY
      const originalLeft = element.offsetLeft
      const originalTop = element.offsetTop
      element.style.zIndex = '100'

      const onMove = (moveEvent: Event) => {
        if (!isDragging) return
        const pointerEvent = moveEvent as MouseEvent | TouchEvent
        const currentX = 'touches' in pointerEvent ? pointerEvent.touches[0].pageX : pointerEvent.pageX
        const currentY = 'touches' in pointerEvent ? pointerEvent.touches[0].pageY : pointerEvent.pageY
        element.style.left = `${originalLeft + currentX - startX}px`
        element.style.top = `${originalTop + currentY - startY}px`
      }

      const onEnd = () => {
        if (!isDragging) return
        isDragging = false
        element.style.zIndex = '10'
        const rect = element.getBoundingClientRect()
        const slotRect = slotRef.current?.getBoundingClientRect()
        if (slotRect) {
          const targetX = id === 'left' ? slotRect.left : slotRect.left + 200
          const shouldSnap = Math.abs(rect.left - targetX) < 80
            && Math.abs(rect.top - slotRect.top) < 80
          if (shouldSnap) {
            if (id === 'left') setLeftSnapped(true)
            if (id === 'right') setRightSnapped(true)
          }
        }
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onEnd)
        window.removeEventListener('touchmove', onMove)
        window.removeEventListener('touchend', onEnd)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onEnd)
      window.addEventListener('touchmove', onMove, { passive: false })
      window.addEventListener('touchend', onEnd)
    }
  }

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center">
      <div className="relative flex h-[350px] w-full select-none flex-col items-center overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 pb-3 shadow-sm box-border">
        <div className={`rounded-full px-6 py-2 text-lg font-bold tracking-wide transition-all duration-300 ${
          isCompleted ? 'bg-pink-100 text-[#FF0080]' : 'bg-slate-100 text-slate-600'
        }`}>
          {isCompleted
            ? `${leftBar.value} + ${rightBar.value} = ${targetAnswer.value}`
            : formula}
        </div>

        <div className="relative mt-2 flex h-[260px] w-full flex-col items-center">
          <div ref={slotRef} className="relative flex h-[72px] w-[444px] items-center rounded-2xl border-2 border-dashed border-slate-400 bg-slate-50 box-border">
            <div
              className="absolute left-1 top-1 z-[1] h-[60px] w-[432px] rounded-xl bg-gradient-to-r from-[#7928CA] to-[#FF0080] transition-opacity duration-500"
              style={{ opacity: isCompleted ? 1 : 0 }}
            />
            <div
              className="absolute left-[200px] top-1 z-[5] h-[60px] w-1 bg-white shadow-[0_0_12px_#fff] transition-opacity duration-200"
              style={{ opacity: leftSnapped && rightSnapped && !showBracket ? 1 : 0 }}
            />
          </div>

          <div
            ref={leftBlockRef}
            onMouseDown={bindDrag('left')}
            onTouchStart={bindDrag('left')}
            style={{
              left: leftSnapped ? '4px' : `${initialPos.left.x}px`,
              top: leftSnapped ? '4px' : `${initialPos.left.y}px`,
              width: '196px',
              backgroundColor: leftBar.color || '#7928CA',
              opacity: isCompleted ? 0 : 1,
            }}
            className={`absolute flex h-[60px] items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm transition-all duration-100 ${
              leftSnapped ? 'pointer-events-none shadow-none' : 'cursor-grab active:scale-95 active:cursor-grabbing'
            }`}
          >
            {leftBar.label}: {leftBar.value}
          </div>

          <div
            ref={rightBlockRef}
            onMouseDown={bindDrag('right')}
            onTouchStart={bindDrag('right')}
            style={{
              left: rightSnapped ? '204px' : `${initialPos.right.x}px`,
              top: rightSnapped ? '4px' : `${initialPos.right.y}px`,
              width: '236px',
              backgroundColor: rightBar.color || '#FF0080',
              opacity: isCompleted ? 0 : 1,
            }}
            className={`absolute flex h-[60px] items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm transition-all duration-100 ${
              rightSnapped ? 'pointer-events-none shadow-none' : 'cursor-grab active:scale-95 active:cursor-grabbing'
            }`}
          >
            {rightBar.label}: {rightBar.value}
          </div>

          <div className={`absolute top-[84px] flex w-[440px] flex-col items-center transition-all duration-500 ${
            showBracket ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
          }`}>
            <svg className="h-5 w-full fill-none stroke-amber-500 stroke-[1.5]" viewBox="0 0 440 24">
              <path d="M 0,0 C 0,15 20,20 220,20 C 420,20 440,15 440,0 M 220,20 L 220,24" />
            </svg>
            <div className="mt-2 text-xl font-extrabold text-amber-500">
              {targetAnswer.answerName || '和'}: {displayValue}
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

export function Combine({
  componentAnalysisJson = defaultCombineScripts,
  onStepComplete,
}: CombineProps) {
  const script = componentAnalysisJson.find((item) => item.component === 'Combine')
    || defaultCombineScripts[0]
  const leftBar = script.bars[0] || defaultCombineScripts[0].bars[0]
  const rightBar = script.bars[1] || defaultCombineScripts[0].bars[1]

  return (
    <CombineStage
      formula={script.formula}
      leftBar={leftBar}
      rightBar={rightBar}
      targetAnswer={{
        answerName: script.step_info.answer_name,
        value: script.step_info.answer_value,
        unit: script.step_info.unit,
      }}
      onStepComplete={onStepComplete}
    />
  )
}

export default Combine
