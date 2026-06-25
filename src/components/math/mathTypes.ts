export type MathBlock = {
  type: string
  subject: string
  math_component: string
}

export type MathAnalysis = {
  known_conditions?: Array<{
    text: string
    value?: number | null
    unit?: string
  }>
  hidden_conditions?: Array<{
    text: string
  }>
  goal?: {
    text: string
    target?: string
  }
}

export type MathComponentMode = 'discover' | 'explain' | 'challenge' | 'review'

export type MathComponentProps = {
  block: MathBlock
  mathAnalysis?: MathAnalysis
  mode?: MathComponentMode
}
