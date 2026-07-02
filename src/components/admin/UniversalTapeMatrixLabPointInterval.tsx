import React, { useState } from 'react'

interface BlockConfig {
  id: string
  type: 'repeat' | 'fixed'
  count: number
  value: number
  color: string
}

interface LayerConfig {
  id: string
  label: string
  total: number
  blocks: BlockConfig[]
}

interface TimelineStep {
  step: number
  action: 'draw_all' | 'divide_grid' | 'plot_points' | 'solve_unit'
  desc: string
}

const JSON_CONFIG: { layers: LayerConfig[]; timeline: TimelineStep[] } = {
  layers: [
    {
      id: 'line_1',
      label: '马路总长',
      total: 200,
      blocks: [
        {
          id: 'b1',
          type: 'repeat',
          count: 20,
          value: 10,
          color: '#10B981',
        },
      ],
    },
  ],
  timeline: [
    {
      step: 1,
      action: 'draw_all',
      desc: '绘制全长 200 米的单侧马路直线线段。',
    },
    {
      step: 2,
      action: 'divide_grid',
      desc: '按照每隔 10 米的间距进行网格分切，得出间隔段数 = 200 ÷ 10 = 20 段。',
    },
    {
      step: 3,
      action: 'plot_points',
      desc: '在线段各分界节点上点亮红灯笼粒子。由于两端都挂，灯笼数等于间隔数加 1。',
    },
    {
      step: 4,
      action: 'solve_unit',
      desc: '最终算出共需要红灯笼 20 + 1 = 21 盏。',
    },
  ],
}

