import React, { useState, useEffect, useRef } from 'react'

interface Block {
  id: string
  type: 'fixed' | 'repeat'
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
  action: 'draw_all' | 'align_subtract' | 'solve_unit'
  focus: string[]
  desc: string
}

interface ModelData {
  canvas: {
    width: number
    height: number
    unit: string
  }
  layers: Layer[]
  timeline: TimelineStep[]
}

const jsonConfig: ModelData = {
  canvas: {
    width: 500,
    height: 260,
    unit: '元',
  },
  layers: [
    {
      id: 'line_1',
      label: '方案一总额',
      total: 720,
      blocks: [
        { id: 'b1_1', type: 'fixed', name: '6把椅子', count: 1, value: 300, color: '#64748B' },
        { id: 'b1_2', type: 'repeat', name: '3张桌子', count: 3, value: 140, color: '#38BDF8' },
      ],
    },
    {
      id: 'line_2',
      label: '方案二总额',
      total: 1000,
      blocks: [
        { id: 'b2_1', type: 'fixed', name: '6把椅子', count: 1, value: 300, color: '#64748B' },
        { id: 'b2_2', type: 'repeat', name: '5张桌子', count: 5, value: 140, color: '#10B981' },
      ],
    },
  ],
  timeline: [
    {
      step: 1,
      action: 'draw_all',
      focus: ['line_1', 'line_2'],
      desc: '绘制两种方案的对比线段，均包含相同的椅子总价，但桌子数量不同。',
    },
    {
      step: 2,
      action: 'align_subtract',
      focus: ['b1_2', 'b2_2'],
      desc: '上下对齐消除相同的椅子，裁剪出差量：桌子多了 5 - 3 = 2 张，总价多了 1000 - 720 = 280 元。',
    },
    {
      step: 3,
      action: 'solve_unit',
      focus: ['b2_2'],
      desc: '计算单一单元格价值，每张桌子价格 = 280 ÷ 2 = 140 元。',
    },
  ],
}

