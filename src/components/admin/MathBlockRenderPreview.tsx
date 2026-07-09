import { useEffect, useMemo, useRef, useState } from 'react'
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
  dsl?: MathBlockTestDsl
  stepCount?: number
  lineAnalysisJson?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
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

function extractElements(lineAnalysisJson: unknown): BasicAtomElement[] {
  if (Array.isArray(lineAnalysisJson)) {
    return lineAnalysisJson.filter(isRecord) as unknown as BasicAtomElement[]
  }

  if (!isRecord(lineAnalysisJson)) return []

  if (Array.isArray(lineAnalysisJson.elements)) {
    return lineAnalysisJson.elements.filter(isRecord) as unknown as BasicAtomElement[]
  }

  if (isRecord(lineAnalysisJson.dsl) && Array.isArray(lineAnalysisJson.dsl.elements)) {
    return lineAnalysisJson.dsl.elements.filter(isRecord) as unknown as BasicAtomElement[]
  }

  if (isRecord(lineAnalysisJson.data) && Array.isArray(lineAnalysisJson.data.elements)) {
    return lineAnalysisJson.data.elements.filter(isRecord) as unknown as BasicAtomElement[]
  }

  return []
}

function extractDsl(lineAnalysisJson: unknown): MathBlockTestDsl | null {
  if (!isRecord(lineAnalysisJson)) return null
  if (!Array.isArray(lineAnalysisJson.elements) || !Array.isArray(lineAnalysisJson.rules)) return null

  return {
    interactionType: lineAnalysisJson.interactionType === 'button' ? 'button' : 'button',
    elements: extractElements(lineAnalysisJson),
    rules: lineAnalysisJson.rules.filter(isRecord).map((rule) => ({
      trigger: 'click',
      targetId: typeof rule.targetId === 'string' ? rule.targetId : 'nextBtn',
      stepIndex: typeof rule.stepIndex === 'number' ? rule.stepIndex : Number(rule.stepIndex) || 1,
      showElementIds: Array.isArray(rule.showElementIds)
        ? rule.showElementIds.filter((item): item is string => typeof item === 'string')
        : [],
      stepText: typeof rule.stepText === 'string' ? rule.stepText : '',
      logic: typeof rule.logic === 'string' ? rule.logic : '',
      updateElements: Array.isArray(rule.updateElements) ? rule.updateElements : [],
    })),
    finalCalculation: {
      formula: isRecord(lineAnalysisJson.finalCalculation) && typeof lineAnalysisJson.finalCalculation.formula === 'string'
        ? lineAnalysisJson.finalCalculation.formula
        : '',
      answer: isRecord(lineAnalysisJson.finalCalculation) && typeof lineAnalysisJson.finalCalculation.answer === 'string'
        ? lineAnalysisJson.finalCalculation.answer
        : '',
    },
  }
}

export function MathBlockRenderPreview({ dsl, stepCount = 0, lineAnalysisJson }: MathBlockRenderPreviewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [lineAnalysisStepCount, setLineAnalysisStepCount] = useState(0)
  const lineAnalysisDsl = useMemo(() => extractDsl(lineAnalysisJson), [lineAnalysisJson])
  const normalizedElements = useMemo(() => {
    if (lineAnalysisJson !== undefined) {
      return extractElements(lineAnalysisJson)
    }
    return dsl?.elements || []
  }, [dsl?.elements, lineAnalysisJson])

  const elementsRef = useRef<BasicAtomElement[]>(normalizedElements)

  const visibleIds = useMemo(() => {
    if (lineAnalysisDsl) return buildVisibleElementIds(lineAnalysisDsl, lineAnalysisStepCount)
    if (!dsl) return new Set<string>()
    return buildVisibleElementIds(dsl, stepCount)
  }, [dsl, stepCount, lineAnalysisDsl, lineAnalysisStepCount])

  const renderedElements = useMemo(
    () => {
      if (lineAnalysisDsl) {
        return lineAnalysisDsl.elements.map((element) => ({
          ...element,
          visible: visibleIds.has(element.id) ? true : element.visible !== false,
        }))
      }

      if (lineAnalysisJson !== undefined) {
        return normalizedElements
      }

      if (!dsl) return []

      return dsl.elements.map((element) => ({
        ...element,
        visible: visibleIds.has(element.id) ? true : element.visible !== false,
      }))
    },
    [dsl, lineAnalysisJson, normalizedElements, visibleIds],
  )

  const svgInner = useMemo(() => renderAllElements(renderedElements), [renderedElements])

  useEffect(() => {
    elementsRef.current = renderedElements
  }, [renderedElements])

  useEffect(() => {
    setLineAnalysisStepCount(0)
  }, [lineAnalysisJson])

  useEffect(() => {
    if (!lineAnalysisDsl) return undefined

    const handleButtonClick = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const buttonId = customEvent.detail?.id
      if (!buttonId) return

      const nextRuleIndex = lineAnalysisStepCount
      const nextRule = lineAnalysisDsl.rules[nextRuleIndex]
      if (!nextRule || nextRule.targetId !== buttonId) return

      setLineAnalysisStepCount((current) => Math.min(current + 1, lineAnalysisDsl.rules.length))
    }

    window.addEventListener('basic-atom-button-click', handleButtonClick as EventListener)
    return () => window.removeEventListener('basic-atom-button-click', handleButtonClick as EventListener)
  }, [lineAnalysisDsl, lineAnalysisStepCount])

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
