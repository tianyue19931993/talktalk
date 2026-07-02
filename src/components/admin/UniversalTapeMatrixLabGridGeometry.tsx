import React, { useState } from 'react'

interface BlockConfig {
  id: string
  type: 'repeat' | 'fixed'
  name: string
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

interface GridConfig {
  rows: number
  cols: number
}

interface TimelineStep {
  step: number
  action: 'draw_all' | 'divide_grid' | 'solve_unit'
  desc: string
}

const JSON_CONFIG: { grid: GridConfig; layers: LayerConfig[]; timeline: TimelineStep[] } = {
  grid: {
    rows: 30,
    cols: 40,
  },
  layers: [
    {
      id: 'area_1',
      label: '花坛面积',
      total: 48,
      blocks: [
        {
          id: 'b1',
          type: 'repeat',
          name: '正方形草皮',
          count: 1200,
          value: 0.04,
          color: '#38BDF8',
        },
      ],
    },
  ],
  timeline: [
    {
      step: 1,
      action: 'draw_all',
      desc: '建立长 8 米（80分米）、宽 6 米（60分米）的 2D 矩形框舞台，总面积为 48 平方米。',
    },
    {
      step: 2,
      action: 'divide_grid',
      desc: '按照草皮边长 2 分米，将长切成 40 份，宽切成 30 份，横纵切出网格线。',
    },
    {
      step: 3,
      action: 'solve_unit',
      desc: '矩阵方阵平铺展开，总块数 = 40 × 30 = 1200 块。',
    },
  ],
}

export const GridGeometryPlayer: React.FC = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)

  const gridConfig = JSON_CONFIG.grid
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

  const isDrawAll = action === 'draw_all'
  const isDivideGrid = action === 'divide_grid'
  const isSolveUnit = action === 'solve_unit'

  const showGridMesh = isDivideGrid || isSolveUnit
  const colsLabelText = isDrawAll ? '8 米 (长)' : `${gridConfig.cols} 份 (长)`

  const totalCellsCount = gridConfig.rows * gridConfig.cols
  const cellsArray = Array.from({ length: totalCellsCount })

  return (
    <div style={styles.body}>
      <style>{inlineAnimations}</style>

      <div style={styles.playerContainer}>
        <div style={styles.tutorBoard}>
          <p style={styles.tutorText}>{desc}</p>
        </div>

        <div style={styles.canvasStage}>
          <div style={styles.matrixLayer} id={targetLayer.id}>
            <div style={styles.layerLabel}>{targetLayer.label}</div>

            <div style={styles.matrixTrack}>
              <div
                style={{
                  ...styles.bracketColsTop,
                  borderColor: isSolveUnit ? '#38bdf8' : '#64748b',
                }}
              >
                <span
                  style={{
                    ...styles.colsLabel,
                    color: isSolveUnit ? '#38bdf8' : '#1e293b',
                  }}
                >
                  {colsLabelText}
                </span>
              </div>

              <div
                style={{
                  ...styles.bracketRowsRight,
                  opacity: showGridMesh ? 1 : 0,
                  transform: showGridMesh ? 'translateX(0)' : 'translateX(-5px)',
                  borderColor: isSolveUnit ? '#38bdf8' : '#64748b',
                }}
              >
                <span
                  style={{
                    ...styles.rowsLabel,
                    color: isSolveUnit ? '#38bdf8' : '#1e293b',
                  }}
                >
                  {gridConfig.rows} 份 (宽)
                </span>
              </div>

              <div
                className={isSolveUnit ? 'action-tile-pulse' : ''}
                style={{
                  ...styles.matrixFrameBox,
                  borderColor: isDrawAll
                    ? '#38bdf8'
                    : isSolveUnit
                      ? '#38bdf8'
                      : '#64748b',
                  boxShadow: isDrawAll ? '0 0 12px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                <div
                  style={{
                    ...styles.gridMeshContainer,
                    opacity: showGridMesh ? 1 : 0,
                    gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
                  }}
                >
                  {cellsArray.map((_, index) => (
                    <div
                      key={`cell-${index}`}
                      style={{
                        ...styles.meshCell,
                        borderRight: isSolveUnit
                          ? '1px solid rgba(255, 255, 255, 0.25)'
                          : '1px solid rgba(100, 116, 139, 0.15)',
                        borderBottom: isSolveUnit
                          ? '1px solid rgba(255, 255, 255, 0.25)'
                          : '1px solid rgba(100, 116, 139, 0.15)',
                        backgroundColor: isSolveUnit ? targetBlock.color : 'transparent',
                      }}
                    />
                  ))}
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
    maxWidth: '600px',
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '60px 80px 40px 65px',
  },
  matrixLayer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    position: 'relative',
  },
  layerLabel: {
    width: '55px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  matrixTrack: {
    flexGrow: 1,
    aspectRatio: '4 / 3',
    position: 'relative',
  },
  matrixFrameBox: {
    width: '100%',
    height: '100%',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  gridMeshContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'grid',
    transition: 'opacity 0.4s ease',
  },
  meshCell: {
    backgroundColor: 'transparent',
    transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  bracketColsTop: {
    position: 'absolute',
    top: '-24px',
    left: 0,
    width: '100%',
    height: '10px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderBottom: 'none',
    borderRadius: '4px 4px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  colsLabel: {
    position: 'absolute',
    top: '-20px',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    transition: 'color 0.3s',
  },
  bracketRowsRight: {
    position: 'absolute',
    top: 0,
    right: '-24px',
    width: '10px',
    height: '100%',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderLeft: 'none',
    borderRadius: '0 4px 4px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  rowsLabel: {
    position: 'absolute',
    left: '16px',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    transition: 'color 0.3s',
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
  @keyframes tileGlow {
    0%, 100% { box-shadow: inset 0 0 0 0px rgba(56,189,248,0); }
    50% { box-shadow: inset 0 0 20px rgba(255,255,255,0.6); }
  }
  .action-tile-pulse {
    animation: tileGlow 1.6s infinite ease-in-out !important;
  }
`

export default GridGeometryPlayer
