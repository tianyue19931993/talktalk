import { useState, useEffect, useRef } from 'react'

interface FractionData {
  type: 'fraction'
  question: string
  whole: number
  part: number
}

export default function FractionExperiment({ data }: { data: FractionData }) {
  const [showLabel, setShowLabel] = useState(true)
  const [highlightIndex, setHighlightIndex] = useState(data.part)
  const containerRef = useRef<HTMLDivElement>(null)

  const { whole, part } = data
  const clampedWhole = Math.max(1, Math.min(50, whole))
  const clampedPart = Math.max(0, Math.min(clampedWhole, part))

  useEffect(() => {
    setHighlightIndex(clampedPart)
  }, [clampedPart])

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto p-4">
      {/* Question */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-l2)] border border-[var(--color-hairline)]">
        <p className="text-sm text-[var(--color-body)] leading-relaxed">{data.question}</p>
      </div>

      {/* Fraction bar visualization */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-l2)] border border-[var(--color-hairline)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-[var(--color-mute)] font-medium">分数模型</span>
          <span className="text-xs text-[var(--color-hairline-strong)]">·</span>
          <span className="text-xs text-[var(--color-mute)]">{clampedWhole}等分 · 高亮 {clampedPart} 份</span>
        </div>

        {/* Blocks row */}
        <div ref={containerRef} className="flex flex-wrap gap-1.5 mb-4 justify-center">
          {Array.from({ length: clampedWhole }).map((_, i) => (
            <div
              key={i}
              onClick={() => setHighlightIndex(i < highlightIndex ? i : i + 1 === highlightIndex ? 0 : i)}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-[var(--radius-md)] flex items-center justify-center text-xs font-bold transition-all duration-300 cursor-pointer select-none ${
                i < highlightIndex
                  ? 'bg-[var(--color-gradient-start)] text-white shadow-sm hover:opacity-90'
                  : 'bg-[var(--color-canvas-soft-2)] text-[var(--color-mute)] hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Fraction label */}
        {showLabel && (
          <div className="flex items-center justify-center gap-2 text-sm mb-3">
            <span className="text-[var(--color-mute)]">=</span>
            <span className="inline-flex flex-col items-center leading-tight">
              <span className="text-lg font-bold text-[var(--color-gradient-start)] border-b-2 border-[var(--color-gradient-start)] px-2 pb-0.5">
                {highlightIndex}
              </span>
              <span className="text-lg font-bold text-[var(--color-gradient-start)] pt-0.5 px-2">
                {clampedWhole}
              </span>
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--color-hairline)] justify-center">
          <button
            onClick={() => setShowLabel(!showLabel)}
            className={`px-4 py-2 text-xs font-medium rounded-full border transition-all cursor-pointer ${
              showLabel
                ? 'bg-[var(--color-link-bg-soft)] border-[var(--color-link)] text-[var(--color-link)]'
                : 'bg-[var(--color-canvas)] border-[var(--color-hairline)] text-[var(--color-body)] hover:border-[var(--color-mute)]'
            }`}
          >
            {showLabel ? '🙈 隐藏分数' : '👁️ 显示分数'}
          </button>
          <button
            onClick={() => {
              const el = containerRef.current
              if (!el) return
              el.classList.add('animate-pulse')
              setTimeout(() => {
                setHighlightIndex(highlightIndex === 0 ? clampedPart : 0)
                setTimeout(() => el.classList.remove('animate-pulse'), 100)
              }, 200)
            }}
            className="px-4 py-2 text-xs font-medium rounded-full border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-mute)] transition-all cursor-pointer"
          >
            🎬 动画切换
          </button>
        </div>
      </div>

      {/* Textual representation */}
      <div className="bg-[var(--color-canvas-soft)] rounded-[var(--radius-2xl)] p-5">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-mute)] font-semibold mb-2">📝 文字表示</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--color-body)]">
            将整体分成 <strong className="text-[var(--color-gradient-start)]">{clampedWhole}</strong> 等份，
          </span>
          <span className="text-xs text-[var(--color-body)]">
            取其中的 <strong className="text-[var(--color-gradient-start)]">{clampedPart}</strong> 份，
          </span>
          <span className="text-xs text-[var(--color-body)]">
            用分数表示为
            <strong className="text-[var(--color-gradient-start)] text-sm ml-1">{clampedPart}/{clampedWhole}</strong>
          </span>
        </div>
      </div>

      {/* Visual progress bar */}
      {clampedWhole > 0 && (
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-l2)] border border-[var(--color-hairline)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-mute)] font-semibold mb-2">📊 占比</p>
          <div className="w-full h-3 bg-[var(--color-canvas-soft-2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)] rounded-full transition-all duration-500"
              style={{ width: `${(clampedPart / clampedWhole) * 100}%` }}
            />
          </div>
          <p className="text-xs text-[var(--color-mute)] mt-2">
            高亮部分占整体的 {((clampedPart / clampedWhole) * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  )
}
