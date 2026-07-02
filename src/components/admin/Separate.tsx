import { useState } from 'react'

export interface SeparateBarData {
  type?: 'total' | 'cut_part' | string
  label: string
  value: number | string | null
  unit: string
  color?: string
}

export interface SeparateScript {
  bars: SeparateBarData[]
  formula: string
  component: 'Separate'
  step_info: {
    unit: string
    current: number | string
    answer_name: string
    answer_value: number | string | null
  }
  interaction: 'scissors_cut' | string
}

interface SeparateProps {
  componentAnalysisJson?: SeparateScript[]
  onStepComplete?: () => void
}

interface SeparateStageProps {
  formula: string
  totalBar: SeparateBarData
  cutBar: SeparateBarData
  remainBar: SeparateBarData
  onStepComplete?: () => void
}

const defaultSeparateScripts: SeparateScript[] = [
  {
    bars: [
      { type: 'total', unit: '', color: '#7928CA', label: '被减数', value: 50 },
      { type: 'cut_part', unit: '', color: '#94A3B8', label: '减数', value: 20 },
    ],
    formula: '被减数 - 减数 = 差',
    component: 'Separate',
    step_info: {
      unit: '',
      current: 1,
      answer_name: '差',
      answer_value: 30,
    },
    interaction: 'scissors_cut',
  },
]

function toNumber(value: number | string | null, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function SeparateStage({
  formula,
  totalBar,
  cutBar,
  remainBar,
  onStepComplete,
}: SeparateStageProps) {
  const [isCut, setIsCut] = useState(false)
  const [showBracket, setShowBracket] = useState(false)
  const [displayValue, setDisplayValue] = useState('???')

  const canvasMaxWidth = 432
  const totalValue = Math.max(toNumber(totalBar.value), 1)
  const remainValue = Math.max(0, Math.min(toNumber(remainBar.value), totalValue))
  const remainWidth = (remainValue / totalValue) * canvasMaxWidth
  const cutWidth = canvasMaxWidth - remainWidth
  const cutLineLeft = 4 + remainWidth

  const runSlotMachine = (target: number) => {
    const duration = 500
    const startTime = performance.now()

    const update = (now: number) => {
      const elapsed = now - startTime
      if (elapsed < duration) {
        setDisplayValue(Math.floor(Math.random() * totalValue).toString())
        requestAnimationFrame(update)
        return
      }
      setDisplayValue(`${target} ${remainBar.unit}`.trim())
      onStepComplete?.()
    }
    requestAnimationFrame(update)
  }

  const handleCutClick = () => {
    if (isCut) return
    setIsCut(true)
    window.setTimeout(() => {
      setShowBracket(true)
      runSlotMachine(remainValue)
    }, 300)
  }

  const handleReset = () => {
    setIsCut(false)
    setShowBracket(false)
    setDisplayValue('???')
  }

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center">
      <div className="relative flex h-[350px] w-full select-none flex-col items-center overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 pb-3 shadow-sm box-border">
        <div className={`rounded-full px-6 py-2 text-lg font-bold tracking-wide transition-all duration-300 ${
          isCut ? 'bg-sky-100 text-[#0284c7]' : 'bg-slate-100 text-slate-600'
        }`}>
          {isCut ? `${totalBar.value} - ${cutBar.value} = ${remainBar.value}` : formula}
        </div>

        <div className="relative mt-2 flex h-[260px] w-full flex-col items-center">
          <div className="relative flex h-[72px] w-[444px] items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 box-border">
            <div
              style={{
                width: isCut ? `${remainWidth}px` : `${canvasMaxWidth}px`,
                borderRadius: isCut ? '12px 0 0 12px' : '12px',
                backgroundColor: totalBar.color || '#7928CA',
              }}
              className="absolute left-1 top-1 z-[2] flex h-[60px] select-none items-center justify-center text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
            >
              {isCut ? remainBar.label : `${totalBar.label}: ${totalBar.value}`}
            </div>

            <div
              style={{
                left: `${cutLineLeft}px`,
                width: `${cutWidth}px`,
                backgroundColor: cutBar.color || '#94A3B8',
              }}
              className={`absolute top-1 z-[3] flex h-[60px] select-none items-center justify-center rounded-r-xl text-xs font-bold text-white transition-all duration-700 ease-[cubic-bezier(0.36,0.07,0.19,0.97)] ${
                isCut ? 'translate-y-[35px] rotate-[3deg]' : 'pointer-events-none'
              }`}
            >
              {cutBar.label}: {cutBar.value}
            </div>

            {!isCut && (
              <button
                type="button"
                onClick={handleCutClick}
                style={{ left: `${cutLineLeft}px` }}
                aria-label="剪掉减数部分"
                className="group absolute -top-3.5 z-10 flex h-[92px] w-0.5 cursor-pointer justify-center border-0 border-l-2 border-dashed border-red-500 bg-transparent p-0"
              >
                <span className="absolute top-[76px] flex flex-col items-center whitespace-nowrap">
                  <span className="text-xl transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-125">
                    ✂️
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium text-slate-500">点击剪刀</span>
                </span>
              </button>
            )}
          </div>

          <div
            className={`absolute left-1/2 top-[84px] w-[444px] -translate-x-1/2 transition-all duration-500 ${
              showBracket ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
            }`}
          >
            <div style={{ marginLeft: '4px', width: `${remainWidth}px` }} className="flex flex-col items-center">
              <svg
                className="h-5 w-full fill-none stroke-sky-500 stroke-[1.5]"
                viewBox={`0 0 ${remainWidth} 24`}
                preserveAspectRatio="none"
              >
                <path d={`M 0,0 C 0,15 ${remainWidth * 0.05},20 ${remainWidth / 2},20 C ${remainWidth * 0.95},20 ${remainWidth},15 ${remainWidth},0 M ${remainWidth / 2},20 L ${remainWidth / 2},24`} />
              </svg>
              <div className="mt-1.5 whitespace-nowrap text-xl font-extrabold text-sky-600">
                {remainBar.label}: {displayValue}
              </div>
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

export function Separate({
  componentAnalysisJson = defaultSeparateScripts,
  onStepComplete,
}: SeparateProps) {
  const script = componentAnalysisJson.find((item) => item.component === 'Separate')
    || defaultSeparateScripts[0]
  const totalBar = script.bars.find((bar) => bar.type === 'total')
    || script.bars[0]
    || defaultSeparateScripts[0].bars[0]
  const cutBar = script.bars.find((bar) => bar.type === 'cut_part')
    || script.bars[1]
    || defaultSeparateScripts[0].bars[1]
  const totalValue = toNumber(totalBar.value)
  const cutValue = toNumber(cutBar.value)

  return (
    <SeparateStage
      formula={script.formula}
      totalBar={totalBar}
      cutBar={cutBar}
      remainBar={{
        label: script.step_info.answer_name,
        value: script.step_info.answer_value ?? totalValue - cutValue,
        unit: script.step_info.unit,
        color: totalBar.color,
      }}
      onStepComplete={onStepComplete}
    />
  )
}

export default Separate
