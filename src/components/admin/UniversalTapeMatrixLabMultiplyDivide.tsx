import React, { useEffect, useRef, useState } from 'react'

interface Block {
  id: string
  type: 'repeat' | 'remainder' | 'fixed'
  name: string
  count: number
  value: number
  color: string
}

interface Layer {
  id: string
  label: string
  total: number
  blocks: Block[]
}

interface TimelineStep {
  step: number
  action: 'draw_all' | 'highlight_base' | 'divide_grid' | 'solve_unit'
  focus: string[]
  desc: string
}

interface CanvasConfig {
  width: number
  height: number
  unit: string
}

export interface SegmentModelProps {
  modelData: {
    canvas: CanvasConfig
    layers: Layer[]
    timeline: TimelineStep[]
  }
}

const defaultModelData: SegmentModelProps['modelData'] = {
  canvas: {
    width: 500,
    height: 260,
    unit: '元',
  },
  layers: [
    {
      id: 'line_1',
      label: '总额',
      total: 500,
      blocks: [
        {
          id: 'b1',
          type: 'repeat',
          name: '12把',
          count: 12,
          value: 38,
          color: '#38BDF8',
        },
        {
          id: 'b2',
          type: 'fixed',
          name: '剩余',
          count: 1,
          value: 44,
          color: '#F97316',
        },
      ],
    },
  ],
  timeline: [
    {
      step: 1,
      action: 'draw_all',
      focus: ['line_1', 'b1', 'b2'],
      desc: '点击下方按钮，开始画分段后的矩阵图。',
    },
    {
      step: 2,
      action: 'highlight_base',
      focus: ['b2'],
      desc: '先突出基准部分，看看剩余的差额。',
    },
    {
      step: 3,
      action: 'divide_grid',
      focus: ['b1'],
      desc: '把重复部分平均切分，显示每一格的网格。',
    },
    {
      step: 4,
      action: 'solve_unit',
      focus: ['b1'],
      desc: '最后一步，直接算出单元数值。',
    },
  ],
}

