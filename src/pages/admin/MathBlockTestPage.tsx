import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { MathBlockRenderPreview, type MathBlockTestDsl } from '../../components/admin/MathBlockRenderPreview'

const TEST_DSL: MathBlockTestDsl = {
  interactionType: 'button',
  elements: [
    {
      id: 'bg',
      type: 'rect',
      x: 0,
      y: 0,
      width: 700,
      height: 480,
      fill: '#f8f9fa',
      strokeWidth: 0,
      opacity: 1,
      visible: true,
    },
    {
      id: 'title',
      type: 'text',
      x: 350,
      y: 20,
      content: '行程问题：上海到杭州',
      color: '#333333',
      fontSize: 22,
      textAlign: 'center',
      opacity: 1,
      visible: true,
    },
    {
      id: 'timeLine',
      type: 'line',
      x1: 50,
      y1: 100,
      x2: 650,
      y2: 100,
      color: '#2c3e50',
      strokeWidth: 3,
      opacity: 1,
      dash: false,
      visible: false,
    },
    {
      id: 'timeStart',
      type: 'text',
      x: 50,
      y: 85,
      content: '9:00',
      color: '#2c3e50',
      fontSize: 16,
      textAlign: 'left',
      opacity: 1,
      visible: false,
    },
    {
      id: 'timeEnd',
      type: 'text',
      x: 650,
      y: 85,
      content: '11:15',
      color: '#2c3e50',
      fontSize: 16,
      textAlign: 'right',
      opacity: 1,
      visible: false,
    },
    {
      id: 'timeRestBrace',
      type: 'brace',
      startX: 350,
      startY: 100,
      endX: 500,
      endY: 100,
      color: '#e67e22',
      strokeWidth: 2,
      opacity: 1,
      dash: false,
      visible: false,
    },
    {
      id: 'restLabel',
      type: 'text',
      x: 425,
      y: 80,
      content: '休息15分钟',
      color: '#e67e22',
      fontSize: 14,
      textAlign: 'center',
      opacity: 1,
      visible: false,
    },
    {
      id: 'timeDurationBrace',
      type: 'brace',
      startX: 50,
      startY: 100,
      endX: 650,
      endY: 100,
      color: '#2980b9',
      strokeWidth: 2,
      opacity: 1,
      dash: false,
      visible: false,
    },
    {
      id: 'durationLabel',
      type: 'text',
      x: 350,
      y: 128,
      content: '总用时2小时15分钟',
      color: '#2980b9',
      fontSize: 14,
      textAlign: 'center',
      opacity: 1,
      visible: false,
    },
    {
      id: 'distLine',
      type: 'line',
      x1: 50,
      y1: 210,
      x2: 650,
      y2: 210,
      color: '#2c3e50',
      strokeWidth: 3,
      opacity: 1,
      dash: false,
      visible: false,
    },
    {
      id: 'distStart',
      type: 'text',
      x: 50,
      y: 195,
      content: '上海',
      color: '#2c3e50',
      fontSize: 16,
      textAlign: 'left',
      opacity: 1,
      visible: false,
    },
    {
      id: 'distEnd',
      type: 'text',
      x: 650,
      y: 195,
      content: '杭州',
      color: '#2c3e50',
      fontSize: 16,
      textAlign: 'right',
      opacity: 1,
      visible: false,
    },
    {
      id: 'totalDistLabel',
      type: 'text',
      x: 350,
      y: 240,
      content: '全程171千米',
      color: '#2c3e50',
      fontSize: 16,
      textAlign: 'center',
      opacity: 1,
      visible: false,
    },
    {
      id: 'remainDistBrace',
      type: 'brace',
      startX: 500,
      startY: 210,
      endX: 650,
      endY: 210,
      color: '#e74c3c',
      strokeWidth: 2,
      opacity: 1,
      dash: false,
      visible: false,
    },
    {
      id: 'remainLabel',
      type: 'text',
      x: 575,
      y: 195,
      content: '剩余39千米',
      color: '#e74c3c',
      fontSize: 14,
      textAlign: 'center',
      opacity: 1,
      visible: false,
    },
    {
      id: 'travelDistBrace',
      type: 'brace',
      startX: 50,
      startY: 210,
      endX: 500,
      endY: 210,
      color: '#27ae60',
      strokeWidth: 2,
      opacity: 1,
      dash: false,
      visible: false,
    },
    {
      id: 'travelLabel',
      type: 'text',
      x: 275,
      y: 255,
      content: '已行路程',
      color: '#27ae60',
      fontSize: 14,
      textAlign: 'center',
      opacity: 1,
      visible: false,
    },
    {
      id: 'formulaText',
      type: 'text',
      x: 350,
      y: 320,
      content: '行驶时间 = 2小时15分 - 15分 = 2小时；速度 = (171-39) ÷ 2',
      color: '#8e44ad',
      fontSize: 18,
      textAlign: 'center',
      opacity: 1,
      visible: false,
    },
    {
      id: 'nextBtn',
      type: 'button',
      x: 305,
      y: 400,
      width: 90,
      height: 36,
      content: '下一步',
      fill: '#3498db',
      color: '#ffffff',
      fontSize: 18,
      visible: true,
    }
  ],
  rules: [
    {
      trigger: 'click',
      targetId: 'nextBtn',
      stepIndex: 1,
      showElementIds: [
        'timeLine',
        'timeStart',
        'timeEnd',
        'timeRestBrace',
        'timeRestLabel',
        'timeDurationBrace',
        'durationLabel'
      ],
      stepText: '第一步：画出时间轴，标注出发、到达、休息及总用时',
      logic: '',
      updateElements: [],
    },
    {
      trigger: 'click',
      targetId: 'nextBtn',
      stepIndex: 2,
      showElementIds: [
        'distLine',
        'distStart',
        'distEnd',
        'totalDistLabel',
        'remainDistBrace',
        'remainLabel',
        'travelDistBrace',
        'travelLabel'
      ],
      stepText: '第二步：画出路程线段，标注全程、剩余及已行路程',
      logic: '',
      updateElements: [],
    },
    {
      trigger: 'click',
      targetId: 'nextBtn',
      stepIndex: 3,
      showElementIds: ['formulaText'],
      stepText: '第三步：列式计算速度',
      logic: '',
      updateElements: [],
    },
  ],
  finalCalculation: {
    formula: '171-39=132千米；2小时15分=2.25小时；2.25-0.25=2小时；132÷2',
    answer: '',
  },
}

