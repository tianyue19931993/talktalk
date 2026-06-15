import { useMemo } from 'react'

interface AreaData {
  type: 'area'
  question: string
  width: number
  height: number
}

export default function AreaExperiment({ data }: { data: AreaData }) {
  const { width, height } = data

  const clampedWidth = Math.max(1, Math.min(20, width))
  const clampedHeight = Math.max(1, Math.min(20, height))

  const rows = useMemo(() => {
    const result: number[][] = []
    for (let r = 0; r < clampedHeight; r++) {
      const cells: number[] = []
      for (let c = 0; c < clampedWidth; c++) {
        cells.push(r * clampedWidth + c + 1)
      }
      result.push(cells)
    }
    return result
  }, [clampedWidth, clampedHeight])

  const cellSize = clampedWidth > 12 || clampedHeight > 12 ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-8 h-8 sm:w-10 sm:h-10'

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto p-4">
      {/* Question */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-700 leading-relaxed">{data.question}</p>
      </div>

      {/* Grid visualization */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400 font-medium">方格图</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">
            {clampedWidth} × {clampedHeight} 网格
          </span>
        </div>

        {/* Width label */}
        <div className="flex items-end gap-1 ml-1 mb-1">
          <span className="text-[10px] text-gray-400 w-4 shrink-0">宽</span>
          <div className="flex gap-1" style={{ marginLeft: '2px' }}>
            {Array.from({ length: clampedWidth }).map((_, i) => (
              <div key={i} className={`${cellSize} flex items-center justify-center`}>
                <span className="text-[9px] text-gray-400">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid rows */}
        <div className="space-y-1">
          {rows.map((row, ri) => (
            <div key={ri} className="flex items-center gap-1">
              {/* Row number label */}
              <span className="text-[10px] text-gray-400 w-4 shrink-0 text-right">
                {ri === Math.floor(clampedHeight / 2) ? '高' : ''}
              </span>
              {/* Cells */}
              <div className="flex gap-1">
                {row.map((cellNum) => (
                  <div
                    key={cellNum}
                    className={`${cellSize} bg-purple-100 border border-purple-200 rounded flex items-center justify-center text-[9px] sm:text-[10px] font-medium text-purple-600`}
                  >
                    {cellNum}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Height label */}
        {clampedHeight > 1 && (
          <div className="flex items-center gap-1 mt-2 ml-1">
            <span className="text-[10px] text-gray-400 w-4 shrink-0">高</span>
            <div className="flex items-center gap-1">
              <div className="flex flex-col gap-[2px]" style={{ height: `${Math.min(clampedHeight * 12, 80)}px` }}>
                {Array.from({ length: clampedHeight }).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <span className="text-[9px] text-gray-400 mr-1">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dimension display */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-3">📐 尺寸信息</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <div className="font-bold text-purple-700 text-xl">{clampedWidth}</div>
            <div className="text-[11px] text-gray-500 mt-1">宽</div>
            <div className="text-[10px] text-gray-400 mt-0.5">width</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <div className="font-bold text-purple-700 text-xl">{clampedHeight}</div>
            <div className="text-[11px] text-gray-500 mt-1">高</div>
            <div className="text-[10px] text-gray-400 mt-0.5">height</div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500">
            网格总数：<strong className="text-purple-700">{clampedWidth} × {clampedHeight} = {clampedWidth * clampedHeight}</strong> 个方格
          </span>
        </div>
      </div>
    </div>
  )
}
