export type LogicBlock = {
  step: number
  type: string
  component: string
  math_object: string
  visual_object: string
  props?: Record<string, unknown>
}

export type MathBlock = LogicBlock

export type MathComponentProps = {
  block: LogicBlock
}
