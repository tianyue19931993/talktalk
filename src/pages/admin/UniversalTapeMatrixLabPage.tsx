import { useMemo, useState } from 'react'
import Combine from '../../components/admin/Combine'
import Partition from '../../components/admin/Partition'
import Replicate from '../../components/admin/Replicate'
import Separate from '../../components/admin/Separate'
import UniversalTapeMatrixLabCompare from '../../components/admin/UniversalTapeMatrixLabCompare'
import { GridGeometryPlayer } from '../../components/admin/UniversalTapeMatrixLabGridGeometry'
import UniversalTapeMatrixLabMultiplyDivide from '../../components/admin/UniversalTapeMatrixLabMultiplyDivide'
import { PointIntervalPlayer } from '../../components/admin/UniversalTapeMatrixLabPointInterval'
import { SegmentChainPlayer } from '../../components/admin/UniversalTapeMatrixLabSegmentChain'

type LabTab = {
  name: string
  note: string
}

const tabs: LabTab[] = [
  {
    name: 'Combine',
    note: '加法组件：拖拽两个加数色块，在目标卡槽中吸附合并并展示结果。',
  },
  {
    name: 'Separate',
    note: '减法组件：点击剪刀裁去减数部分，观察剩余的差。',
  },
  {
    name: 'Partition',
    note: '除法组件：向上拖动切刀，将总量均分并观察每份的数量。',
  },
  {
    name: 'Replicate',
    note: '乘法组件：向上拖动倍数叠加舱，逐个复制相同数量并汇总乘积。',
  },
  {
    name: 'UniversalTapeMatrixLab-multiply_divide',
    note: '认知模型：\n单量乘以数量等于总量。 multiply_divide (等分/矩阵模式)',
  },
  {
    name: 'UniversalTapeMatrixLab-compare',
    note: '认知模型：\n状态 A vs 状态 B从而暴露出Delta(差量)。 compare (多线对比/消消乐模式)',
  },
  {
    name: 'UniversalTapeMatrixLab-segment_chain',
    note: '认知模型：\n初始状态到消耗/事件1 到消耗/事件2到最终剩余（时间轴或空间轴的不可逆推进）。  segment_chain (串联接力轴/状态变迁模式)',
  },
  {
    name: 'UniversalTapeMatrixLab-point_interval',
    note: '认知模型：连续的“空间/时间”与离散的“个体/粒子”之间的拓扑映射（也就是数学上的“抽屉原理”和“边界效应”）。 point_interval (点段位置/拓扑离散模式)',
  },
  {
    name: 'UniversalTapeMatrixLab-grid_geometry',
    note: '认知模型：\n从一维（线）跨越到二维（面），表达两个独立维度的乘积或空间分布。  grid_geometry (2D空间网格模式 / 笛卡尔空间引擎)',
  },
]

export default function UniversalTapeMatrixLabPage() {
  const [activeTab, setActiveTab] = useState<LabTab['name']>(tabs[0].name)

  const currentTab = useMemo(
    () => tabs.find((tab) => tab.name === activeTab) || tabs[0],
    [activeTab],
  )

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[var(--color-canvas)] p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
          <div className="text-lg font-semibold text-[var(--color-ink)]">UniversalTapeMatrixLab</div>
          <div className="mt-1 text-sm text-[var(--color-body)]">
            先把 5 个 Tab 的壳子搭起来，后续再逐个往里面填组件。
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = tab.name === activeTab
              return (
                <button
                  key={tab.name}
                  type="button"
                  onClick={() => setActiveTab(tab.name)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--color-link-bg-soft)] text-[var(--color-link)] ring-1 ring-[var(--color-link)]/15'
                      : 'bg-[var(--color-canvas-soft)] text-[var(--color-body)] hover:bg-[var(--color-hairline)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {tab.name}
                </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
            <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--color-body)]">
              {currentTab.note}
            </div>
          </div>

          <div className="mt-4 min-h-[320px] rounded-[24px] border border-dashed border-[var(--color-hairline)] bg-white p-4">
            {currentTab.name === 'Combine' ? (
              <div className="flex justify-center">
                <Combine />
              </div>
            ) : currentTab.name === 'Separate' ? (
              <div className="flex justify-center">
                <Separate />
              </div>
            ) : currentTab.name === 'Partition' ? (
              <div className="flex justify-center">
                <Partition />
              </div>
            ) : currentTab.name === 'Replicate' ? (
              <div className="flex justify-center">
                <Replicate />
              </div>
            ) : currentTab.name === 'UniversalTapeMatrixLab-multiply_divide' ? (
              <div className="flex justify-center">
                <UniversalTapeMatrixLabMultiplyDivide />
              </div>
            ) : currentTab.name === 'UniversalTapeMatrixLab-compare' ? (
              <div className="flex justify-center">
                <UniversalTapeMatrixLabCompare />
              </div>
            ) : currentTab.name === 'UniversalTapeMatrixLab-segment_chain' ? (
              <div className="flex justify-center">
                <SegmentChainPlayer />
              </div>
            ) : currentTab.name === 'UniversalTapeMatrixLab-point_interval' ? (
              <div className="flex justify-center">
                <PointIntervalPlayer />
              </div>
            ) : currentTab.name === 'UniversalTapeMatrixLab-grid_geometry' ? (
              <div className="flex justify-center">
                <GridGeometryPlayer />
              </div>
            ) : (
              <>
                <div className="text-sm font-medium text-[var(--color-ink)]">
                  {currentTab.name}
                </div>
                <div className="mt-2 text-xs text-[var(--color-mute)]">
                  这里先留空，后续你可以直接往这个 Tab 里加组件。
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
