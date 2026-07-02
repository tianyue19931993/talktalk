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

export default function UniversalTapeMatrixLabDiscovery({
  logicAnalysisJson,
  componentAnalysisJson,
}: DiscoveryProps) {
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
