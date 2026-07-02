import Combine, { type CombineScript } from '../admin/Combine'
import Partition, { type PartitionScript } from '../admin/Partition'
import Replicate, { type ReplicateScript } from '../admin/Replicate'
import Separate, { type SeparateScript } from '../admin/Separate'
import UniversalTapeMatrixLabCompare, {
  type CompareModelData,
} from '../admin/UniversalTapeMatrixLabCompare'
import { GridGeometryPlayer, type GridGeometryModelData } from '../admin/UniversalTapeMatrixLabGridGeometry'
import UniversalTapeMatrixLabMultiplyDivide, {
  type SegmentModelProps,
} from '../admin/UniversalTapeMatrixLabMultiplyDivide'
import { PointIntervalPlayer, type PointIntervalModelData } from '../admin/UniversalTapeMatrixLabPointInterval'
import { SegmentChainPlayer, type ChainModelData } from '../admin/UniversalTapeMatrixLabSegmentChain'

type DiscoveryProps = {
  logicAnalysisJson: unknown
  componentAnalysisJson: unknown
  tutorAnalysisJson: unknown
}

type ArithmeticScript = CombineScript | SeparateScript | ReplicateScript | PartitionScript

type ChallengeStep = {
  step: number
  question: string
  hint: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getComponentName(logicAnalysisJson: unknown): string {
  if (!isRecord(logicAnalysisJson) || !Array.isArray(logicAnalysisJson.logic_blocks)) return ''
  const firstBlock = logicAnalysisJson.logic_blocks.find(isRecord)
  return typeof firstBlock?.component === 'string' ? firstBlock.component.trim() : ''
}

function hasBaseModelData(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Array.isArray(value.layers) && Array.isArray(value.timeline)
}

function toStepNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toArithmeticScripts(value: unknown): ArithmeticScript[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .filter((item) => ['Combine', 'Separate', 'Replicate', 'Partition'].includes(String(item.component)))
    .map((item, index) => ({ item: item as unknown as ArithmeticScript, index }))
    .sort((left, right) => {
      const leftStep = toStepNumber(left.item.step_info?.current, left.index + 1)
      const rightStep = toStepNumber(right.item.step_info?.current, right.index + 1)
      return leftStep - rightStep || left.index - right.index
    })
    .map(({ item }) => item)
}

function toChallengeSteps(value: unknown): ChallengeStep[] {
  if (!isRecord(value) || !Array.isArray(value.challenge_steps)) return []

  return value.challenge_steps
    .filter(isRecord)
    .map((item, index) => ({
      step: toStepNumber(item.step, index + 1),
      question: typeof item.question === 'string' ? item.question.trim() : '',
      hint: typeof item.hint === 'string' ? item.hint.trim() : '',
    }))
}

function ArithmeticBlock({ script, challenge }: { script: ArithmeticScript; challenge?: ChallengeStep }) {
  const step = toStepNumber(script.step_info?.current, 1)
  let component = null

  switch (script.component) {
    case 'Combine':
      component = <Combine componentAnalysisJson={[script]} />
      break
    case 'Separate':
      component = <Separate componentAnalysisJson={[script]} />
      break
    case 'Replicate':
      component = <Replicate componentAnalysisJson={[script]} />
      break
    case 'Partition':
      component = <Partition componentAnalysisJson={[script]} />
      break
  }

  return (
    <section className="rounded-[24px] border border-[#E8E8E8] bg-white p-4 sm:p-5">
      <div className="mb-5 rounded-[20px] border border-[#DCE8F8] bg-[#F8FBFF] p-4">
        <div className="flex items-start gap-3">
          <span className="shrink-0 rounded-full bg-[#0070F3] px-3 py-1 text-[11px] font-bold text-white">
            步骤 {step}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-6 text-[#171717]">
              {challenge?.question || '请观察下面的互动，想一想这一步该怎样解决？'}
            </div>
            {challenge?.hint && (
              <div className="mt-1 text-xs leading-5 text-[#777777]">
                提示：{challenge.hint}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-center overflow-x-auto pb-1">
        {component}
      </div>
    </section>
  )
}

export default function UniversalTapeMatrixLabDiscovery({
  logicAnalysisJson,
  componentAnalysisJson,
  tutorAnalysisJson,
}: DiscoveryProps) {
  const arithmeticScripts = toArithmeticScripts(componentAnalysisJson)
  const challengeSteps = toChallengeSteps(tutorAnalysisJson)

  if (arithmeticScripts.length > 0) {
    return (
      <div className="grid gap-5">
        {arithmeticScripts.map((script, index) => {
          const step = toStepNumber(script.step_info?.current, index + 1)
          const challenge = challengeSteps.find((item) => item.step === step)
          return (
            <ArithmeticBlock
              key={`${step}-${script.component}-${index}`}
              script={script}
              challenge={challenge}
            />
          )
        })}
      </div>
    )
  }

  const componentName = getComponentName(logicAnalysisJson)

  if (!hasBaseModelData(componentAnalysisJson)) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-[#D8D8D8] bg-[#FAFAFA] px-5 text-center text-sm text-[#888888]">
        互动组件配置暂不可用
      </div>
    )
  }

  switch (componentName) {
    case 'UniversalTapeMatrixLab-multiply_divide':
      return (
        <UniversalTapeMatrixLabMultiplyDivide
          modelData={componentAnalysisJson as SegmentModelProps['modelData']}
        />
      )
    case 'UniversalTapeMatrixLab-compare':
      return <UniversalTapeMatrixLabCompare modelData={componentAnalysisJson as unknown as CompareModelData} />
    case 'UniversalTapeMatrixLab-segment_chain':
      return <SegmentChainPlayer modelData={componentAnalysisJson as unknown as ChainModelData} />
    case 'UniversalTapeMatrixLab-point_interval':
      return <PointIntervalPlayer modelData={componentAnalysisJson as unknown as PointIntervalModelData} />
    case 'UniversalTapeMatrixLab-grid_geometry':
      if (!isRecord(componentAnalysisJson.grid)) break
      return <GridGeometryPlayer modelData={componentAnalysisJson as unknown as GridGeometryModelData} />
    default:
      break
  }

  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-[#D8D8D8] bg-[#FAFAFA] px-5 text-center text-sm text-[#888888]">
      暂不支持组件：{componentName || '未指定'}
    </div>
  )
}
