export type LogicBlock = {
  step: number
  type: string
  component: string
  math_object: string
  visual_object: string
}

export type MathBlock = LogicBlock

export type MathComponentProps = {
  block: LogicBlock
}