export const CompareModePlayer: React.FC = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [cutLineStyle, setCutLineStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'scaleY(0)',
  })
  const [diffBracketStyle, setDiffBracketStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'translateX(-5px)',
  })

  const stageRef = useRef<HTMLDivElement>(null)

  const currentTimeline = jsonConfig.timeline[currentStepIndex]
  const baseTotal = 1000

  useEffect(() => {
    if (!stageRef.current) return

    if (currentTimeline.action === 'align_subtract' || currentTimeline.action === 'solve_unit') {
      const fixedBlock = document.getElementById('b1_1')
      const line1Block = document.getElementById('b1_2')
      const line2Block = document.getElementById('b2_2')

      if (fixedBlock && line1Block && line2Block) {
        const stageRect = stageRef.current.getBoundingClientRect()
        const fixedRect = fixedBlock.getBoundingClientRect()
        const r1 = line1Block.getBoundingClientRect()
        const r2 = line2Block.getBoundingClientRect()

        setCutLineStyle({
          opacity: 1,
          transform: 'scaleY(1)',
          left: `${fixedRect.right - stageRect.left}px`,
        })

        if (currentTimeline.action === 'align_subtract') {
          setDiffBracketStyle({
            opacity: 1,
            transform: 'translateX(0)',
            left: `${r1.right - stageRect.left}px`,
            width: `${r2.right - r1.right}px`,
            top: `${r1.bottom - stageRect.top + 4}px`,
          })
        } else {
          setDiffBracketStyle({
            opacity: 1,
            transform: 'translateX(0)',
            left: `${r1.right - stageRect.left}px`,
            width: `${r2.right - r1.right}px`,
            top: `${r1.bottom - stageRect.top + 4}px`,
          })
        }
      }
    } else {
      setCutLineStyle({ opacity: 0, transform: 'scaleY(0)' })
      setDiffBracketStyle({ opacity: 0, transform: 'translateX(-5px)' })
    }
  }, [currentStepIndex, currentTimeline.action])

  const nextStep = () => {
    setCurrentStepIndex((prev) => (prev + 1 >= jsonConfig.timeline.length ? 0 : prev + 1))
  }

  const prevStep = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1))
  }

  return (
    <div style={styles.body}>
      <div style={styles.playerContainer}>
        <div style={styles.tutorBoard}>
          <p style={styles.tutorText}>{currentTimeline.desc}</p>
        </div>

        <div ref={stageRef} style={styles.canvasStage}>
          <div style={{ ...styles.alignCutLine, ...cutLineStyle }} />

          <div style={{ ...styles.diffStepBracket, ...diffBracketStyle }}>
            {currentTimeline.action === 'solve_unit' ? (
              <div style={styles.diffStepText}>
                <span style={styles.diffTagNum}>多了 2 张桌子</span>
                <span style={styles.diffTagPrice}>差额 +280 元</span>
              </div>
            ) : null}
          </div>

          {jsonConfig.layers.map((layer) => {
            const isLayerFocused =
              currentTimeline.focus.includes(layer.id) ||
              layer.blocks.some((b) => currentTimeline.focus.includes(b.id))

            return (
              <div
                key={layer.id}
                style={{
                  ...styles.tapeLayer,
                  opacity: currentTimeline.action !== 'draw_all' && !isLayerFocused ? 0.25 : 1,
                }}
              >
                <div style={styles.layerLabel}>{layer.label}</div>

                <div style={styles.layerTrack}>
                  <div
                    style={{
                      ...styles.bracketTop,
                      width: `${(layer.total / baseTotal) * 100}%`,
                      opacity: currentTimeline.action !== 'draw_all' ? 0.15 : 1,
                    }}
                  >
                    <span style={styles.bracketLabel}>
                      {layer.total} {jsonConfig.canvas.unit}
                    </span>
                  </div>

                  <div
                    style={{
                      ...styles.blocksContainer,
                      width: `${(layer.total / baseTotal) * 100}%`,
                    }}
                  >
                    {layer.blocks.map((block) => {
                      const isBlockFocused =
                        currentTimeline.focus.includes(block.id) ||
                        currentTimeline.focus.includes(layer.id)
                      const totalLayerValue = layer.blocks.reduce(
                        (acc, b) => acc + b.count * b.value,
                        0,
                      )
                      const isSplitState =
                        block.type === 'repeat' && currentTimeline.action !== 'draw_all'
                      const loopCount = isSplitState ? block.count : 1
                      const isSolvingUnit =
                        currentTimeline.action === 'solve_unit' &&
                        currentTimeline.focus.includes(block.id)

                      return (
                        <div
                          key={block.id}
                          id={block.id}
                          style={{
                            ...styles.blockSegment,
                            backgroundColor: block.color,
                            width: `${((block.count * block.value) / totalLayerValue) * 100}%`,
                            opacity:
                              currentTimeline.action !== 'draw_all' && !isBlockFocused ? 0.25 : 1,
                            animation: isSolvingUnit
                              ? 'pulse-glow 1.4s infinite ease-in-out'
                              : 'none',
                          }}
                        >
                          {Array.from({ length: loopCount }).map((_, index) => (
                            <div
                              key={index}
                              style={{
                                ...styles.gridCell,
                                borderRight:
                                  index === loopCount - 1 ? 'none' : '1.5px solid #ffffff',
                              }}
                            >
                              <span style={styles.cellText}>
                                {currentTimeline.action === 'solve_unit' && block.type === 'repeat'
                                  ? `${block.value}${jsonConfig.canvas.unit}`
                                  : isSplitState
                                    ? '?'
                                    : block.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={styles.controlBar}>
          <span style={styles.stepIndicator}>
            步骤: {currentTimeline.step} / {jsonConfig.timeline.length}
          </span>
          <div style={styles.btnGroup}>
            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              disabled={currentStepIndex === 0}
              onClick={prevStep}
              type="button"
            >
              上一步
            </button>
            <button style={styles.btn} onClick={nextStep} type="button">
              {currentStepIndex === jsonConfig.timeline.length - 1 ? '重置播放' : '下一步'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0px rgba(56, 189, 248, 0.5); }
          50% { transform: scale(1.02); box-shadow: 0 0 14px 4px rgba(56, 189, 248, 0.4); }
        }
        @keyframes fade-in-cell {
          from { opacity: 0; transform: scaleX(0.9); }
          to { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  body: {
    display: 'flex',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  playerContainer: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e2e8f0',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
    maxWidth: '640px',
  },
  tutorBoard: {
    background: '#f1f5f9',
    borderRadius: '12px',
    padding: '16px 20px',
    minHeight: '80px',
    borderLeft: '4px solid #2563eb',
    display: 'flex',
    alignItems: 'center',
  },
  tutorText: {
    color: '#1e293b',
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1.6,
    wordBreak: 'break-all',
  },
  canvasStage: {
    position: 'relative',
    background: '#ffffff',
    border: '1px solid #f1f5f9',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '84px',
    padding: '82px 30px 96px',
  },
  tapeLayer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '22px',
    position: 'relative',
    marginBottom: '14px',
  },
  layerLabel: {
    width: '70px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  layerTrack: {
    flexGrow: 1,
    height: '44px',
    display: 'flex',
    position: 'relative',
  },
  bracketTop: {
    position: 'absolute',
    top: '-28px',
    left: 0,
    height: '18px',
    border: '1.5px solid #94a3b8',
    borderBottom: 'none',
    borderRadius: '6px 6px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.3s ease',
  },
  bracketLabel: {
    position: 'absolute',
    top: '-24px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#1e293b',
    whiteSpace: 'nowrap',
  },
  blocksContainer: {
    height: '100%',
    width: '100%',
    display: 'flex',
    borderRadius: '6px',
    overflow: 'hidden',
    boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
  },
  blockSegment: {
    height: '100%',
    display: 'flex',
    position: 'relative',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  gridCell: {
    height: '100%',
    flexGrow: 1,
    flexBasis: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  cellText: {
    whiteSpace: 'nowrap',
  },
  alignCutLine: {
    position: 'absolute',
    top: '35px',
    bottom: '35px',
    width: '2px',
    borderLeft: '2px dashed #ef4444',
    zIndex: 10,
    transition: 'all 0.4s ease',
  },
  diffStepBracket: {
    position: 'absolute',
    height: '48px',
    border: '1.5px solid #ef4444',
    borderLeft: 'none',
    borderRadius: '0 6px 6px 0',
    zIndex: 50,
    transition: 'all 0.4s ease',
    pointerEvents: 'none',
  },
  diffStepText: {
    position: 'absolute',
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    whiteSpace: 'nowrap',
    zIndex: 51,
  },
  diffTagNum: {
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: 700,
  },
  diffTagPrice: {
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: 700,
  },
  scissorsIcon: {
    position: 'absolute',
    top: '35px',
    fontSize: '22px',
    zIndex: 15,
    pointerEvents: 'none',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  controlBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '18px',
  },
  stepIndicator: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: 500,
  },
  btnGroup: {
    display: 'flex',
    gap: '12px',
  },
  btn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '9px 22px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
}

export default CompareModePlayer
