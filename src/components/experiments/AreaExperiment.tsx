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

  const cellSize = clampedWidth > 12 || clampedHeight > 12
    ? 'w-6 h-6 sm:w-7 sm:h-7'
    : 'w-7 h-7 sm:w-9 sm:h-9'

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto p-4">
      {/* Question */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-l2)] border border-[var(--color-hairline)]">
        <p className="text-sm text-[var(--color-body)] leading-relaxed">{data.question}</p>
      </div>

      {/* Grid visualization */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-l2)] border border-[var(--color-hairline)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-[var(--color-mute)] font-medium">方格图</span>
          <span className="text-xs text-[var(--color-hairline-strong)]">·</span>
          <span className="text-xs text-[var(--color-mute)]">
            {clampedWidth} × {clampedHeight} 网格
          </span>
        </div>

        {/* Grid rows */}
        <div className="space-y-1 overflow-x-auto pb-2">
          {/* Top width label */}
          <div className="flex items-center gap-1 mb-1 ml-11">
            <div className="flex gap-1">
              {Array.from({ length: clampedWidth }).map((_, i) => (
                <div key={i} className={`${cellSize} flex items-center justify-center`}>
                  <span className="text-[9px] text-[var(--color-mute)]">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {rows.map((row, ri) => (
            <div key={ri} className="flex items-center gap-1">
              {/* Row number label */}
              <span className="text-[9px] text-[var(--color-mute)] w-10 shrink-0 text-right pr-1">
                {ri + 1}
              </span>
              {/* Cells */}
              <div className="flex gap-1">
                {row.map((cellNum) => (
                  <div
                    key={cellNum}
                    className={`${cellSize} bg-[var(--color-link-bg-soft)] border border-[var(--color-link)]/20 rounded flex items-center justify-center text-[9px] sm:text-[10px] font-medium text-[var(--color-link)]`}
                  >
                    {cellNum}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dimension display */}
      <div className="bg-[var(--color-canvas-soft)] rounded-[var(--radius-2xl)] p-5">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-mute)] font-semibold mb-3">📐 尺寸信息</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--color-canvas)] rounded-xl p-4 text-center shadow-[var(--shadow-l1)] border border-[var(--color-hairline)]">
            <div className="font-bold text-[var(--color-gradient-start)] text-xl">{clampedWidth}</div>
            <div className="text-[11px] text-[var(--color-body)] mt-1">宽</div>
            <div className="text-[10px] text-[var(--color-mute)] mt-0.5">width</div>
          </div>
          <div className="bg-[var(--color-canvas)] rounded-xl p-4 text-center shadow-[var(--shadow-l1)] border border-[var(--color-hairline)]">
            <div className="font-bold text-[var(--color-gradient-start)] text-xl">{clampedHeight}</div>
            <div className="text-[11px] text-[var(--color-body)] mt-1">高</div>
            <div className="text-[10px] text-[var(--color-mute)] mt-0.5">height</div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <span className="text-xs text-[var(--color-body)]">
            网格总数：<strong className="text-[var(--color-gradient-start)]">{clampedWidth} × {clampedHeight} = {clampedWidth * clampedHeight}</strong> 个方格
          </span>
        </div>
      </div>
    </div>
  )
}
