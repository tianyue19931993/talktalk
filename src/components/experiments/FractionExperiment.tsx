import { useState } from 'react'

interface FractionData {
  type: 'fraction'
  question: string
  whole: number
  part: number
}

export default function FractionExperiment({ data }: { data: FractionData }) {
  const [animating, setAnimating] = useState(false)
  const [showLabel, setShowLabel] = useState(true)

  const { whole, part } = data
  const clampedWhole = Math.max(1, Math.min(50, whole))
  const clampedPart = Math.max(0, Math.min(clampedWhole, part))

  const handleAnimate = () => {
    setAnimating(true)
    setTimeout(() => setAnimating(false), 600)
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto p-4">
      {/* Question */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-700 leading-relaxed">{data.question}</p>
      </div>

      {/* Fraction bar visualization */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400 font-medium">分数模型</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">
            {clampedWhole}等分 · 高亮 {clampedPart} 份
          </span>
        </div>

        {/* Blocks row */}
        <div
          className={`flex flex-wrap gap-1 mb-4 ${animating ? 'animate-pulse' : ''}`}
          key={animating ? 'anim' : 'stable'}
        >
          {Array.from({ length: clampedWhole }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < clampedPart
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Fraction label */}
        {showLabel && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">=</span>
            <span className="inline-flex flex-col items-center leading-tight">
              <span className="text-lg font-bold text-purple-700 border-b-2 border-purple-700 px-2 pb-0.5">
                {clampedPart}
              </span>
              <span className="text-lg font-bold text-purple-700 pt-0.5 px-2">
                {clampedWhole}
              </span>
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleAnimate}
            className="px-4 py-2 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
          >
            🎬 动画切换
          </button>
          <button
            onClick={() => setShowLabel(!showLabel)}
            className={`px-4 py-2 text-xs font-medium rounded-full border transition-all cursor-pointer ${
              showLabel
                ? 'border-purple-200 bg-purple-50 text-purple-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {showLabel ? '🙈 隐藏分数' : '👁️ 显示分数'}
          </button>
        </div>
      </div>

      {/* Textual representation */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">📝 文字表示</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600">
            将整体分成 <strong className="text-purple-700">{clampedWhole}</strong> 等份，
          </span>
          <span className="text-xs text-gray-600">
            取其中的 <strong className="text-purple-700">{clampedPart}</strong> 份，
          </span>
          <span className="text-xs text-gray-600">
            用分数表示为
            <strong className="text-purple-700 text-sm ml-1">
              {clampedPart}/{clampedWhole}
            </strong>
          </span>
        </div>
      </div>

      {/* Percentage width indicator */}
      {clampedWhole > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">📊 占比</p>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${(clampedPart / clampedWhole) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            高亮部分占整体的 {((clampedPart / clampedWhole) * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  )
}
