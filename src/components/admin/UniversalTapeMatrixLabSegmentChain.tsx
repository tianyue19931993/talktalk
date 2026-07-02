import React, { useState, useEffect, useRef } from 'react'

interface ChainBlock {
  id: string
  type: 'segment' | 'remainder'
  name: string
  count: number
  value: number
  color: string
}

interface ChainLayer {
  id: string
  label: string
  total: number
  blocks: ChainBlock[]
}

interface ChainTimelineStep {
  step: number
  action: 'draw_all' | 'cut_chain' | 'divide_grid' | 'solve_unit'
  focus: string[]
  desc: string
}

export interface ChainModelData {
  canvas: {
    width: number
    height: number
    unit: string
  }
  layers: ChainLayer[]
  timeline: ChainTimelineStep[]
}

const chainConfig: ChainModelData = {
  canvas: {
    width: 500,
    height: 260,
    unit: '千米',
  },
  layers: [
    {
      id: 'line_1',
      label: '全程距离',
      total: 600,
      blocks: [
        { id: 'b1', type: 'segment', name: '已行路程', count: 1, value: 240, color: '#64748B' },
        { id: 'b2', type: 'remainder', name: '剩下路程', count: 4, value: 90, color: '#38BDF8' },
      ],
    },
  ],
  timeline: [
    {
      step: 1,
      action: 'draw_all',
      focus: ['line_1'],
      desc: '绘制总长 600 千米的全程串联线段。',
    },
    {
      step: 2,
      action: 'cut_chain',
      focus: ['b1'],
      desc: '咔嚓一刀剥离已行驶的 240 千米，求出剩下的路程为 600 - 240 = 360 千米。',
    },
    {
      step: 3,
      action: 'divide_grid',
      focus: ['b2'],
      desc: '将剩下的路程按预定的 4 小时均等切成 4 个格子。',
    },
    {
      step: 4,
      action: 'solve_unit',
      focus: ['b2'],
      desc: '算得出剩下阶段平均每小时需要行驶 360 ÷ 4 = 90 千米。',
    },
  ],
}

export interface SegmentChainPlayerProps {
  modelData?: ChainModelData
}

export const SegmentChainPlayer: React.FC<SegmentChainPlayerProps> = ({ modelData = chainConfig }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [cutLineStyle, setCutLineStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'scaleY(0)',
  })
  const [scissorsStyle, setScissorsStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'scale(0)',
  })

  const stageRef = useRef<HTMLDivElement>(null)
  const currentTimeline = modelData.timeline[currentStepIndex]

  const targetLayer = modelData.layers[0]
  const baseTotal = targetLayer.total

  useEffect(() => {
    if (!stageRef.current) return

    const action = currentTimeline.action

    if (action !== 'draw_all') {
      const b1Element = document.getElementById('b1')
      if (b1Element) {
        const stageRect = stageRef.current.getBoundingClientRect()
        const b1Rect = b1Element.getBoundingClientRect()
        const cutX = b1Rect.right - stageRect.left

        setCutLineStyle({
          opacity: 1,
          transform: 'scaleY(1)',
          left: `${cutX}px`,
        })

        if (action === 'cut_chain') {
          setScissorsStyle({
            opacity: 1,
            transform: 'translate(-50%, -50%) scale(1) rotate(-15deg)',
            left: `${cutX}px`,
          })
        } else {
          setScissorsStyle({ opacity: 0, transform: 'scale(0)' })
        }
      }
    } else {
      setCutLineStyle({ opacity: 0, transform: 'scaleY(0)' })
      setScissorsStyle({ opacity: 0, transform: 'scale(0)' })
    }
  }, [currentStepIndex, currentTimeline.action])

  const nextStep = () => {
    setCurrentStepIndex((prev) => (prev + 1 >= modelData.timeline.length ? 0 : prev + 1))
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

          <div style={{ ...styles.scissorsIcon, ...scissorsStyle }}>✂️</div>

          <div style={styles.tapeLayer}>
            <div style={styles.layerLabel}>{targetLayer.label}</div>

            <div style={styles.layerTrack}>
              <div
                style={{
                  ...styles.bracketTop,
                  width: '100%',
                  opacity: currentTimeline.action !== 'draw_all' ? 0.15 : 1,
                }}
              >
                <span style={styles.bracketLabel}>
                  {targetLayer.total} {modelData.canvas.unit}
                </span>
              </div>

              <div style={styles.blocksContainer}>
                {targetLayer.blocks.map((block) => {
                  const isBlockFocused =
                    currentTimeline.focus.includes(block.id) ||
                    currentTimeline.focus.includes('line_1')

                  const isSplitState =
                    block.type === 'remainder' &&
                    (currentTimeline.action === 'divide_grid' ||
                      currentTimeline.action === 'solve_unit')
                  const loopCount = isSplitState ? block.count : 1

                  const isDrained =
                    currentTimeline.action === 'cut_chain' && block.type === 'segment'

                  const isSolving =
                    currentTimeline.action === 'solve_unit' && block.type === 'remainder'

                  return (
                    <div
                      key={block.id}
                      id={block.id}
                      style={{
                        ...styles.blockSegment,
                        backgroundColor: block.color,
                        width: `${((block.count * block.value) / baseTotal) * 100}%`,
                        opacity: isDrained
                          ? 0.2
                          : !isBlockFocused && currentTimeline.action !== 'draw_all'
                            ? 0.3
                            : 1,
                        transform: isDrained ? 'translateY(10px) scale(0.98)' : 'none',
                        animation: isSolving ? 'pulse-glow 1.4s infinite ease-in-out' : 'none',
                      }}
                    >
                      {Array.from({ length: loopCount }).map((_, index) => (
                        <div
                          key={index}
                          style={{
                            ...styles.gridCell,
                            borderRight:
                              index === loopCount - 1 ? 'none' : '1.5px solid #ffffff',
                            animation: isSplitState ? 'fade-in-cell 0.4s ease forwards' : 'none',
                          }}
                        >
                          <span style={styles.cellText}>
                            {currentTimeline.action === 'solve_unit' && block.type === 'remainder'
                              ? `${block.value}${modelData.canvas.unit}`
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
        </div>

        <div style={styles.controlBar}>
          <span style={styles.stepIndicator}>
            步骤: {currentTimeline.step} / {modelData.timeline.length}
          </span>
          <div style={styles.btnGroup}>
            <button
              style={{
                ...styles.btn,
                ...(currentStepIndex === 0 ? styles.btnDisabled : styles.btnSecondary),
              }}
              disabled={currentStepIndex === 0}
              onClick={prevStep}
              type="button"
            >
              上一步
            </button>
            <button style={styles.btn} onClick={nextStep} type="button">
              {currentStepIndex === modelData.timeline.length - 1 ? '重置播放' : '下一步'}
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
    backgroundColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 0,
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
    maxWidth: '920px',
  },
  tutorBoard: {
    background: 'transparent',
    padding: 0,
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
  },
  tutorText: {
    color: '#1e293b',
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1.6,
    margin: 0,
    wordBreak: 'break-all',
  },
  canvasStage: {
    position: 'relative',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
    padding: '65px 36px',
  },
  tapeLayer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    position: 'relative',
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
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  btnDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#94a3b8',
    cursor: 'not-allowed',
  },
}

export default SegmentChainPlayer