export const PointIntervalPlayer: React.FC = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)

  const targetLayer = JSON_CONFIG.layers[0]
  const targetBlock = targetLayer.blocks[0]
  const currentStep = JSON_CONFIG.timeline[currentStepIndex]
  const { action, desc, step } = currentStep

  const handleNext = () => {
    if (currentStepIndex === JSON_CONFIG.timeline.length - 1) {
      setCurrentStepIndex(0)
    } else {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  const isGridActive = action !== 'draw_all'
  const isPointsPop = action === 'plot_points' || action === 'solve_unit'
  const isPulseActive = action === 'solve_unit'

  const cellsArray = Array.from({ length: targetBlock.count })
  const pointsArray = Array.from({ length: targetBlock.count + 1 })

  return (
    <div style={styles.body}>
      <style>{inlineAnimations}</style>

      <div style={styles.playerContainer}>
        <div style={styles.tutorBoard}>
          <p style={styles.tutorText}>{desc}</p>
        </div>

        <div style={styles.canvasStage}>
          <div style={styles.tapeLayer} id={targetLayer.id}>
            <div style={styles.layerLabel}>{targetLayer.label}</div>

            <div style={styles.layerTrack}>
              <div style={styles.bracketTop}>
                <span style={styles.bracketLabel}>{targetLayer.total} 米</span>
              </div>

              <div
                style={{
                  ...styles.bracketBottom,
                  opacity: isGridActive ? 1 : 0,
                  transform: isGridActive ? 'translateY(0)' : 'translateY(-5px)',
                }}
              >
                <span style={styles.bottomLabel}>{targetBlock.value}米</span>
              </div>

              <div style={styles.blocksContainer}>
                <div style={{ ...styles.blockSegment, backgroundColor: targetBlock.color }}>
                  {cellsArray.map((_, index) => (
                    <div
                      key={`cell-${index}`}
                      style={{
                        ...styles.gridCell,
                        opacity: isGridActive ? 1 : 0,
                        transform: isGridActive ? 'scaleX(1)' : 'scaleX(0.96)',
                        borderRight:
                          index === targetBlock.count - 1
                            ? 'none'
                            : '1px solid rgba(255,255,255,0.45)',
                      }}
                    />
                  ))}
                </div>

                <div style={styles.pointsParticleLayer}>
                  {pointsArray.map((_, index) => {
                    const leftPercent = (index / targetBlock.count) * 100
                    const delayStyle = isPointsPop
                      ? {
                          transitionDelay: `${index * 0.02}s`,
                          opacity: 1,
                          transform: 'translate(-50%, 0) scale(1)',
                        }
                      : {
                          opacity: 0,
                          transform: 'translate(-50%, 4px) scale(0)',
                        }

                    return (
                      <div
                        key={`dot-${index}`}
                        className={isPulseActive ? 'action-solve-pulse' : ''}
                        style={{
                          ...styles.pointNodeDot,
                          left: `${leftPercent}%`,
                          ...delayStyle,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.controlBar}>
          <span style={styles.stepIndicator}>
            步骤: {step} / {JSON_CONFIG.timeline.length}
          </span>
          <div style={styles.btnGroup}>
            <button
              disabled={currentStepIndex === 0}
              style={currentStepIndex === 0 ? styles.btnDisabled : styles.btnSecondary}
              onClick={handlePrev}
              type="button"
            >
              上一步
            </button>
            <button style={styles.btnPrimary} onClick={handleNext} type="button">
              {currentStepIndex === JSON_CONFIG.timeline.length - 1 ? '重置播放' : '下一步'}
            </button>
          </div>
        </div>
      </div>
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
    boxSizing: 'border-box',
  },
  playerContainer: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e2e8f0',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
    maxWidth: '580px',
    overflow: 'hidden',
    boxSizing: 'border-box',
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
  },
  canvasStage: {
    position: 'relative',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px 40px 70px 40px',
  },
  tapeLayer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    position: 'relative',
  },
  layerLabel: {
    width: '65px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  layerTrack: {
    flexGrow: 1,
    height: '30px',
    position: 'relative',
  },
  bracketTop: {
    position: 'absolute',
    top: '-24px',
    left: 0,
    width: '100%',
    height: '10px',
    border: '1.5px solid #94a3b8',
    borderBottom: 'none',
    borderRadius: '5px 5px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracketLabel: {
    position: 'absolute',
    top: '-20px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#1e293b',
    whiteSpace: 'nowrap',
  },
  bracketBottom: {
    position: 'absolute',
    bottom: '-34px',
    left: 0,
    width: '5%',
    height: '8px',
    border: '1.5px solid #10b981',
    borderTop: 'none',
    borderRadius: '0 0 4px 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  bottomLabel: {
    position: 'absolute',
    bottom: '-22px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#10b981',
    whiteSpace: 'nowrap',
  },
  blocksContainer: {
    position: 'relative',
    height: '100%',
    width: '100%',
  },
  blockSegment: {
    height: '100%',
    width: '100%',
    display: 'flex',
    borderRadius: '4px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  gridCell: {
    height: '100%',
    flexGrow: 1,
    flexBasis: 0,
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  pointsParticleLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    overflow: 'visible',
  },
  pointNodeDot: {
    position: 'absolute',
    top: '-4px',
    width: '5px',
    height: '5px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    boxShadow: '0 1px 3px rgba(239, 68, 68, 0.5)',
    zIndex: 100,
    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  controlBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  stepIndicator: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: 500,
  },
  btnGroup: {
    display: 'flex',
    gap: '10px',
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnSecondary: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#94a3b8',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'not-allowed',
  },
}

const inlineAnimations = `
  @keyframes dotGlow {
    0%, 100% { transform: translate(-50%, 0) scale(1); box-shadow: 0 1px 3px rgba(239, 68, 68, 0.5); }
    50% { transform: translate(-50%, -1px) scale(1.4); box-shadow: 0 0 6px 2px rgba(239, 68, 68, 0.8); }
  }
  .action-solve-pulse {
    animation: dotGlow 1.4s infinite ease-in-out !important;
    transition: none !important;
  }
`

export default PointIntervalPlayer