const SegmentModel: React.FC<SegmentModelProps> = ({ modelData }) => {
  const { canvas: canvasConfig, layers, timeline } = modelData

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const pulseAlphaRef = useRef<number>(1)
  const pulseDirectionRef = useRef<number>(-1)
  const animationFrameRef = useRef<number | null>(null)

  const currentTimeline = timeline[currentStepIndex]

  const drawBracket = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    isUpward: boolean,
  ) => {
    const midX = (x1 + x2) / 2
    const dir = isUpward ? -1 : 1
    const h = 6 * dir

    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1, y1 + h)
    ctx.lineTo(midX, y1 + h)
    ctx.lineTo(midX, y1 + h * 2)
    ctx.lineTo(midX, y1 + h)
    ctx.lineTo(x2, y1 + h)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  const render = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasConfig.width, canvasConfig.height)

    const action = currentTimeline.action
    const focusIds = currentTimeline.focus

    const startX = 85
    const endX = canvasConfig.width - 35
    const availableWidth = endX - startX
    const lineY = 120
    const blockHeight = 40

    const layer = layers[0]
    const totalValue = layer.total

    ctx.save()
    ctx.font = 'bold 14px sans-serif'
    ctx.fillStyle = '#475569'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(layer.label, startX - 15, lineY + blockHeight / 2)
    ctx.restore()

    let currentX = startX

    layer.blocks.forEach((block) => {
      let blockWidth = 0
      if (block.type === 'repeat') {
        blockWidth = ((block.count * block.value) / totalValue) * availableWidth
      } else {
        blockWidth = (block.value / totalValue) * availableWidth
      }

      const isFocused = focusIds.includes(block.id) || focusIds.includes(layer.id)

      ctx.save()
      if (!isFocused) {
        ctx.globalAlpha = 0.25
      }

      if (action === 'highlight_base' && block.id === 'b2') {
        ctx.shadowColor = '#F5A623'
        ctx.shadowBlur = 10 + (1 - pulseAlphaRef.current) * 10
        ctx.fillStyle = `rgba(245, 166, 35, ${0.7 + pulseAlphaRef.current * 0.3})`
      } else {
        ctx.fillStyle = block.color
      }

      ctx.fillRect(currentX, lineY, blockWidth, blockHeight)

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.strokeRect(currentX, lineY, blockWidth, blockHeight)

      if (block.type === 'repeat' && (action === 'divide_grid' || action === 'solve_unit')) {
        const cellWidth = blockWidth / block.count
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 1.5
        for (let i = 1; i < block.count; i += 1) {
          const gridX = currentX + i * cellWidth
          ctx.beginPath()
          ctx.moveTo(gridX, lineY)
          ctx.lineTo(gridX, lineY + blockHeight)
          ctx.stroke()
        }

        if (action === 'solve_unit') {
          ctx.fillStyle = '#ffffff'
          ctx.font = '11px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          for (let i = 0; i < block.count; i += 1) {
            const textX = currentX + i * cellWidth + cellWidth / 2
            if (cellWidth > 15) {
              ctx.fillText(String(block.value), textX, lineY + blockHeight / 2)
            }
          }
        } else {
          ctx.fillStyle = '#ffffff'
          ctx.font = '14px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(block.name, currentX + blockWidth / 2, lineY + blockHeight / 2)
        }
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(block.name, currentX + blockWidth / 2, lineY + blockHeight / 2)
      }

      if (block.id === 'b2') {
        drawBracket(ctx, currentX, lineY + blockHeight + 8, currentX + blockWidth, lineY + blockHeight + 8, false)
        ctx.fillStyle = '#e28743'
        ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`${block.value}${canvasConfig.unit}`, currentX + blockWidth / 2, lineY + blockHeight + 30)

        if (action === 'highlight_base') {
          ctx.fillStyle = '#ef4444'
          ctx.font = 'bold 18px sans-serif'
          ctx.fillText('- 44', currentX + blockWidth / 2, lineY - 15)
        }
      }

      if (block.id === 'b1' && (action === 'divide_grid' || action === 'solve_unit')) {
        drawBracket(ctx, currentX, lineY + blockHeight + 8, currentX + blockWidth, lineY + blockHeight + 8, false)
        ctx.fillStyle = '#10B981'
        ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`12把共: 456${canvasConfig.unit}`, currentX + blockWidth / 2, lineY + blockHeight + 30)
      }

      ctx.restore()
      currentX += blockWidth
    })

    ctx.save()
    if (action !== 'draw_all') {
      ctx.globalAlpha = 0.3
    }
    drawBracket(ctx, startX, lineY - 8, currentX, lineY - 8, true)
    ctx.fillStyle = '#1e293b'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`总额 ${totalValue} ${canvasConfig.unit}`, (startX + currentX) / 2, lineY - 26)
    ctx.restore()
  }

  useEffect(() => {
    render()
  }, [currentStepIndex, modelData])

  useEffect(() => {
    const tick = () => {
      pulseAlphaRef.current += pulseDirectionRef.current * 0.02
      if (pulseAlphaRef.current <= 0.4) {
        pulseAlphaRef.current = 0.4
        pulseDirectionRef.current = 1
      } else if (pulseAlphaRef.current >= 1) {
        pulseAlphaRef.current = 1
        pulseDirectionRef.current = -1
      }

      if (timeline[currentStepIndex]?.action === 'highlight_base') {
        render()
      }
      animationFrameRef.current = requestAnimationFrame(tick)
    }

    animationFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [currentStepIndex, timeline])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasConfig.width * dpr
    canvas.height = canvasConfig.height * dpr
    canvas.style.width = `${canvasConfig.width}px`
    canvas.style.height = `${canvasConfig.height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
    render()
  }, [canvasConfig.width, canvasConfig.height])

  const changeStep = (dir: number) => {
    setCurrentStepIndex((prev) => {
      const nextIndex = prev + dir
      if (nextIndex < 0) return 0
      if (nextIndex >= timeline.length) return timeline.length - 1
      return nextIndex
    })
  }

  return (
    <div style={styles.container}>
      <div style={styles.board}>
        <div style={styles.boardText}>{currentTimeline.desc}</div>
      </div>

      <div style={styles.canvasWrapper}>
        <canvas ref={canvasRef} />
      </div>

      <div style={styles.controls}>
        <div style={styles.stepIndicator}>
          步骤: {currentTimeline.step} / {timeline.length}
        </div>
        <div style={styles.btnGroup}>
          <button
            style={{ ...styles.btn, ...styles.prevBtn }}
            disabled={currentStepIndex === 0}
            onClick={() => changeStep(-1)}
            type="button"
          >
            上一步
          </button>
          <button
            style={{ ...styles.btn, ...styles.nextBtn }}
            disabled={currentStepIndex === timeline.length - 1}
            onClick={() => changeStep(1)}
            type="button"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxSizing: 'border-box',
  },
  board: {
    backgroundColor: '#f1f5f9',
    borderLeft: '4px solid #3b82f6',
    padding: '16px',
    borderRadius: '0 12px 12px 0',
    minHeight: '72px',
    display: 'flex',
    alignItems: 'center',
  },
  boardText: {
    fontSize: '15px',
    lineHeight: '1.6',
    fontWeight: 500,
    color: '#1e293b',
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
  },
  canvasWrapper: {
    position: 'relative',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  stepIndicator: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: 500,
  },
  btnGroup: {
    display: 'flex',
    gap: '10px',
  },
  btn: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  prevBtn: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
  },
  nextBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
}

export default function UniversalTapeMatrixLabMultiplyDivide() {
  return <SegmentModel modelData={defaultModelData} />
}
