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

const componentNarrationMap: Record<string, string> = {
  TotalAmountComponent: '把每份数和份数组合起来，看成一个整体的总量。',
  PartitionComponent: '把整体拆开，先看每次分一组会出现什么样子。',
  DifferenceComponent: '把两个量对齐比较，差出来的部分会更醒目。',
  RemainderComponent: '先看完整部分，再把剩下的尾巴单独提出来。',
  MultipleComponent: '让同一个单位反复出现，突出“几倍”的关系。',
  UnitConvertComponent: '把不同单位摆在一起，先统一到同一把尺上。',
  PointSegmentComponent: '点和线段按顺序排列，关系一眼就能看见。',
  PriceQuantityComponent: '单价、数量、总价并排展示，三者关系更清楚。',
  DistanceSpeedTimeComponent: '路程、时间、速度建立连接，路线关系更直观。',
  GeometryAreaComponent: '图形先露出轮廓，再看边、面、形之间的关系。',
  TimeComponent: '把时间放到一条线上，起点和终点更容易对照。',
  RoundingComponent: '先看余数怎么留，再决定是补一组还是舍掉尾巴。',
  GenericLogicComponent: '先把这一步的关系看懂，再继续往下走。',
}

export function getComponentNarration(block: LogicBlock) {
  return componentNarrationMap[block.component] || componentNarrationMap.GenericLogicComponent
}

const toneByComponent: Record<string, MathTone> = {
  TotalAmountComponent: 'purple',
  PartitionComponent: 'blue',
  DifferenceComponent: 'pink',
  RemainderComponent: 'green',
  MultipleComponent: 'purple',
  UnitConvertComponent: 'blue',
  PointSegmentComponent: 'purple',
  PriceQuantityComponent: 'pink',
  DistanceSpeedTimeComponent: 'blue',
  GeometryAreaComponent: 'green',
  TimeComponent: 'amber',
  RoundingComponent: 'amber',
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
