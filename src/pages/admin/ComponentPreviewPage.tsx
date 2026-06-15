import { useState } from 'react'
import { Eye } from 'lucide-react'
import ComparisonExperiment from '../../components/experiments/ComparisonExperiment'
import FractionExperiment from '../../components/experiments/FractionExperiment'
import AreaExperiment from '../../components/experiments/AreaExperiment'

// ─── 各组件样例数据 ──────────────────────────

const COMPARISON_SAMPLE = {
  type: 'comparison' as const,
  question: '用一个碗向一个空罐子里装米，如果倒进5碗米连罐共重430克，如果倒进7碗米连罐共重590克，那么一碗米重多少克？一个空罐子重多少克？',
  known_data: [
    { label: '5碗米连罐总重', base_count: 1, variable_count: 5, total_value: 430, unit: '克' },
    { label: '7碗米连罐总重', base_count: 1, variable_count: 7, total_value: 590, unit: '克' },
  ],
  objects: [
    { name: '空罐子', icon: '🏺', type: 'base' as const },
    { name: '一碗米', icon: '🍚', type: 'variable' as const },
  ],
  observations: [
    '当罐子里有5碗米时，电子秤显示430克。',
    '当罐子里有7碗米时，电子秤显示590克。',
    '从7碗米减少到5碗米，重量减少了160克，同时米碗数减少了2碗。',
  ],
  discoveries: [
    { rule: '两碗米的重量等于两次称量重量的差值（590-430=160克），所以一碗米重80克。' },
    { rule: '空罐子的重量等于5碗米连罐总重减去5碗米的重量（430-5×80=30克）。' },
  ],
}

const FRACTION_SAMPLE = {
  type: 'fraction' as const,
  question: '把一个蛋糕平均分成8份，小明吃了3份，他吃了几分之几？还剩几分之几？',
  whole: 8,
  part: 3,
}

const AREA_SAMPLE = {
  type: 'area' as const,
  question: '一个长方形花坛，长5米，宽3米，这个花坛有多大？',
  width: 5,
  height: 3,
}

type TabKey = 'comparison' | 'fraction' | 'area'

const TABS: { key: TabKey; label: string; desc: string }[] = [
  { key: 'comparison', label: '🔍 比较关系', desc: '等量代换 / 和差问题 / 鸡兔同笼 / 倍数问题' },
  { key: 'fraction', label: '🧮 分数模型', desc: '分数认识 / 分数比较 / 分数加减' },
  { key: 'area', label: '📐 面积模型', desc: '面积 / 周长 / 方格图' },
]

export default function ComponentPreviewPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('comparison')

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Eye className="w-5 h-5 text-[var(--color-ink)]" />
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">实验组件预览</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[var(--color-link-bg-soft)] text-[var(--color-link)] shadow-sm'
                : 'bg-[var(--color-canvas)] text-[var(--color-body)] border border-[var(--color-hairline)] hover:border-[var(--color-mute)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab description */}
      <div className="mb-5">
        <p className="text-xs text-[var(--color-mute)]">
          {TABS.find((t) => t.key === activeTab)?.desc}
        </p>
      </div>

      {/* Component preview area */}
      <div className="bg-[var(--color-canvas-soft)] rounded-[var(--radius-xl)] border border-[var(--color-hairline)] overflow-hidden">
        {/* Mobile mockup */}
        <div className="max-w-[400px] mx-auto bg-white shadow-sm">
          {/* Status bar mock */}
          <div className="h-8 bg-gray-50 border-b border-gray-100 flex items-center justify-center text-[10px] text-gray-400">
            手机预览 · 375 × 812
          </div>

          {/* Component */}
          {activeTab === 'comparison' && <ComparisonExperiment data={COMPARISON_SAMPLE} />}
          {activeTab === 'fraction' && <FractionExperiment data={FRACTION_SAMPLE} />}
          {activeTab === 'area' && <AreaExperiment data={AREA_SAMPLE} />}

          <div className="h-4" />
        </div>
      </div>

      {/* Sample JSON */}
      <details className="mt-6 bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] overflow-hidden">
        <summary className="px-5 py-3 text-sm font-medium text-[var(--color-body)] cursor-pointer hover:text-[var(--color-ink)] transition-colors">
          查看样例 analysis_json 数据
        </summary>
        <div className="px-5 pb-5">
          <pre className="text-xs font-mono bg-[var(--color-canvas-soft)] p-4 rounded-[var(--radius-md)] overflow-x-auto leading-relaxed text-[var(--color-body)]">
            {JSON.stringify(
              activeTab === 'comparison'
                ? COMPARISON_SAMPLE
                : activeTab === 'fraction'
                ? FRACTION_SAMPLE
                : AREA_SAMPLE,
              null,
              2
            )}
          </pre>
        </div>
      </details>
    </div>
  )
}
