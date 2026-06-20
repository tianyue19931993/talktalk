import { useState, useMemo, useRef } from 'react'
import { Download } from 'lucide-react'

// ─── 类型定义 ──────────────────────────────

interface KnownDataItem {
  label: string
  base_count: number
  variable_count: number
  total_value: number
  unit: string
}

interface ExperimentObject {
  name: string
  icon: string
  type: 'base' | 'variable'
}

interface Discovery {
  rule: string
}

interface ComparisonData {
  type: 'comparison'
  question: string
  known_data: KnownDataItem[]
  objects: ExperimentObject[]
  observations: string[]
  discoveries: Discovery[]
}

type CompareMode = 'same' | 'different' | 'pattern' | null

// ─── 辅助函数 ──────────────────────────────

function getComparisonPairs(data: ComparisonData) {
  const [a, b] = data.known_data
  if (!a || !b) return null
  return {
    stateA: a,
    stateB: b,
    diffVariable: Math.abs(a.variable_count - b.variable_count),
    diffTotal: Math.abs(a.total_value - b.total_value),
    moreVariable: b.variable_count > a.variable_count
      ? b.variable_count - a.variable_count
      : a.variable_count - b.variable_count,
    totalChange: b.total_value - a.total_value,
    isIncrease: b.total_value > a.total_value,
    sameBase: a.base_count === b.base_count,
    sameUnit: a.unit === b.unit,
  }
}

// ─── HTML 下载 ─────────────────────────────

