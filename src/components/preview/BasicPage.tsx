import type { ReactNode } from 'react'
import { MHint, MInfo } from './stageOneBlocks'
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

type ChallengeInfoData = {
  challenge_steps: Array<{
    step?: number
    hint: string
    question: string
    logic_type?: string
  }>
}

export type BasicPageProps = {
  question_text: string
  math_analysis_json: unknown
  logic_analysis_json: unknown
  tutor_analysis_json: unknown
  component_analysis_json?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
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

function toChallengeInfoData(value: unknown): ChallengeInfoData {
  if (isRecord(value) && Array.isArray(value.challenge_steps)) {
    return value as ChallengeInfoData
  }

  return {
    challenge_steps: [],
  }
}

function ThreeZoneLayout({
  observation,
  discovery,
  challenge,
}: {
  observation: ReactNode
  discovery: ReactNode
  challenge: ReactNode
}) {
  return (
    <div className="grid gap-5 bg-[#FAFAFA] text-[#171717]">
      <section className="rounded-[28px] border border-[#E8E8E8] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="inline-flex rounded-full bg-gradient-to-r from-[#7928CA] to-[#FF0080] px-3 py-1 text-[11px] font-medium text-white">
          1. 观察区
        </div>
        <div className="mt-4">{observation}</div>
      </section>

      <section className="rounded-[28px] border border-[#E8E8E8] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="inline-flex rounded-full bg-gradient-to-r from-[#0070F3] to-[#7928CA] px-3 py-1 text-[11px] font-medium text-white">
          2. 发现区
        </div>
        <div className="mt-4">{discovery}</div>
      </section>

      <section className="rounded-[28px] border border-[#E8E8E8] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="inline-flex rounded-full bg-gradient-to-r from-[#7928CA] to-[#FF0080] px-3 py-1 text-[11px] font-medium text-white">
          3. 挑战区
        </div>
        <div className="mt-4">{challenge}</div>
      </section>
    </div>
  )
}

export default function BasicPage({
  question_text,
  math_analysis_json,
  logic_analysis_json,
  tutor_analysis_json,
  component_analysis_json,
}: BasicPageProps) {
  const observationData = toObservationHintData(math_analysis_json, question_text)
  const challengeData = toChallengeInfoData(tutor_analysis_json)

  return (
    <ThreeZoneLayout
      observation={(
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#EAEAEA] bg-[#FAFAFA] p-4">
            <div className="text-xs font-medium text-[#888888]">题目原文</div>
            <div className="mt-2 text-sm leading-7 text-[#171717] whitespace-pre-wrap">
              {question_text}
            </div>
          </div>

          <MHint data={observationData} />
        </div>
      )}
      discovery={(
        <UniversalTapeMatrixLabDiscovery
          logicAnalysisJson={logic_analysis_json}
          componentAnalysisJson={component_analysis_json}
        />
      )}
      challenge={(
        <MInfo data={challengeData} />
      )}
    />
  )
}

export { ThreeZoneLayout }
