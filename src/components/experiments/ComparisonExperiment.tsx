import { useState, useMemo } from 'react'

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
    sameBase: a.base_count === b.base_count,
    sameUnit: a.unit === b.unit,
  }
}

// ─── 主组件 ────────────────────────────────

export default function ComparisonExperiment({ data }: { data: ComparisonData }) {
  const [mode, setMode] = useState<CompareMode>(null)

  const pairs = useMemo(() => getComparisonPairs(data), [data])

  if (!pairs) return null

  const { stateA, stateB, diffVariable, diffTotal, sameBase, sameUnit } = pairs

  const variableIcon = data.objects.find((o) => o.type === 'variable')?.icon || '📦'
  const baseIcon = data.objects.find((o) => o.type === 'base')?.icon || '📦'
  const variableName = data.objects.find((o) => o.type === 'variable')?.name || ''
  const baseName = data.objects.find((o) => o.type === 'base')?.name || ''

  const btnBase = (active: boolean) =>
    `px-4 py-2 text-xs font-medium rounded-full border transition-all cursor-pointer ${
      active
        ? 'bg-[var(--color-link-bg-soft)] border-[var(--color-link)] text-[var(--color-link)]'
        : 'bg-[var(--color-canvas)] border-[var(--color-hairline)] text-[var(--color-body)] hover:border-[var(--color-mute)]'
    }`

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto p-4">
      {/* Question */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-l2)] border border-[var(--color-hairline)]">
        <p className="text-sm text-[var(--color-body)] leading-relaxed">{data.question}</p>
      </div>

      {/* State comparison cards */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        {/* State A */}
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-l2)] border border-[var(--color-hairline)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-mute)] font-semibold mb-3">State A</div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{baseIcon}</span>
              <span className="text-xs text-[var(--color-mute)]">{stateA.base_count} {baseName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{variableIcon}</span>
              <span className="text-xs text-[var(--color-mute)]">{stateA.variable_count} {variableName}</span>
            </div>
            <div className={`pt-2 border-t border-[var(--color-hairline)] ${
              mode === 'same' ? 'bg-green-50 -mx-3 -mt-0 px-3 pb-2 rounded-xl' : ''
            } ${
              mode === 'different' ? 'bg-amber-50 -mx-3 -mt-0 px-3 pb-2 rounded-xl' : ''
            }`}>
              <span className="text-lg font-bold text-[var(--color-gradient-start)]">
                {stateA.total_value}
                <span className="text-sm font-normal text-[var(--color-mute)] ml-1">{stateA.unit}</span>
              </span>
              <div className="text-[10px] text-[var(--color-mute)] mt-0.5">{stateA.label}</div>
            </div>
          </div>
        </div>

        {/* VS */}
        <div className="flex items-center justify-center">
          <div className="text-lg font-bold text-[var(--color-hairline-strong)]">VS</div>
        </div>

        {/* State B */}
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-l2)] border border-[var(--color-hairline)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-mute)] font-semibold mb-3">State B</div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{baseIcon}</span>
              <span className="text-xs text-[var(--color-mute)]">{stateB.base_count} {baseName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{variableIcon}</span>
              <span className="text-xs text-[var(--color-mute)]">{stateB.variable_count} {variableName}</span>
            </div>
            <div className={`pt-2 border-t border-[var(--color-hairline)] ${
              mode === 'same' ? 'bg-green-50 -mx-3 -mt-0 px-3 pb-2 rounded-xl' : ''
            } ${
              mode === 'different' ? 'bg-amber-50 -mx-3 -mt-0 px-3 pb-2 rounded-xl' : ''
            }`}>
              <span className="text-lg font-bold text-[var(--color-gradient-start)]">
                {stateB.total_value}
                <span className="text-sm font-normal text-[var(--color-mute)] ml-1">{stateB.unit}</span>
              </span>
              <div className="text-[10px] text-[var(--color-mute)] mt-0.5">{stateB.label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison tools */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setMode(mode === 'same' ? null : 'same')} className={btnBase(mode === 'same')}>
          🔍 找相同
        </button>
        <button onClick={() => setMode(mode === 'different' ? null : 'different')} className={btnBase(mode === 'different')}>
          🔎 找不同
        </button>
        <button onClick={() => setMode(mode === 'pattern' ? null : 'pattern')} className={btnBase(mode === 'pattern')}>
          📊 观察规律
        </button>
      </div>

      {/* Pattern insight panel */}
      {mode === 'pattern' && (
        <div className="bg-[var(--color-link-bg-soft)] rounded-[var(--radius-2xl)] p-5 border border-[var(--color-link)]/20">
          <p className="text-xs font-semibold text-[var(--color-link)] mb-3">📊 观察发现</p>
          <div className="space-y-2">
            {sameBase && (
              <div className="text-xs text-[var(--color-link)]">
                相同部分：{baseName}数量相同（{stateA.base_count}{stateA.unit ? stateA.unit : '个'}）
              </div>
            )}
            <div className="text-xs text-[var(--color-link)]">
              差异：{variableName}相差 {diffVariable}{sameUnit ? stateA.unit : '个'}，总重相差 {diffTotal}{stateA.unit}
            </div>
            {sameUnit && (
              <div className="text-xs text-[var(--color-link)]">
                单位{baseName}重量 = {diffTotal} ÷ {diffVariable} = {diffTotal / diffVariable}{stateA.unit}
                （当 base_count 相同时）
              </div>
            )}
            {data.discoveries.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--color-link)]/20">
                {data.discoveries.map((d, i) => (
                  <div key={i} className="text-xs text-green-700 flex items-start gap-1.5 mt-1">
                    <span>✨</span>
                    <span>{d.rule}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Observations */}
      {data.observations.length > 0 && mode !== 'pattern' && (
        <div className="bg-[var(--color-canvas-soft)] rounded-[var(--radius-2xl)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-mute)] font-semibold mb-2">👁️ 观察</p>
          <ul className="space-y-1.5">
            {data.observations.map((obs, i) => (
              <li key={i} className="text-xs text-[var(--color-mute)] flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-[var(--color-gradient-start)]">•</span>
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
