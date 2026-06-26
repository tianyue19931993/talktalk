import { useMemo, useState } from 'react'
import { MathComponentRenderer } from '../../components/math'

const DEFAULT_JSON = `{
  "logic_blocks": [
    {
      "step": 1,
      "type": "求经过时间",
      "component": "TimeComponent",
      "math_object": "出发时刻9:00到11:15的时间差",
      "visual_object": "钟表"
    },
    {
      "step": 2,
      "type": "统一时间单位",
      "component": "UnitConvertComponent",
      "math_object": "停车时间15分钟转换为小时",
      "visual_object": "单位换算表"
    },
    {
      "step": 3,
      "type": "求差",
      "component": "DifferenceComponent",
      "math_object": "经过时间减去停车时间得到行驶时间",
      "visual_object": "数轴"
    },
    {
      "step": 4,
      "type": "求差",
      "component": "DifferenceComponent",
      "math_object": "总路程171千米减去剩余39千米得到已行驶路程",
      "visual_object": "线段图"
    },
    {
      "step": 5,
      "type": "求速度",
      "component": "DistanceSpeedTimeComponent",
      "math_object": "已行驶路程除以行驶时间",
      "visual_object": "行程线段图"
    }
  ]
}`

type ParsedPayload = {
  logic_blocks?: Array<Record<string, unknown>>
}

function formatBlock(block: Record<string, unknown>) {
  return JSON.stringify(block, null, 2)
}

export default function MathBlockTestPage() {
  const [jsonText, setJsonText] = useState(DEFAULT_JSON)

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(jsonText) as ParsedPayload
      const logicBlocks = Array.isArray(value.logic_blocks) ? value.logic_blocks.filter(Boolean) : []
      return {
        ok: true as const,
        blocks: logicBlocks,
        error: '',
      }
    } catch (error) {
      return {
        ok: false as const,
        blocks: [] as Array<Record<string, unknown>>,
        error: error instanceof Error ? error.message : 'JSON 解析失败',
      }
    }
  }, [jsonText])

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[28px] border border-[var(--color-hairline)] bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[var(--color-ink)]">Math Block 调试</div>
                <div className="mt-1 text-sm text-[var(--color-body)]">把 `logic_analysis_json.logic_blocks` 直接贴进来预览。</div>
              </div>
              <div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1 text-xs text-[var(--color-link)]">
                {parsed.ok ? `${parsed.blocks.length} blocks` : 'JSON error'}
              </div>
            </div>

            <textarea
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              className="mt-4 min-h-[340px] w-full rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-4 py-3 font-mono text-[13px] leading-6 text-[var(--color-ink)] outline-none transition-all focus:border-[var(--color-link)] focus:ring-2 focus:ring-[var(--color-link-bg-soft)]"
              spellCheck={false}
            />

            {!parsed.ok && (
              <div className="mt-4 rounded-[20px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.06)] p-4 text-sm text-[var(--color-error)]">
                {parsed.error}
              </div>
            )}
          </div>
        </aside>

        <main className="space-y-4">
          {parsed.ok && parsed.blocks.length === 0 && (
            <div className="rounded-[28px] border border-[var(--color-hairline)] bg-white p-6 text-sm text-[var(--color-body)]">
              没有解析到 `logic_blocks`。
            </div>
          )}

          {parsed.ok &&
            parsed.blocks.map((block, index) => {
              const title = `${String(block.step ?? index + 1)} · ${String(block.component ?? 'GenericLogicComponent')}`
              return (
                <section key={`${String(block.component ?? 'block')}-${index}`} className="space-y-3">
                  <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-[var(--color-ink)]">{title}</div>
                        <div className="mt-1 text-sm text-[var(--color-body)]">
                          传给组件的单个 `block` 就是下面这份对象。
                        </div>
                      </div>
                      <div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1 text-xs text-[var(--color-body)]">
                        step {String(block.step ?? index + 1)}
                      </div>
                    </div>
                    <pre className="mt-4 overflow-auto rounded-[20px] bg-[var(--color-canvas-soft)] p-4 text-xs leading-6 text-[var(--color-ink)]">
                      {formatBlock(block)}
                    </pre>
                  </div>

                  <MathComponentRenderer
                    block={
                      {
                        step: Number(block.step ?? index + 1),
                        type: String(block.type ?? ''),
                        component: String(block.component ?? 'GenericLogicComponent'),
                        math_object: String(block.math_object ?? ''),
                        visual_object: String(block.visual_object ?? ''),
                      }
                    }
                  />
                </section>
              )
            })}
        </main>
      </div>
    </div>
  )
}
