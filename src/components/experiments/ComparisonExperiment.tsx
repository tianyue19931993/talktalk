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

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto p-4">
      {/* Question */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-700 leading-relaxed">{data.question}</p>
      </div>

      {/* State comparison cards */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        {/* State A */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-3">State A</div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{baseIcon}</span>
              <span className="text-xs text-gray-500">
                {stateA.base_count} {baseName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{variableIcon}</span>
              <span className="text-xs text-gray-500">
                {stateA.variable_count} {variableName}
              </span>
            </div>
            <div className={`pt-2 border-t border-gray-100 ${mode === 'same' ? 'bg-green-50 -mx-3 -mt-0 px-3 pb-2 rounded-xl' : ''} ${mode === 'different' ? 'bg-amber-50 -mx-3 -mt-0 px-3 pb-2 rounded-xl' : ''}`}>
              <span className="text-lg font-bold text-purple-700">{stateA.total_value}<span className="text-sm font-normal text-gray-400 ml-1">{stateA.unit}</span></span>
              <div className="text-[10px] text-gray-400 mt-0.5">{stateA.label}</div>
            </div>
          </div>
        </div>

        {/* VS */}
        <div className="flex items-center justify-center">
          <div className="text-lg font-bold text-gray-300">VS</div>
        </div>

        {/* State B */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-3">State B</div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{baseIcon}</span>
              <span className="text-xs text-gray-500">
                {stateB.base_count} {baseName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{variableIcon}</span>
              <span className="text-xs text-gray-500">
                {stateB.variable_count} {variableName}
              </span>
            </div>
            <div className={`pt-2 border-t border-gray-100 ${mode === 'same' ? 'bg-green-50 -mx-3 -mt-0 px-3 pb-2 rounded-xl' : ''} ${mode === 'different' ? 'bg-amber-50 -mx-3 -mt-0 px-3 pb-2 rounded-xl' : ''}`}>
              <span className="text-lg font-bold text-purple-700">{stateB.total_value}<span className="text-sm font-normal text-gray-400 ml-1">{stateB.unit}</span></span>
              <div className="text-[10px] text-gray-400 mt-0.5">{stateB.label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison tools */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMode(mode === 'same' ? null : 'same')}
          className={`px-4 py-2 text-xs font-medium rounded-full border transition-all cursor-pointer ${
            mode === 'same'
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          🔍 找相同
        </button>
        <button
          onClick={() => setMode(mode === 'different' ? null : 'different')}
          className={`px-4 py-2 text-xs font-medium rounded-full border transition-all cursor-pointer ${
            mode === 'different'
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          🔎 找不同
        </button>
        <button
          onClick={() => setMode(mode === 'pattern' ? null : 'pattern')}
          className={`px-4 py-2 text-xs font-medium rounded-full border transition-all cursor-pointer ${
            mode === 'pattern'
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          📊 观察规律
        </button>
      </div>

      {/* Pattern insight panel */}
      {mode === 'pattern' && (
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
          <p className="text-xs font-semibold text-blue-800 mb-3">📊 观察发现</p>
          <div className="space-y-2">
            {sameBase && (
              <div className="text-xs text-blue-700">
                相同部分：{baseName}数量相同（{stateA.base_count}
                {stateA.unit ? stateA.unit : '个'}）
              </div>
            )}
            <div className="text-xs text-blue-700">
              差异：{variableName}相差 {diffVariable}{sameUnit ? stateA.unit : '个'}，总重相差 {diffTotal}{stateA.unit}
            </div>
            {sameUnit && (
              <div className="text-xs text-blue-700">
                单位{baseName}重量 = {diffTotal} ÷ {diffVariable} = {diffTotal / diffVariable}{stateA.unit}
                （当 base_count 相同时）
              </div>
            )}
            {data.discoveries.length > 0 && (
              <div className="mt-2 pt-2 border-t border-blue-200">
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
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">👁️ 观察</p>
          <ul className="space-y-1.5">
            {data.observations.map((obs, i) => (
              <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
