import { useEffect, useMemo, useRef } from 'react'
import {
  bindInteractiveBoxDrag,
  renderAllElements,
  type BasicAtomElement,
} from '../../lib/basicAtomRenderUnits'

export interface MathBlockRule {
  trigger: 'click'
  targetId: string
  stepIndex: number
  showElementIds: string[]
  stepText: string
  logic: string
  updateElements: unknown[]
}

export interface MathBlockTestDsl {
  interactionType: 'button'
  elements: BasicAtomElement[]
  rules: MathBlockRule[]
  finalCalculation: {
    formula: string
    answer: string
  }
}

interface MathBlockRenderPreviewProps {
  dsl: MathBlockTestDsl
  stepCount: number
}

function buildVisibleElementIds(dsl: MathBlockTestDsl, stepCount: number) {
  const visibleIds = new Set<string>()

  dsl.elements.forEach((element) => {
    if (element.visible !== false) {
      visibleIds.add(element.id)
    }
  })

  dsl.rules.slice(0, stepCount).forEach((rule) => {
    rule.showElementIds.forEach((id) => visibleIds.add(id))
  })

  return visibleIds
}

export function MathBlockRenderPreview({ dsl, stepCount }: MathBlockRenderPreviewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const elementsRef = useRef<BasicAtomElement[]>(dsl.elements)

  const visibleIds = useMemo(() => buildVisibleElementIds(dsl, stepCount), [dsl, stepCount])

  const renderedElements = useMemo(
    () =>
      dsl.elements.map((element) => ({
        ...element,
        visible: visibleIds.has(element.id) ? true : element.visible !== false,
      })),
    [dsl.elements, visibleIds],
  )

  const svgInner = useMemo(() => renderAllElements(renderedElements), [renderedElements])

  useEffect(() => {
    elementsRef.current = dsl.elements
  }, [dsl.elements])

  useEffect(() => {
    if (!svgRef.current) return undefined
    return bindInteractiveBoxDrag(svgRef.current, elementsRef, () => {})
  }, [])

  return (
    <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
      <div className="text-sm font-semibold text-[var(--color-ink)]">渲染预览</div>

      <div
        id="interactive-box"
        className="mt-4 overflow-hidden rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-3"
      >
        <svg
          ref={svgRef}
          viewBox="0 0 700 480"
          xmlns="http://www.w3.org/2000/svg"
          className="block h-auto w-full max-w-full bg-white"
          dangerouslySetInnerHTML={{ __html: svgInner }}
        />
      </div>
    </div>
  )
}
