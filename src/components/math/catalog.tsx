import type { ComponentType } from 'react'
import type { MathAnalysis, MathBlock, MathComponentMode, MathComponentProps } from './mathTypes'
import { DifferenceComponent } from './DifferenceComponent'
import { DistanceSpeedTimeComponent } from './DistanceSpeedTimeComponent'
import { GenericLogicComponent } from './GenericLogicComponent'
import { GeometryAreaComponent } from './GeometryAreaComponent'
import { MultipleComponent } from './MultipleComponent'
import { PartitionComponent } from './PartitionComponent'
import { PointSegmentComponent } from './PointSegmentComponent'
import { PriceQuantityComponent } from './PriceQuantityComponent'
import { RemainderComponent } from './RemainderComponent'
import { TotalAmountComponent } from './TotalAmountComponent'
import { UnitConvertComponent } from './UnitConvertComponent'

export type MathComponentCatalogItem = {
  mathComponent: string
  title: string
  blocks: string[]
  description: string
  component: ComponentType<MathComponentProps>
  block: MathBlock
  mathAnalysis: MathAnalysis
  mode: MathComponentMode
}

export const MATH_COMPONENT_CATALOG: MathComponentCatalogItem[] = [
  {
    mathComponent: 'TotalAmountComponent',
    title: 'TotalAmountComponent',
    blocks: ['求总量'],
    description: '用乘法把每份数和份数组合成总量。',
    component: TotalAmountComponent,
    block: { type: '求总量', subject: '小熊分糖', math_component: 'TotalAmountComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '每份有 8 个' }, { text: '一共有 3 份' }],
      goal: { text: '求总量' },
    },
    mode: 'discover',
  },
  {
    mathComponent: 'PartitionComponent',
    title: 'PartitionComponent',
    blocks: ['求每份数', '求份数'],
    description: '把总量平均分开，强调“分成一样多”。',
    component: PartitionComponent,
    block: { type: '求每份数', subject: '糖果分装', math_component: 'PartitionComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '总量已知' }, { text: '要分成若干份' }],
      goal: { text: '求每份数' },
    },
    mode: 'discover',
  },
  {
    mathComponent: 'DifferenceComponent',
    title: 'DifferenceComponent',
    blocks: ['求差', '比较大小'],
    description: '把两个量放在一起比较，突出差出来的那一段。',
    component: DifferenceComponent,
    block: { type: '求差', subject: '两个纸条', math_component: 'DifferenceComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '有两个可比较的量' }],
      goal: { text: '找出差额' },
    },
    mode: 'explain',
  },
  {
    mathComponent: 'RemainderComponent',
    title: 'RemainderComponent',
    blocks: ['求剩余'],
    description: '展示“总量减去已用部分”等于剩余。',
    component: RemainderComponent,
    block: { type: '求剩余', subject: '剩下的糖', math_component: 'RemainderComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '总数已知' }, { text: '一部分已被拿走' }],
      goal: { text: '求剩余' },
    },
    mode: 'discover',
  },
  {
    mathComponent: 'MultipleComponent',
    title: 'MultipleComponent',
    blocks: ['求倍数', '求一个数的几倍'],
    description: '强调“一个数是另一个数的几倍”。',
    component: MultipleComponent,
    block: { type: '求倍数', subject: '两组数量', math_component: 'MultipleComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '基础单位已知' }],
      goal: { text: '看出倍数关系' },
    },
    mode: 'discover',
  },
  {
    mathComponent: 'UnitConvertComponent',
    title: 'UnitConvertComponent',
    blocks: ['统一时间单位', '统一长度单位', '统一面积单位', '统一质量单位'],
    description: '把不同单位统一到同一把尺上。',
    component: UnitConvertComponent,
    block: { type: '统一单位', subject: '长度 / 时间 / 质量', math_component: 'UnitConvertComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '单位不一致' }],
      goal: { text: '统一单位后再处理' },
    },
    mode: 'review',
  },
  {
    mathComponent: 'PointSegmentComponent',
    title: 'PointSegmentComponent',
    blocks: ['求间隔段数', '求棵数（两端都种）', '求棵数（封闭图形）', '识别为封闭图形植树'],
    description: '点和段的关系一眼看见。',
    component: PointSegmentComponent,
    block: { type: '点段关系', subject: '路边树 / 点线关系', math_component: 'PointSegmentComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '点数和段数有关' }],
      goal: { text: '看清点段关系' },
    },
    mode: 'discover',
  },
  {
    mathComponent: 'PriceQuantityComponent',
    title: 'PriceQuantityComponent',
    blocks: ['求总价', '求单价', '求数量'],
    description: '单价、数量、总价三者互相牵引。',
    component: PriceQuantityComponent,
    block: { type: '单价数量总价', subject: '购物场景', math_component: 'PriceQuantityComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '单价和数量有关' }],
      goal: { text: '理解价格关系' },
    },
    mode: 'challenge',
  },
  {
    mathComponent: 'DistanceSpeedTimeComponent',
    title: 'DistanceSpeedTimeComponent',
    blocks: ['求路程', '求速度', '求时间', '求经过时间'],
    description: '路程、速度、时间三者的关系展示。',
    component: DistanceSpeedTimeComponent,
    block: { type: '路程速度时间', subject: '行走 / 运输', math_component: 'DistanceSpeedTimeComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '速度、时间、路程有关' }],
      goal: { text: '看清三者关系' },
    },
    mode: 'explain',
  },
  {
    mathComponent: 'GeometryAreaComponent',
    title: 'GeometryAreaComponent',
    blocks: ['求长方形面积', '求正方形面积', '求长方形周长', '求正方形周长', '求剩余部分面积', '求各部分面积之和', '求平移后周长', '分割成标准图形', '补成完整图形', '识别为L形', '识别为凹形'],
    description: '基础几何关系，先看形，再看量。',
    component: GeometryAreaComponent,
    block: { type: '面积 / 周长', subject: '图形题', math_component: 'GeometryAreaComponent' },
    mathAnalysis: {
      known_conditions: [{ text: '图形的边或面积有关' }],
      goal: { text: '观察面积或周长关系' },
    },
    mode: 'discover',
  },
  {
    mathComponent: 'GenericLogicComponent',
    title: 'GenericLogicComponent',
    blocks: ['其他逻辑块'],
    description: '兜底通用组件，先保持结构一致。',
    component: GenericLogicComponent,
    block: { type: '通用逻辑块', subject: '无法精确归类的题目', math_component: 'GenericLogicComponent' },
    mathAnalysis: {
      goal: { text: '保持可预览、可扩展' },
    },
    mode: 'review',
  },
]
