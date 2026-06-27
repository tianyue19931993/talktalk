import type { LogicBlock } from './mathTypes'

export type VisualMeta = {
  raw: string
  tokens: string[]
  emoji: string
}

export type MathTone = 'purple' | 'pink' | 'blue' | 'green' | 'amber'

export function splitVisualObject(value: string) {
  return String(value || '')
    .split(/[,，、\/\n；;·]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function pickVisualEmoji(value: string) {
  const text = String(value || '')
  const emojiRules: Array<{ keywords: string[]; emoji: string }> = [
    { keywords: ['橙汁', '果汁', '饮料', '瓶', '搬运'], emoji: '🧃' },
    { keywords: ['课桌', '椅子', '桌子', '椅', '家具'], emoji: '🪑' },
    { keywords: ['糖', '糖果', '零食'], emoji: '🍬' },
    { keywords: ['钱', '元', '价格', '价签', '购物'], emoji: '💰' },
    { keywords: ['钟表', '时间', '时刻', '分钟', '小时'], emoji: '⏰' },
    { keywords: ['路程', '速度', '行走', '路线', '交通', '运输'], emoji: '🚗' },
    { keywords: ['图形', '面积', '周长', '长方形', '正方形', '几何'], emoji: '📐' },
    { keywords: ['单位', '换算', '统一'], emoji: '🔁' },
    { keywords: ['点', '段', '线', '树'], emoji: '📏' },
    { keywords: ['彩笔', '彩纸', '卡片', '重复'], emoji: '🧩' },
  ]

  for (const rule of emojiRules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.emoji
    }
  }

  return '🧩'
}

export function buildVisualMeta(raw: string): VisualMeta {
  const tokens = splitVisualObject(raw)
  return {
    raw,
    tokens: tokens.length > 0 ? tokens : ['素材'],
    emoji: pickVisualEmoji(raw),
  }
}

const toneByComponent: Record<string, MathTone> = {
  TotalAmountComponent: 'purple',
  PartitionComponent: 'blue',
  SumComponent: 'purple',
  DifferenceComponent: 'pink',
  RemainderComponent: 'green',
  MultipleComponent: 'purple',
  FractionComponent: 'amber',
  AverageComponent: 'blue',
  UnitConvertComponent: 'blue',
  PointSegmentComponent: 'purple',
  PriceQuantityComponent: 'pink',
  DistanceSpeedTimeComponent: 'blue',
  GeometryAreaComponent: 'green',
  TimeComponent: 'amber',
  RoundingComponent: 'amber',
  PatternCycleComponent: 'purple',
  ReverseComponent: 'blue',
  CompareComponent: 'pink',
  EstimateComponent: 'amber',
  NumberSenseComponent: 'purple',
  AgeComponent: 'green',
  GenericLogicComponent: 'purple',
}

export function getToneForComponent(component: string): MathTone {
  return toneByComponent[component] || 'purple'
}

export function splitMathObject(value: string) {
  return String(value || '')
    .split(/[,，、\/\n；;·]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}