export default function MathBlockTestPage() {
  const [draftJsonText, setDraftJsonText] = useState(() => JSON.stringify(TEST_DSL, null, 2))
  const [appliedJsonText, setAppliedJsonText] = useState(() => JSON.stringify(TEST_DSL, null, 2))
  const [stepCount, setStepCount] = useState(0)
  const [jsonError, setJsonError] = useState('')

  const parsedDsl = useMemo(() => {
    try {
      const parsed = JSON.parse(appliedJsonText) as MathBlockTestDsl

      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.elements) || !Array.isArray(parsed.rules)) {
        return {
          ok: false as const,
          error: 'JSON 顶层需要包含 elements 和 rules。',
          data: TEST_DSL,
        }
      }

      return {
        ok: true as const,
        error: '',
        data: {
          ...parsed,
          elements: parsed.elements as MathBlockTestDsl['elements'],
        } as MathBlockTestDsl,
      }
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : 'JSON 解析失败',
        data: TEST_DSL,
      }
    }
  }, [appliedJsonText])

  const activeDsl = parsedDsl.data

  const currentRule = stepCount > 0 ? activeDsl.rules[stepCount - 1] : null
  const completed = stepCount >= activeDsl.rules.length
  const activeJsonDisplay = useMemo(() => JSON.stringify(activeDsl, null, 2), [activeDsl])

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ id?: string }>
      if (custom.detail?.id !== 'nextBtn') return
      setStepCount((current) => Math.min(activeDsl.rules.length, current + 1))
    }

    window.addEventListener('basic-atom-button-click', handler)
    return () => window.removeEventListener('basic-atom-button-click', handler)
  }, [activeDsl.rules.length])

  const handleApply = () => {
    setJsonError('')

    try {
      const parsed = JSON.parse(draftJsonText) as Partial<MathBlockTestDsl>
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.elements) || !Array.isArray(parsed.rules)) {
        setJsonError('JSON 顶层需要包含 elements 和 rules。')
        return
      }

      setAppliedJsonText(draftJsonText)
      setStepCount(0)
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'JSON 解析失败')
    }
  }

  const handleReset = () => {
    const nextText = JSON.stringify(TEST_DSL, null, 2)
    setDraftJsonText(nextText)
    setAppliedJsonText(nextText)
    setJsonError('')
    setStepCount(0)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4 lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-ink)]">发现区：MathBlockRenderPreview</h1>
            <p className="mt-1 text-sm text-[var(--color-body)]">
              直接用“6 种基础原子渲染单元”的组件渲染这段 JSON，点击按钮按规则逐步显隐。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas-soft)]"
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </button>
            <div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-2 text-sm text-[var(--color-link)]">
              {activeDsl.interactionType} · 第 {Math.min(stepCount, activeDsl.rules.length)} / {activeDsl.rules.length} 步
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--color-ink)]">JSON 测试</div>
              <div className="text-xs text-[var(--color-mute)]">
                {parsedDsl.ok ? `${parsedDsl.data.elements.length} 个元素` : '解析异常'}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-link)] px-3 py-2 text-sm text-white transition-opacity hover:opacity-90"
              >
                应用 JSON
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas-soft)]"
              >
                <RotateCcw className="h-4 w-4" />
                恢复示例
              </button>
            </div>

            <textarea
              value={draftJsonText}
              onChange={(event) => setDraftJsonText(event.target.value)}
              spellCheck={false}
              className="mt-3 min-h-[520px] w-full rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-4 py-3 font-mono text-[12px] leading-6 text-[var(--color-ink)] outline-none transition-all focus:border-[var(--color-link)] focus:ring-2 focus:ring-[var(--color-link-bg-soft)]"
            />
            {(jsonError || !parsedDsl.ok) && (
              <div className="mt-3 rounded-[16px] border border-[rgba(238,0,0,0.18)] bg-[rgba(238,0,0,0.06)] px-4 py-3 text-sm text-[var(--color-error)]">
                {jsonError || parsedDsl.error}
              </div>
            )}
            <div className="mt-3 rounded-[16px] bg-[var(--color-canvas-soft)] px-4 py-3 text-xs text-[var(--color-body)]">
              直接把你的 DSL JSON 粘进来，点“应用 JSON”后，右侧会按这份内容渲染。
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          <MathBlockRenderPreview dsl={activeDsl} stepCount={stepCount} />

          <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--color-ink)]">JSON 预览</div>
              <div className="text-xs text-[var(--color-mute)]">右侧生效数据</div>
            </div>
            <pre className="mt-3 max-h-[320px] overflow-auto rounded-[18px] bg-[var(--color-canvas-soft)] p-4 font-mono text-[12px] leading-6 text-[var(--color-ink)]">
              {activeJsonDisplay}
            </pre>
          </div>

          <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--color-ink)]">
                {currentRule ? `当前步骤：${currentRule.stepIndex}` : '等待开始'}
              </div>
              {completed ? (
                <div className="rounded-full bg-[rgba(16,185,129,0.12)] px-3 py-1 text-xs text-[rgb(16,185,129)]">
                  已到最终答案
                </div>
              ) : (
                <div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1 text-xs text-[var(--color-link)]">
                  点击下一步继续
                </div>
              )}
            </div>

            <div className="mt-3 flex items-start gap-3 rounded-[18px] bg-[var(--color-canvas-soft)] px-4 py-3 text-sm text-[var(--color-body)]">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-link)]" />
              <div>{currentRule?.stepText ?? '先点击按钮，让我们从第一步开始。'}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