function downloadAsHtml(
  rootEl: HTMLElement | null,
  _question: string,
  filename: string
) {
  if (!rootEl) return
  // Clone the rendered content to avoid mutation
  const clone = rootEl.cloneNode(true) as HTMLElement
  // Build a standalone HTML file
  const styles = Array.from(document.styleSheets)
    .map((ss) => {
      try {
        return Array.from(ss.cssRules || [])
          .map((r) => r.cssText)
          .join('\n')
      } catch {
        return ''
      }
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${filename}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,system-ui,sans-serif}
body{background:#fafafa;padding:16px;display:flex;justify-content:center;min-height:100vh}
${styles}
</style>
</head>
<body>${clone.outerHTML}</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── 主组件 ────────────────────────────────

export default function ComparisonExperiment({ data }: { data: ComparisonData }) {
  const [mode, setMode] = useState<CompareMode>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const pairs = useMemo(() => getComparisonPairs(data), [data])

  if (!pairs) return null

  const { stateA, stateB, diffVariable: _diffVariable, diffTotal: _diffTotal, moreVariable, totalChange, isIncrease: _isIncrease, sameUnit } = pairs

  const variableIcon = data.objects.find((o) => o.type === 'variable')?.icon || '📦'
  const baseIcon = data.objects.find((o) => o.type === 'base')?.icon || '📦'
  const variableName = data.objects.find((o) => o.type === 'variable')?.name || ''
  const baseName = data.objects.find((o) => o.type === 'base')?.name || ''

  const btnBase = (active: boolean) =>
    `px-4 py-2 text-xs font-medium rounded-full border transition-all cursor-pointer ${
      active
        ? 'bg-[var(--color-link-bg-soft)] border-[var(--color-link)] text-[var(--color-link)] shadow-sm'
        : 'bg-[var(--color-canvas)] border-[var(--color-hairline)] text-[var(--color-body)] hover:border-[var(--color-mute)] hover:shadow-sm'
    }`

  return (
    <div ref={contentRef} className="flex flex-col gap-4 max-w-xl mx-auto p-4">
      {/* Header with download */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">比较模型</h2>
        <button
          onClick={() => downloadAsHtml(contentRef.current, data.question, '比较关系_互动演示')}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full
            bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-body)]
            hover:border-[var(--color-mute)] hover:text-[var(--color-ink)] transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          下载
        </button>
      </div>

      {/* Two state cards — side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* State A — 第一次 */}
        <div className="bg-[#FFF5F7] rounded-2xl p-4 border border-[#FFE4E8]">
          <div className="text-xs font-semibold text-[#B84060] mb-3">{stateA.label || '第一次'}</div>
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-base">{baseIcon}</span>
              <span className="text-xs text-[#9E7A8A]">{stateA.base_count} {baseName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{variableIcon}</span>
              <span className="text-xs text-[#9E7A8A]">{stateA.variable_count}{variableName === '碗' ? '' : ' ' + variableName}</span>
            </div>
          </div>
          <div className="border-t border-[#FFD6DC] pt-2">
            <span className="text-lg font-bold text-[var(--color-gradient-start)]">
              {stateA.total_value}
              <span className="text-sm font-normal text-[var(--color-mute)] ml-0.5">{stateA.unit}</span>
            </span>
          </div>
        </div>

        {/* State B — 第二次 */}
        <div className="bg-[#FFF5F7] rounded-2xl p-4 border border-[#FFE4E8]">
          <div className="text-xs font-semibold text-[#B84060] mb-3">{stateB.label || '第二次'}</div>
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-base">{baseIcon}</span>
              <span className="text-xs text-[#9E7A8A]">{stateB.base_count} {baseName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{variableIcon}</span>
              <span className="text-xs text-[#9E7A8A]">{stateB.variable_count}{variableName === '碗' ? '' : ' ' + variableName}</span>
            </div>
          </div>
          <div className="border-t border-[#FFD6DC] pt-2">
            <span className="text-lg font-bold text-[var(--color-gradient-start)]">
              {stateB.total_value}
              <span className="text-sm font-normal text-[var(--color-mute)] ml-0.5">{stateB.unit}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Comparison insight bar */}
      <div className="bg-[var(--color-link-bg-soft)] rounded-2xl p-3.5 border border-[var(--color-link)]/15 flex items-center gap-2 justify-center flex-wrap">
        <span className="text-xs font-medium text-[var(--color-link)]">
          增加 {moreVariable}{variableName === '碗' ? '' : ' ' + variableName}
        </span>
        <span className="text-[var(--color-mute)] text-xs">→</span>
        <span className="text-xs font-medium text-[var(--color-link)]">
          增加 {Math.abs(totalChange)}{stateA.unit}
        </span>
      </div>

      {/* Mode buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={() => setMode(mode === 'same' ? null : 'same')} className={btnBase(mode === 'same')}>
          🔍 找相同
        </button>
        <button onClick={() => setMode(mode === 'different' ? null : 'different')} className={btnBase(mode === 'different')}>
          🔎 找不同
        </button>
        <button onClick={() => setMode(mode === 'pattern' ? null : 'pattern')} className={btnBase(mode === 'pattern')}>
          📊 发现规律
        </button>
      </div>

      {/* Discoveries panel */}
      {mode === 'pattern' && data.discoveries.length > 0 && (
        <div className="bg-[var(--color-canvas)] rounded-2xl p-5 shadow-[var(--shadow-l2)] border border-[var(--color-hairline)]">
          <p className="text-xs font-semibold text-[var(--color-ink)] mb-3">🔍 发现规律</p>
          <div className="space-y-2">
            {data.discoveries.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[var(--color-body)] leading-relaxed">
                <span className="text-[var(--color-gradient-start)] font-bold shrink-0 mt-0.5">•</span>
                <span>{d.rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Same section */}
      {mode === 'same' && (
        <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
          <p className="text-xs font-semibold text-green-800 mb-2">🔍 找相同</p>
          <p className="text-xs text-green-700 leading-relaxed">
            {baseName}数量相同（{stateA.base_count}个）
            {sameUnit && `，单位都是${stateA.unit}`}
          </p>
        </div>
      )}

      {/* Different section */}
      {mode === 'different' && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
          <p className="text-xs font-semibold text-amber-800 mb-2">🔎 找不同</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            {variableName}数量不同（{stateA.variable_count} → {stateB.variable_count}），
            总重量不同（{stateA.total_value}{stateA.unit} → {stateB.total_value}{stateB.unit}）
          </p>
        </div>
      )}
    </div>
  )
}
