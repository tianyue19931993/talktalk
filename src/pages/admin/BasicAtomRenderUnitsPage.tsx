import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import {
  SAMPLE_BASIC_ATOM_ELEMENTS,
  bindInteractiveBoxDrag,
  renderAllElements,
} from '../../lib/basicAtomRenderUnits'

const SVG_WIDTH = 700
const SVG_HEIGHT = 480

const DEFAULT_BASIC_ATOM_ELEMENTS = SAMPLE_BASIC_ATOM_ELEMENTS

export default function BasicAtomRenderUnitsPage() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const elementsRef = useRef(DEFAULT_BASIC_ATOM_ELEMENTS)
  const [elements, setElements] = useState(DEFAULT_BASIC_ATOM_ELEMENTS)
  const [editorText, setEditorText] = useState(JSON.stringify(DEFAULT_BASIC_ATOM_ELEMENTS, null, 2))
  const [error, setError] = useState('')
  const [lastButtonId, setLastButtonId] = useState('')

  useEffect(() => {
    elementsRef.current = elements
  }, [elements])

  useEffect(() => {
    if (!svgRef.current) return undefined

    return bindInteractiveBoxDrag(svgRef.current, elementsRef, (nextElements: typeof SAMPLE_BASIC_ATOM_ELEMENTS) => {
      setElements(nextElements)
      setEditorText(JSON.stringify(nextElements, null, 2))
      setError('')
    })
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ id?: string }>
      setLastButtonId(custom.detail?.id || '')
    }

    window.addEventListener('basic-atom-button-click', handler)
    return () => window.removeEventListener('basic-atom-button-click', handler)
  }, [])

  const svgInner = useMemo(() => renderAllElements(elements), [elements])
  const svgMarkup = useMemo(
    () => `<svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">${svgInner}</svg>`,
    [svgInner],
  )

  const handleEditorChange = (value: string) => {
    setEditorText(value)

    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        setElements(parsed)
        setError('')
        return
      }

      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { elements?: unknown }).elements)) {
        setElements((parsed as { elements: typeof SAMPLE_BASIC_ATOM_ELEMENTS }).elements)
        setError('')
        return
      }

      setError('JSON 顶层可以是 elements 数组，或包含 elements 的对象')
      return
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON 解析失败')
    }
  }

  const handleReset = () => {
    const next = JSON.parse(JSON.stringify(DEFAULT_BASIC_ATOM_ELEMENTS))
    setElements(next)
    setEditorText(JSON.stringify(next, null, 2))
    setError('')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editorText)
    } catch {
      setError('复制失败，请手动选择文本')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4 lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-ink)]">6 种基础原子渲染单元</h1>
            <p className="mt-1 text-sm text-[var(--color-body)]">
              这是一个纯原生 SVG 的开发页，支持 line / rect / circle / text / brace / button 的统一渲染与基础拖拽。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              复制 JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={handleReset}>
              恢复示例
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--color-ink)]">elements DSL</div>
              <div className="text-xs text-[var(--color-mute)]">{elements.length} 个元素</div>
            </div>
            <textarea
              value={editorText}
              onChange={(event) => handleEditorChange(event.target.value)}
              spellCheck={false}
              className="mt-3 min-h-[520px] w-full rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-4 py-3 font-mono text-[12px] leading-6 text-[var(--color-ink)] outline-none transition-all focus:border-[var(--color-link)] focus:ring-2 focus:ring-[var(--color-link-bg-soft)]"
            />
            {error && (
              <div className="mt-3 rounded-[16px] border border-[rgba(238,0,0,0.18)] bg-[rgba(238,0,0,0.06)] px-4 py-3 text-sm text-[var(--color-error)]">
                {error}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--color-ink)]">interactive-box</div>
                <div className="mt-1 text-xs text-[var(--color-body)]">
                  固定 700×480，坐标原点在左上角。拖拽只作用于带有 data-drag 的圆形和矩形。
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full bg-[var(--color-canvas-soft)] px-3 py-1 text-xs text-[var(--color-body)]">
                  SVG {SVG_WIDTH} × {SVG_HEIGHT}
                </div>
                <div className="rounded-full bg-[var(--color-link-bg-soft)] px-3 py-1 text-xs text-[var(--color-link)]">
                  {lastButtonId ? `按钮事件：${lastButtonId}` : '点击按钮可派发事件'}
                </div>
              </div>
            </div>

            <div
              id="interactive-box"
              className="mt-4 overflow-auto rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-3"
            >
              <svg
                ref={svgRef}
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                xmlns="http://www.w3.org/2000/svg"
                className="block bg-white"
                dangerouslySetInnerHTML={{ __html: svgInner }}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-sm font-semibold text-[var(--color-ink)]">完整 SVG 输出</div>
            <pre className="mt-3 max-h-[260px] overflow-auto rounded-[20px] bg-[var(--color-canvas-soft)] p-4 text-[12px] leading-6 text-[var(--color-body)]">
              {svgMarkup}
            </pre>
          </div>
        </section>
      </div>
    </div>
  )
}
