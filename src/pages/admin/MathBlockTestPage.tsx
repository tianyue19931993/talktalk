import { useMemo, useState } from 'react'
import MultiAxisTrackStateEngine, {
  type MultiAxisTrackStateEngineJson,
  defaultMultiAxisTrackStateEngineJson,
} from '../../components/admin/MultiAxisTrackStateEngine'

const DEFAULT_JSON = JSON.stringify(defaultMultiAxisTrackStateEngineJson, null, 2)

function isMultiAxisTrackStateEngineJson(value: unknown): value is MultiAxisTrackStateEngineJson {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof (value as { title?: unknown }).title === 'string'
    && typeof (value as { question?: unknown }).question === 'string'
    && Array.isArray((value as { lines?: unknown }).lines)
    && Array.isArray((value as { steps?: unknown }).steps)
    && typeof (value as { answer?: unknown }).answer === 'string'
}

export default function MathBlockTestPage() {
  const [jsonText, setJsonText] = useState(DEFAULT_JSON)

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(jsonText) as unknown
      if (!isMultiAxisTrackStateEngineJson(value)) {
        return {
          ok: false as const,
          data: null as MultiAxisTrackStateEngineJson | null,
          error: 'JSON 顶层必须包含 title / question / lines / steps / answer。',
        }
      }

      return {
        ok: true as const,
        data: value,
        error: '',
      }
    } catch (error) {
      return {
        ok: false as const,
        data: null as MultiAxisTrackStateEngineJson | null,
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
                <div className="text-lg font-semibold text-[var(--color-ink)]">数学测试</div>
                <div className="mt-1 text-sm text-[var(--color-body)]">
                  直接粘贴 MultiAxisTrackStateEngine 的线段图 JSON 预览动态线段画布。
                </div>
              </div>
              <div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1 text-xs text-[var(--color-link)]">
                {parsed.ok ? `${parsed.data?.lines.length ?? 0} lines` : 'JSON error'}
              </div>
            </div>

            <textarea
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              className="mt-4 min-h-[420px] w-full rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-4 py-3 font-mono text-[13px] leading-6 text-[var(--color-ink)] outline-none transition-all focus:border-[var(--color-link)] focus:ring-2 focus:ring-[var(--color-link-bg-soft)]"
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
          {!parsed.ok && (
            <div className="rounded-[28px] border border-[var(--color-hairline)] bg-white p-6 text-sm text-[var(--color-body)]">
              请输入合法的 MultiAxisTrackStateEngine 线段图 JSON。
            </div>
          )}

          {parsed.ok && parsed.data && (
            <>
              <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-base font-semibold text-[var(--color-ink)]">MultiAxisTrackStateEngine 预览</div>
                    <div className="mt-1 text-sm text-[var(--color-body)]">
                      lines 负责线段，steps 负责播放节奏。
                    </div>
                  </div>
                  <div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1 text-xs text-[var(--color-body)]">
                    {parsed.data.lines.length} lines
                  </div>
                </div>
              </div>

              <MultiAxisTrackStateEngine jsonData={parsed.data} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
