import type { ReactNode } from 'react'
import { MHint } from './stageOneBlocks'
import UniversalTapeMatrixLabDiscovery from './UniversalTapeMatrixLabDiscovery'

type ObservationHintData = {
  goal: {
    text: string
    target: string
  }
  known_conditions: Array<{
    text: string
    unit?: string
    value?: string | number
  }>
  hidden_conditions: Array<{
    text: string
  }>
}

type KnownCondition = ObservationHintData['known_conditions'][number]

type QuestionPart =
  | { kind: 'text'; text: string }
  | { kind: 'condition'; text: string; label: string }

export type BasicPageProps = {
  question_text: string
  math_analysis_json: unknown
  logic_analysis_json: unknown
  tutor_analysis_json: unknown
  component_analysis_json?: unknown
  discovery_mode?: 'components' | 'empty'
  hideDiscovery?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function conditionCandidates(condition: KnownCondition) {
  if (condition.value === undefined || condition.value === null) return []
  const value = String(condition.value).trim()
  const unit = condition.unit?.trim() || ''
  const timeInLabel = condition.text.match(/\b\d{1,2}:\d{2}\b/)?.[0]
  return Array.from(new Set([
    unit ? `${value} ${unit}` : '',
    unit ? `${value}${unit}` : '',
    timeInLabel || '',
    value,
  ].filter(Boolean))).sort((left, right) => right.length - left.length)
}

function annotateQuestion(question: string, conditions: KnownCondition[]): QuestionPart[] {
  const used = new Set<number>()
  const parts: QuestionPart[] = []
  let cursor = 0

  while (cursor < question.length) {
    let match: { conditionIndex: number; index: number; text: string } | undefined

    conditions.forEach((condition, conditionIndex) => {
      if (used.has(conditionIndex)) return
      conditionCandidates(condition).forEach((candidate) => {
        const index = question.indexOf(candidate, cursor)
        if (index < 0) return
        if (!match || index < match.index || (index === match.index && candidate.length > match.text.length)) {
          match = { conditionIndex, index, text: candidate }
        }
      })
    })

    if (!match) {
      parts.push({ kind: 'text', text: question.slice(cursor) })
      break
    }
    if (match.index > cursor) parts.push({ kind: 'text', text: question.slice(cursor, match.index) })
    parts.push({ kind: 'condition', text: match.text, label: conditions[match.conditionIndex].text })
    used.add(match.conditionIndex)
    cursor = match.index + match.text.length
  }

  return parts.length > 0 ? parts : [{ kind: 'text', text: question }]
}

function ConditionBox({ text, label }: { text: string; label: string }) {
  return (
    <span className="relative mx-1 inline-block whitespace-nowrap rounded-lg border-2 border-dashed border-[#EF4444] bg-[#FEF2F2] px-2 align-middle font-bold leading-[1.4] text-[#EF4444]">
      {text}
      <span className="absolute left-1/2 top-full z-10 mt-1 inline-flex -translate-x-1/2 flex-col items-center">
        <span className="h-0 w-0 border-x-[5px] border-b-[6px] border-x-transparent border-b-[#EF4444]" />
        <span className="mt-0.5 whitespace-nowrap rounded bg-[#EF4444] px-2 py-0.5 text-[11px] font-bold leading-[1.2] tracking-wide text-white shadow-[0_2px_6px_rgba(239,68,68,0.15)]">
          {label}
        </span>
      </span>
    </span>
  )
}

function AnnotatedQuestion({ question, conditions }: { question: string; conditions: KnownCondition[] }) {
  const parts = annotateQuestion(question, conditions)
  return (
    <p className="m-0 text-left text-base font-medium tracking-[0.5px] text-[#334155]" style={{ lineHeight: 3.6 }}>
      {parts.map((part, index) => part.kind === 'condition' ? (
        <ConditionBox key={`${part.label}-${part.text}-${index}`} text={part.text} label={part.label} />
      ) : (
        <span key={`text-${index}`}>{part.text}</span>
      ))}
    </p>
  )
}

function toObservationHintData(value: unknown, questionText: string): ObservationHintData {
  if (isRecord(value) && isRecord(value.goal) && Array.isArray(value.known_conditions) && Array.isArray(value.hidden_conditions)) {
    return {
      goal: {
        text: typeof value.goal.text === 'string' ? value.goal.text : questionText,
        target: typeof value.goal.target === 'string' ? value.goal.target : '求解目标',
      },
      known_conditions: value.known_conditions
        .filter(isRecord)
        .map((condition) => ({
          text: typeof condition.name === 'string'
            ? condition.name
            : typeof condition.text === 'string'
              ? condition.text
              : '',
          value: typeof condition.value === 'number' || typeof condition.value === 'string'
            ? condition.value
            : undefined,
          unit: typeof condition.unit === 'string' ? condition.unit : '',
        }))
        .filter((condition) => condition.text),
      hidden_conditions: value.hidden_conditions
        .filter(isRecord)
        .map((condition) => ({
          text: typeof condition.text === 'string' ? condition.text : '',
        }))
        .filter((condition) => condition.text),
    }
  }

  return {
    goal: {
      text: questionText || '请先填写题目原文',
      target: '求解目标',
    },
    known_conditions: [],
    hidden_conditions: [],
  }
}

function ThreeZoneLayout({
  observation,
  discovery,
}: {
  observation: ReactNode
  discovery?: ReactNode | null
}) {
  return (
    <div className="grid gap-5 bg-[#FAFAFA] text-[#171717]">
      <section className="rounded-[28px] border border-[#E8E8E8] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="inline-flex rounded-full bg-gradient-to-r from-[#7928CA] to-[#FF0080] px-3 py-1 text-[11px] font-medium text-white">
          1. 观察区
        </div>
        <div className="mt-4">{observation}</div>
      </section>

      {discovery !== null && discovery !== undefined ? (
        <section className="rounded-[28px] border border-[#E8E8E8] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="inline-flex rounded-full bg-gradient-to-r from-[#0070F3] to-[#7928CA] px-3 py-1 text-[11px] font-medium text-white">
            2. 发现区
          </div>
          <div className="mt-4">{discovery}</div>
        </section>
      ) : null}
    </div>
  )
}

export default function BasicPage({
  question_text,
  math_analysis_json,
  logic_analysis_json,
  tutor_analysis_json,
  component_analysis_json,
  discovery_mode = 'components',
  hideDiscovery = false,
}: BasicPageProps) {
  const observationData = toObservationHintData(math_analysis_json, question_text)

  return (
    <ThreeZoneLayout
      observation={(
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#EAEAEA] bg-[#FAFAFA] p-4">
            <div className="text-xs font-medium text-[#888888]">题目原文</div>
            <div className="mt-2 rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] px-5 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-6">
              <AnnotatedQuestion question={question_text} conditions={observationData.known_conditions} />
            </div>
          </div>
          <MHint data={observationData} />
        </div>
      )}
      discovery={hideDiscovery ? null : (
        discovery_mode === 'empty' ? (
          <div className="min-h-[220px]" aria-label="生动演示发现区待完善" />
        ) : (
          <UniversalTapeMatrixLabDiscovery
            logicAnalysisJson={logic_analysis_json}
            componentAnalysisJson={component_analysis_json}
            tutorAnalysisJson={tutor_analysis_json}
          />
        )
      )}
    />
  )
}

export { ThreeZoneLayout }
