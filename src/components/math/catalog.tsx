import type { LogicBlock } from './mathTypes'

export type MathComponentCatalogItem = {
  mathComponent: string
  title: string
  blocks: string[]
  description: string
  block: LogicBlock
}

export const MATH_COMPONENT_CATALOG: MathComponentCatalogItem[] = [
  {
    mathComponent: 'TotalAmountComponent',
    title: 'TotalAmountComponent',
    blocks: ['求总量'],
    description: '用总量关系把几份内容合在一起看。',
    block: {
      step: 1,
      type: '求总量',
      component: 'TotalAmountComponent',
      math_object: '每份8个，共3份',
      visual_object: '小熊分糖',
    },
  },
  {
    mathComponent: 'PartitionComponent',
    title: 'PartitionComponent',
    blocks: ['求每份数', '求份数'],
    description: '把整体拆开，观察分组后的样子。',
    block: {
      step: 1,
      type: '求份数',
      component: 'PartitionComponent',
      math_object: '220瓶橙汁，每次24瓶',
      visual_object: '橙汁、搬运',
    },
  },
  {
    mathComponent: 'DifferenceComponent',
    title: 'DifferenceComponent',
    blocks: ['求差', '比较大小'],
    description: '把两个量并排比较，突出差出来的部分。',
    block: {
      step: 1,
      type: '求差',
      component: 'DifferenceComponent',
      math_object: '两盒彩笔分别有18支和12支',
      visual_object: '彩笔、对比',
    },
  },
  {
    mathComponent: 'RemainderComponent',
    title: 'RemainderComponent',
    blocks: ['求剩余'],
    description: '把完整部分和剩余尾巴分开看。',
    block: {
      step: 1,
      type: '求剩余',
      component: 'RemainderComponent',
      math_object: '买了30颗糖，分出去18颗',
      visual_object: '糖果、分发',
    },
  },
  {
    mathComponent: 'MultipleComponent',
    title: 'MultipleComponent',
    blocks: ['求倍数', '求一个数的几倍'],
    description: '把同一个单位反复出现，强调倍数关系。',
    block: {
      step: 1,
      type: '求倍数',
      component: 'MultipleComponent',
      math_object: '3盒彩纸，每盒6张',
      visual_object: '彩纸、重复',
    },
  },
  {
    mathComponent: 'UnitConvertComponent',
    title: 'UnitConvertComponent',
    blocks: ['统一时间单位', '统一长度单位', '统一面积单位', '统一质量单位'],
    description: '把不同单位先统一到同一把尺上。',
    block: {
      step: 1,
      type: '统一时间单位',
      component: 'UnitConvertComponent',
      math_object: '2小时30分和150分钟',
      visual_object: '时钟、换算',
    },
  },
  {
    mathComponent: 'PointSegmentComponent',
    title: 'PointSegmentComponent',
    blocks: ['求间隔段数', '求棵数（两端都种）', '求棵数（封闭图形）', '识别为封闭图形植树'],
    description: '点和段按顺序摆出来。',
    block: {
      step: 1,
      type: '求间隔段数',
      component: 'PointSegmentComponent',
      math_object: '两端都栽树，中间隔4米',
      visual_object: '点线、树木',
    },
  },
  {
    mathComponent: 'PriceQuantityComponent',
    title: 'PriceQuantityComponent',
    blocks: ['求总价', '求单价', '求数量'],
    description: '单价、数量、总价三者并排展示。',
    block: {
      step: 1,
      type: '求总价',
      component: 'PriceQuantityComponent',
      math_object: '4盒彩笔，每盒12元',
      visual_object: '购物、价签',
    },
  },
  {
    mathComponent: 'DistanceSpeedTimeComponent',
    title: 'DistanceSpeedTimeComponent',
    blocks: ['求路程', '求速度', '求时间', '求经过时间'],
    description: '路程、速度、时间建立连接。',
    block: {
      step: 1,
      type: '求路程',
      component: 'DistanceSpeedTimeComponent',
      math_object: '每小时5千米，走了3小时',
      visual_object: '路线、公交',
    },
  },
  {
    mathComponent: 'GeometryAreaComponent',
    title: 'GeometryAreaComponent',
    blocks: ['求长方形面积', '求正方形面积', '求长方形周长', '求正方形周长', '求剩余部分面积', '求各部分面积之和', '求平移后周长', '分割成标准图形', '补成完整图形', '识别为L形', '识别为凹形'],
    description: '先看图形轮廓，再看边和面。',
    block: {
      step: 1,
      type: '求长方形面积',
      component: 'GeometryAreaComponent',
      math_object: '长方形长8米宽5米',
      visual_object: '图形、面积',
    },
  },
  {
    mathComponent: 'TimeComponent',
    title: 'TimeComponent',
    blocks: ['求经过时间', '求开始时刻', '求结束时刻'],
    description: '把起点和终点放到同一条时间线上。',
    block: {
      step: 1,
      type: '求经过时间',
      component: 'TimeComponent',
      math_object: '出发时刻9:00到11:15的时间差',
      visual_object: '钟表',
    },
  },
  {
    mathComponent: 'RoundingComponent',
    title: 'RoundingComponent',
    blocks: ['进一法取整', '去尾法取整'],
    description: '先看余数，再决定怎么处理尾巴。',
    block: {
      step: 1,
      type: '进一法取整',
      component: 'RoundingComponent',
      math_object: '商9余4',
      visual_object: '搬运次数',
    },
  },
  {
    mathComponent: 'GenericLogicComponent',
    title: 'GenericLogicComponent',
    blocks: ['其他逻辑块'],
    description: '兜底通用组件，先保持可预览。',
    block: {
      step: 1,
      type: '通用逻辑块',
      component: 'GenericLogicComponent',
      math_object: '其他关系',
      visual_object: '通用素材',
    },
  },
]
