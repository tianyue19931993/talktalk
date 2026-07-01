import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import type { MathComponentProps } from './mathTypes'
import { MathComponentShell } from './MathComponentShell'
import { buildVisualMeta } from './mathHelpers'

interface CalcTotalMulProps {
  count?: number
  perValue?: number
  unit?: string
  stepLabel?: string
  totalLabel?: string
  buttonText?: string
}

interface CalcPartDivProps {
  total?: number
  stepValue?: number
  unit?: string
  stepLabel?: string
  buttonText?: string
}

interface CalcUnitDivProps {
  total?: number
  stepValue?: number
  unit?: string
  stepLabel?: string
  buttonText?: string
}

interface CalcPriceMulProps {
  type?: string
  totalPrice?: number
  price?: number
  quantity?: number
  unit?: string
  itemLabel?: string
  buttonText?: string
}

interface CalcUnitPriceDivProps {
  type?: string
  totalPrice?: number
  price?: number
  quantity?: number
  unit?: string
  itemLabel?: string
  buttonText?: string
}

interface CalcQtyDivProps {
  type?: string
  totalPrice?: number
  price?: number
  quantity?: number
  unit?: string
  itemLabel?: string
  buttonText?: string
}

interface CalcDistMulProps {
  type?: string
  distance?: number
  speed?: number
  time?: number
  speedUnit?: string
  timeUnit?: string
  distanceUnit?: string
  itemLabel?: string
  buttonText?: string
}

interface CalcSpeedDivProps {
  type?: string
  distance?: number
  speed?: number
  time?: number
  speedUnit?: string
  timeUnit?: string
  distanceUnit?: string
  buttonText?: string
}

interface CalcTimeDivProps {
  type?: string
  distance?: number
  speed?: number
  time?: number
  speedUnit?: string
  timeUnit?: string
  distanceUnit?: string
  buttonText?: string
}

interface CalcDiffSubProps {
  numA?: number
  numB?: number
  unit?: string
  labelA?: string
  labelB?: string
  buttonText?: string
}

interface CalcSumAddProps {
  parts?: number[]
  unit?: string
  labels?: string[]
  buttonText?: string
}

interface DragState {
  isDragging: boolean
  x: number
  y: number
  startX: number
  startY: number
  isSnapped: boolean
}

interface CalcRemainSubProps {
  total?: number
  used?: number
  unit?: string
  totalLabel?: string
  usedLabel?: string
  buttonText?: string
}

interface CalcTimesDivProps {
  type?: string
  numA?: number
  numB?: number
  baseNum?: number
  multiple?: number
  unit?: string
  labelA?: string
  labelB?: string
  labelBase?: string
  buttonText?: string
}

const timesDivStyles: { [key: string]: React.CSSProperties } = {
  uiCard: {
    background: '#FFFFFF',
    borderRadius: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
    padding: '32px',
    maxWidth: '540px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  stage: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '64px 24px',
    marginBottom: '24px',
    border: '1px solid #e5e5e5',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  interactionZone: {
    position: 'relative',
    width: '100%',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
  },
  stageWrapper: {
    position: 'relative',
    width: '100%',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
  },
  knivesLayer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 20,
  },
  knifeLine: {
    position: 'absolute',
    top: 0,
    width: '2px',
    height: '20px',
    backgroundColor: '#0070F3',
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
  },
  segmentsContainer: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 10,
  },
  baseLine: {
    background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
    height: '16px',
    width: '100%',
    borderRadius: '9999px',
  },
  subSegment: {
    background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
    height: '16px',
    flex: 1,
    borderRadius: '9999px',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    left: '50%',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e5e5',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 6px -1px rgba(0, 70, 243, 0.08)',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  badgeTop: {
    bottom: '28px',
    color: '#0070F3',
  },
  badgeFinal: {
    position: 'absolute',
    top: '28px',
    left: '50%',
    backgroundColor: '#0070F3',
    color: '#ffffff',
    border: '1px solid #0070F3',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    boxShadow: '0 10px 15px -3px rgba(0, 112, 243, 0.3)',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    zIndex: 40,
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-start',
  },
  btnReset: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid #e5e5e5',
    background: '#f5f5f5',
    color: '#525252',
    transition: 'background 0.2s',
  },
  btnAction: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    background: '#0070F3',
    color: '#ffffff',
    transition: 'background 0.2s',
  },
}

interface CalcTimesMulProps {
  type?: string
  numA?: number
  numB?: number
  baseNum?: number
  multiple?: number
  unit?: string
  labelA?: string
  labelB?: string
  labelBase?: string
  buttonText?: string
}

interface CalcFracPartProps {
  type?: string
  total?: number
  part?: number
  numerator?: number
  denominator?: number
  unit?: string
  buttonText?: string
}

type CalcFracPartStep = 'idle' | 'divide' | 'multiply' | 'done'

function normalizePositiveInteger(value: number | undefined, fallback: number, min = 1) {
  const resolved = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback
  return Math.max(min, resolved)
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatDisplayNumber(value: number) {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '')
}

interface CalcFracRateProps {
  type?: string
  total?: number
  part?: number
  numerator?: number
  denominator?: number
  unit?: string
  buttonText?: string
}

interface CalcAvgDivProps {
  total?: number
  count?: number
  unit?: string
  totalLabel?: string
  buttonText?: string
}

interface CalcMultiSumProps {
  parts?: number[]
  unit?: string
  labels?: string[]
  buttonText?: string
}

interface TimeSubSpanProps {
  type?: string
  startTime?: string
  endTime?: string
  pauseMinutes?: number
  durationMinutes?: number
  buttonText?: string
}

interface TimeAddPassProps {
  type?: string
  startTime?: string
  endTime?: string
  pauseMinutes?: number
  durationMinutes?: number
  buttonText?: string
}

interface TimeSubPassProps {
  type?: string
  startTime?: string
  endTime?: string
  pauseMinutes?: number
  durationMinutes?: number
  buttonText?: string
}

interface UnitConvProps {
  type?: 'UnitConvTime' | 'UnitConvLen' | 'UnitConvArea' | 'UnitConvWeight' | string
  fromUnit?: string
  toUnit?: string
  value?: number
  rate?: number
  buttonText?: string
}

interface PointSegProps {
  totalLength?: number
  spacing?: number
  lengthUnit?: string
  segments?: number
  buttonText?: string
}

export function CalcTotalMul({
  count = 4,
  perValue = 10,
  unit = '个',
  stepLabel = '每组10个，共4组',
  totalLabel = '共40个',
  buttonText = '求总量',
}: CalcTotalMulProps) {
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [droppedRows, setDroppedRows] = useState<number[]>([])
  const [isShellActive, setIsShellActive] = useState<boolean>(false)
  const [showTotal, setShowTotal] = useState<boolean>(false)
  const timerRefs = useRef<number[]>([])

  const clearAllTimers = () => {
    timerRefs.current.forEach((timerId) => window.clearTimeout(timerId))
    timerRefs.current = []
  }

  const startAnimation = async () => {
    if (isAnimating) return
    setIsAnimating(true)
    setDroppedRows([])
    setIsShellActive(false)
    setShowTotal(false)
    clearAllTimers()

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    for (let i = 0; i < count; i += 1) {
      setDroppedRows((prev) => [...prev, i])
      await sleep(250)
    }

    await sleep(200)
    setIsShellActive(true)
    await sleep(150)

    setShowTotal(true)
    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    clearAllTimers()
    setDroppedRows([])
    setIsShellActive(false)
    setShowTotal(false)
  }

  useEffect(() => {
    resetDemo()
  }, [count, perValue])

  const cubeArray = Array.from({ length: perValue })
  const rowArray = Array.from({ length: count })

  return (
    <div
      className="ui-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        padding: '32px',
        maxWidth: '600px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        className="title-part"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcTotalMul 乘法求总数组件
      </div>

      <div
        className="stage"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '60px 24px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="global-shell"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            borderRadius: '20px',
            border: isShellActive ? '2px solid #0070F3' : '2px dashed transparent',
            background: isShellActive ? 'rgba(0, 112, 243, 0.01)' : 'transparent',
            boxShadow: isShellActive ? '0 12px 24px rgba(0, 112, 243, 0.05)' : 'none',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
          }}
        >
          <div
            className="badge badge-total"
            style={{
              position: 'absolute',
              left: '50%',
              top: '-44px',
              transform: showTotal ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
              opacity: showTotal ? 1 : 0,
              backgroundColor: '#0070F3',
              color: '#ffffff',
              border: '1px solid #0070F3',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 15px -3px rgba(0, 112, 243, 0.3)',
              zIndex: 30,
              transition: 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            }}
          >
            {totalLabel} <span style={{ fontSize: '10px' }}>↑</span>
          </div>

          {rowArray.map((_, rowIndex) => {
            const isDropped = droppedRows.includes(rowIndex)
            return (
              <div
                key={rowIndex}
                className="group-row"
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  position: 'relative',
                  opacity: isDropped ? 1 : 0,
                  transform: isDropped ? 'translateY(0)' : 'translateY(-40px)',
                  transition: 'all 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                }}
              >
                <div
                  className="group-label"
                  style={{
                    marginRight: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#888',
                    background: '#eee',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {perValue}
                  {unit}
                </div>

                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', maxWidth: '380px' }}>
                  {cubeArray.map((_, cubeIndex) => (
                    <div
                      key={cubeIndex}
                      className="mini-cube"
                      style={{
                        width: '20px',
                        height: '20px',
                        background: 'linear-gradient(135deg, #7928CA 0%, #FF0080 100%)',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          <div
            className="badge badge-bottom"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '-44px',
              transform: 'translateX(-50%) scale(1)',
              background: '#ffffff',
              border: '1px solid #e5e5e5',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              color: '#888',
              opacity: 1,
              zIndex: 30,
            }}
          >
            {stepLabel || `每组 ${perValue} ${unit}，共 ${count} 组`}
          </div>
        </div>
      </div>

      <div
        className="btn-row"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <button
          className="btn-reset"
          onClick={resetDemo}
          disabled={isAnimating}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            border: '1px solid #e5e5e5',
            background: '#f5f5f5',
            color: '#525252',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          重置
        </button>
        <button
          className="btn-action"
          onClick={startAnimation}
          disabled={isAnimating || droppedRows.length === count}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating || droppedRows.length === count ? 'not-allowed' : 'pointer',
            border: 'none',
            background: '#0070F3',
            color: '#ffffff',
            opacity: isAnimating || droppedRows.length === count ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcPartDiv({
  total = 60,
  stepValue = 15,
  unit = '厘米',
  stepLabel = '4份',
  buttonText = '求份数',
}: CalcPartDivProps) {
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [animationStage, setAnimationStage] = useState<'idle' | 'knives' | 'split' | 'badges' | 'final'>('idle')
  const [activeKnives, setActiveKnives] = useState<number[]>([])
  const [activeBadges, setActiveBadges] = useState<number[]>([])

  const finalCount = Math.floor(total / stepValue) || 1
  const segmentArray = Array.from({ length: finalCount })

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const startAnimation = async () => {
    if (isAnimating || finalCount <= 1) return

    setIsAnimating(true)
    setAnimationStage('knives')
    setActiveKnives([])
    setActiveBadges([])

    for (let i = 1; i < finalCount; i += 1) {
      await sleep(150)
      setActiveKnives((prev) => [...prev, i])
    }

    await sleep(450)

    setAnimationStage('split')
    await sleep(400)

    setAnimationStage('badges')
    for (let i = 0; i < finalCount; i += 1) {
      setActiveBadges((prev) => [...prev, i])
      await sleep(120)
    }
    await sleep(300)

    setAnimationStage('final')
    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    setAnimationStage('idle')
    setActiveKnives([])
    setActiveBadges([])
  }

  useEffect(() => {
    resetDemo()
  }, [total, stepValue])

  return (
    <div
      className="ui-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        padding: '32px',
        maxWidth: '540px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes reactJelly {
          0%, 100% { transform: translateX(-50%) scale(1, 1); }
          30% { transform: translateX(-50%) scale(1.25, 0.75); }
          50% { transform: translateX(-50%) scale(1.15, 0.85); }
        }
      `}</style>

      <div
        className="title-part"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcPartDiv 用除法求份数组件
      </div>

      <div
        className="stage"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '64px 24px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="total-label"
          style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#a3a3a3',
            letterSpacing: '0.05em',
          }}
        >
          总量: {total} {unit}
        </div>

        <div className="stage-wrapper" style={{ position: 'relative', width: '100%', height: '64px', display: 'flex', alignItems: 'center' }}>
          <div className="knives-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
            {animationStage === 'knives' && Array.from({ length: finalCount - 1 }).map((_, i) => {
              const knifeIndex = i + 1
              const leftPercent = (knifeIndex / finalCount) * 100
              const isDropped = activeKnives.includes(knifeIndex)
              return (
                <div
                  key={knifeIndex}
                  className="knife-line"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `calc(${leftPercent}% - 1px)`,
                    width: '2px',
                    height: '20px',
                    backgroundColor: '#0070F3',
                    opacity: isDropped ? 1 : 0,
                    transform: isDropped ? 'translateY(22px)' : 'translateY(-24px)',
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                  }}
                />
              )
            })}
          </div>

          <div
            className="segments-container"
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              zIndex: 10,
              gap: (animationStage !== 'idle' && animationStage !== 'knives') ? '16px' : '0px',
              transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {(animationStage === 'idle' || animationStage === 'knives') ? (
              <div
                className="base-line"
                style={{
                  background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                  height: '16px',
                  width: '100%',
                  borderRadius: '9999px',
                  transition: 'all 0.4s ease',
                }}
              />
            ) : (
              segmentArray.map((_, i) => {
                const isActiveBadge = activeBadges.includes(i)
                const isCenter = i === Math.floor(finalCount / 2)
                const showFinalBadge = animationStage === 'final'

                return (
                  <div
                    key={i}
                    className="sub-segment"
                    style={{
                      background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                      height: '16px',
                      flex: 1,
                      borderRadius: '9999px',
                      position: 'relative',
                    }}
                  >
                    <div
                      className="badge"
                      style={{
                        position: 'absolute',
                        bottom: '28px',
                        left: '50%',
                        transform: isActiveBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                        opacity: isActiveBadge ? 1 : 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e5e5',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        color: '#0070F3',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 6px -1px rgba(0, 70, 243, 0.08)',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        animation: isActiveBadge ? 'reactJelly 0.5s ease-in-out' : 'none',
                      }}
                    >
                      {stepValue} {unit}
                    </div>

                    {isCenter && (
                      <div
                        className="badge-final"
                        style={{
                          position: 'absolute',
                          top: '28px',
                          left: '50%',
                          transform: showFinalBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                          opacity: showFinalBadge ? 1 : 0,
                          backgroundColor: '#0070F3',
                          color: '#ffffff',
                          border: '1px solid #0070F3',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 10px 15px -3px rgba(0, 112, 243, 0.3)',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          zIndex: 40,
                          animation: showFinalBadge ? 'reactJelly 0.5s ease-in-out' : 'none',
                        }}
                      >
                        {stepLabel} <span style={{ fontSize: '10px' }}>↑</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div
        className="btn-row"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <button
          className="btn-reset"
          onClick={resetDemo}
          disabled={isAnimating}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            border: '1px solid #e5e5e5',
            background: '#f5f5f5',
            color: '#525252',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          重置
        </button>
        <button
          className="btn-action"
          onClick={startAnimation}
          disabled={isAnimating || animationStage === 'final'}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: (isAnimating || animationStage === 'final') ? 'not-allowed' : 'pointer',
            border: 'none',
            background: '#0070F3',
            color: '#ffffff',
            opacity: (isAnimating || animationStage === 'final') ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcUnitDiv({
  total = 60,
  stepValue = 15,
  unit = '个',
  stepLabel = '15个',
  buttonText = '求每份数',
}: CalcUnitDivProps) {
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [animationStage, setAnimationStage] = useState<'idle' | 'knives' | 'split' | 'badges'>('idle')
  const [activeKnives, setActiveKnives] = useState<number[]>([])
  const [activeBadges, setActiveBadges] = useState<number[]>([])

  const finalCount = Math.floor(total / stepValue) || 1
  const segmentArray = Array.from({ length: finalCount })

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const startAnimation = async () => {
    if (isAnimating || finalCount <= 1) return

    setIsAnimating(true)
    setAnimationStage('knives')
    setActiveKnives([])
    setActiveBadges([])

    for (let i = 1; i < finalCount; i += 1) {
      await sleep(120)
      setActiveKnives((prev) => [...prev, i])
    }

    await sleep(420)

    setAnimationStage('split')
    await sleep(400)

    setAnimationStage('badges')
    for (let i = 0; i < finalCount; i += 1) {
      setActiveBadges((prev) => [...prev, i])
      await sleep(150)
    }

    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    setAnimationStage('idle')
    setActiveKnives([])
    setActiveBadges([])
  }

  useEffect(() => {
    resetDemo()
  }, [total, stepValue])

  return (
    <div
      className="ui-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        padding: '32px',
        maxWidth: '540px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes unitJelly {
          0%, 100% { transform: translateX(-50%) scale(1, 1); }
          30% { transform: translateX(-50%) scale(1.25, 0.75); }
          50% { transform: translateX(-50%) scale(1.15, 0.85); }
        }
      `}</style>

      <div
        className="title-part"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcUnitDiv 用除法求每份数组件
      </div>

      <div
        className="stage"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '54px 24px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
          minHeight: '180px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="total-label"
          style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#a3a3a3',
            letterSpacing: '0.05em',
          }}
        >
          总量: {total} {unit}
        </div>

        <div className="stage-wrapper" style={{ position: 'relative', width: '100%', height: '64px', display: 'flex', alignItems: 'center' }}>
          <div className="knives-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
            {animationStage === 'knives' && Array.from({ length: finalCount - 1 }).map((_, i) => {
              const knifeIndex = i + 1
              const leftPercent = (knifeIndex / finalCount) * 100
              const isDropped = activeKnives.includes(knifeIndex)
              return (
                <div
                  key={knifeIndex}
                  className="knife-line"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `calc(${leftPercent}% - 1px)`,
                    width: '2px',
                    height: '20px',
                    backgroundColor: '#0070F3',
                    opacity: isDropped ? 1 : 0,
                    transform: isDropped ? 'translateY(22px)' : 'translateY(-24px)',
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                  }}
                />
              )
            })}
          </div>

          <div
            className="segments-container"
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              zIndex: 10,
              gap: (animationStage !== 'idle' && animationStage !== 'knives') ? '16px' : '0px',
              transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {(animationStage === 'idle' || animationStage === 'knives') ? (
              <div
                className="base-line"
                style={{
                  background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                  height: '16px',
                  width: '100%',
                  borderRadius: '9999px',
                  transition: 'all 0.4s ease',
                }}
              />
            ) : (
              segmentArray.map((_, i) => {
                const isActiveBadge = activeBadges.includes(i)

                return (
                  <div
                    key={i}
                    className="sub-segment"
                    style={{
                      background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                      height: '16px',
                      flex: 1,
                      borderRadius: '9999px',
                      position: 'relative',
                    }}
                  >
                    <div
                      className="badge"
                      style={{
                        position: 'absolute',
                        top: '28px',
                        left: '50%',
                        transform: isActiveBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                        opacity: isActiveBadge ? 1 : 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e5e5',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        color: '#0070F3',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 6px -1px rgba(0, 70, 243, 0.08)',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        zIndex: 40,
                        animation: isActiveBadge ? 'unitJelly 0.5s ease-in-out' : 'none',
                      }}
                    >
                      {stepLabel} <span style={{ fontSize: '10px' }}>↑</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div
        className="btn-row"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <button
          className="btn-reset"
          onClick={resetDemo}
          disabled={isAnimating}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            border: '1px solid #e5e5e5',
            background: '#f5f5f5',
            color: '#525252',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          重置
        </button>
        <button
          className="btn-action"
          onClick={startAnimation}
          disabled={isAnimating || animationStage === 'badges'}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: (isAnimating || animationStage === 'badges') ? 'not-allowed' : 'pointer',
            border: 'none',
            background: '#0070F3',
            color: '#ffffff',
            opacity: (isAnimating || animationStage === 'badges') ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcPriceMul({
  type = 'CalcPriceMul',
  totalPrice = 20,
  price = 5,
  quantity = 4,
  unit = '元',
  itemLabel = '总价模型探究',
  buttonText = '求总价',
}: CalcPriceMulProps) {
  void type
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [droppedRows, setDroppedRows] = useState<number[]>([])
  const [isShellActive, setIsShellActive] = useState<boolean>(false)
  const [showTotal, setShowTotal] = useState<boolean>(false)

  const startAnimation = async () => {
    if (isAnimating) return
    setIsAnimating(true)
    setDroppedRows([])
    setIsShellActive(false)
    setShowTotal(false)

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    for (let i = 0; i < quantity; i += 1) {
      setDroppedRows((prev) => [...prev, i])
      await sleep(250)
    }

    await sleep(200)
    setIsShellActive(true)
    await sleep(150)

    setShowTotal(true)
    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    setDroppedRows([])
    setIsShellActive(false)
    setShowTotal(false)
  }

  useEffect(() => {
    resetDemo()
  }, [price, quantity, totalPrice])

  const cubeArray = Array.from({ length: price })
  const rowArray = Array.from({ length: quantity })

  return (
    <div
      className="ui-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        padding: '32px',
        maxWidth: '600px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        className="title-part"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcPriceMul 乘法求总价组件
      </div>

      <div
        className="stage"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '60px 24px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="global-shell"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            borderRadius: '20px',
            border: isShellActive ? '2px solid #0070F3' : '2px dashed transparent',
            background: isShellActive ? 'rgba(0, 112, 243, 0.01)' : 'transparent',
            boxShadow: isShellActive ? '0 12px 24px rgba(0, 112, 243, 0.05)' : 'none',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
          }}
        >
          <div
            className="badge badge-total"
            style={{
              position: 'absolute',
              left: '50%',
              top: '-44px',
              transform: showTotal ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
              opacity: showTotal ? 1 : 0,
              backgroundColor: '#0070F3',
              color: '#ffffff',
              border: '1px solid #0070F3',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 15px -3px rgba(0, 112, 243, 0.3)',
              zIndex: 30,
              transition: 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            }}
          >
            总价: {totalPrice}{unit} <span style={{ fontSize: '10px' }}>↑</span>
          </div>

          {rowArray.map((_, rowIndex) => {
            const isDropped = droppedRows.includes(rowIndex)
            return (
              <div
                key={rowIndex}
                className="group-row"
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  position: 'relative',
                  opacity: isDropped ? 1 : 0,
                  transform: isDropped ? 'translateY(0)' : 'translateY(-40px)',
                  transition: 'all 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                }}
              >
                <div
                  className="group-label"
                  style={{
                    marginRight: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#888',
                    background: '#eee',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {price}{unit}
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '380px' }}>
                  {cubeArray.map((_, cubeIndex) => (
                    <div
                      key={cubeIndex}
                      className="mini-cube"
                      style={{
                        width: '24px',
                        height: '24px',
                        background: 'linear-gradient(135deg, #7928CA 0%, #FF0080 100%)',
                        borderRadius: '5px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          <div
            className="badge badge-bottom"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '-44px',
              transform: 'translateX(-50%) scale(1)',
              background: '#ffffff',
              border: '1px solid #e5e5e5',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              color: '#888',
              opacity: 1,
              zIndex: 30,
            }}
          >
            {itemLabel || `单价 ${price}${unit}，数量 ${quantity}`}
          </div>
        </div>
      </div>

      <div
        className="btn-row"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <button
          className="btn-reset"
          onClick={resetDemo}
          disabled={isAnimating}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            border: '1px solid #e5e5e5',
            background: '#f5f5f5',
            color: '#525252',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          重置
        </button>
        <button
          className="btn-action"
          onClick={startAnimation}
          disabled={isAnimating || droppedRows.length === quantity}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating || droppedRows.length === quantity ? 'not-allowed' : 'pointer',
            border: 'none',
            background: '#0070F3',
            color: '#ffffff',
            opacity: isAnimating || droppedRows.length === quantity ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcUnitPriceDiv({
  type = 'CalcUnitPriceDiv',
  totalPrice = 20,
  price = 5,
  quantity = 4,
  unit = '元',
  itemLabel = '单价: 5元',
  buttonText = '求单价',
}: CalcUnitPriceDivProps) {
  void type
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [animationStage, setAnimationStage] = useState<'idle' | 'knives' | 'split' | 'badges'>('idle')
  const [activeKnives, setActiveKnives] = useState<number[]>([])
  const [activeBadges, setActiveBadges] = useState<number[]>([])

  const segmentArray = Array.from({ length: quantity })

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const startAnimation = async () => {
    if (isAnimating || quantity <= 1) return

    setIsAnimating(true)
    setAnimationStage('knives')
    setActiveKnives([])
    setActiveBadges([])

    for (let i = 1; i < quantity; i += 1) {
      await sleep(120)
      setActiveKnives((prev) => [...prev, i])
    }

    await sleep(420)

    setAnimationStage('split')
    await sleep(400)

    setAnimationStage('badges')
    for (let i = 0; i < quantity; i += 1) {
      setActiveBadges((prev) => [...prev, i])
      await sleep(150)
    }

    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    setAnimationStage('idle')
    setActiveKnives([])
    setActiveBadges([])
  }

  useEffect(() => {
    resetDemo()
  }, [totalPrice, quantity, price])

  return (
    <div
      className="ui-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        padding: '32px',
        maxWidth: '540px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes priceDivJelly {
          0%, 100% { transform: translateX(-50%) scale(1, 1); }
          30% { transform: translateX(-50%) scale(1.25, 0.75); }
          50% { transform: translateX(-50%) scale(1.15, 0.85); }
        }
      `}</style>

      <div
        className="title-part"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcUnitPriceDiv 除法求单价组件
      </div>

      <div
        className="stage"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '54px 24px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
          minHeight: '180px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="total-label"
          style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#a3a3a3',
            letterSpacing: '0.05em',
          }}
        >
          总价: {totalPrice} {unit}
        </div>

        <div className="stage-wrapper" style={{ position: 'relative', width: '100%', height: '64px', display: 'flex', alignItems: 'center' }}>
          <div className="knives-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
            {animationStage === 'knives' && Array.from({ length: quantity - 1 }).map((_, i) => {
              const knifeIndex = i + 1
              const leftPercent = (knifeIndex / quantity) * 100
              const isDropped = activeKnives.includes(knifeIndex)
              return (
                <div
                  key={knifeIndex}
                  className="knife-line"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `calc(${leftPercent}% - 1px)`,
                    width: '2px',
                    height: '20px',
                    backgroundColor: '#0070F3',
                    opacity: isDropped ? 1 : 0,
                    transform: isDropped ? 'translateY(22px)' : 'translateY(-24px)',
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                  }}
                />
              )
            })}
          </div>

          <div
            className="segments-container"
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              zIndex: 10,
              gap: (animationStage !== 'idle' && animationStage !== 'knives') ? '16px' : '0px',
              transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {(animationStage === 'idle' || animationStage === 'knives') ? (
              <div
                className="base-line"
                style={{
                  background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                  height: '16px',
                  width: '100%',
                  borderRadius: '9999px',
                  transition: 'all 0.4s ease',
                }}
              />
            ) : (
              segmentArray.map((_, i) => {
                const isActiveBadge = activeBadges.includes(i)

                return (
                  <div
                    key={i}
                    className="sub-segment"
                    style={{
                      background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                      height: '16px',
                      flex: 1,
                      borderRadius: '9999px',
                      position: 'relative',
                    }}
                  >
                    <div
                      className="badge"
                      style={{
                        position: 'absolute',
                        top: '28px',
                        left: '50%',
                        transform: isActiveBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                        opacity: isActiveBadge ? 1 : 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e5e5',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        color: '#0070F3',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 6px -1px rgba(0, 70, 243, 0.08)',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        zIndex: 40,
                        animation: isActiveBadge ? 'priceDivJelly 0.5s ease-in-out' : 'none',
                      }}
                    >
                      {itemLabel || `${price}${unit}`} <span style={{ fontSize: '10px' }}>↑</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div
        className="btn-row"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <button
          className="btn-reset"
          onClick={resetDemo}
          disabled={isAnimating}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            border: '1px solid #e5e5e5',
            background: '#f5f5f5',
            color: '#525252',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          重置
        </button>
        <button
          className="btn-action"
          onClick={startAnimation}
          disabled={isAnimating || (animationStage === 'badges' && activeBadges.length === quantity)}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: (isAnimating || (animationStage === 'badges' && activeBadges.length === quantity)) ? 'not-allowed' : 'pointer',
            border: 'none',
            background: '#0070F3',
            color: '#ffffff',
            opacity: (isAnimating || (animationStage === 'badges' && activeBadges.length === quantity)) ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcQtyDiv({
  type = 'CalcQtyDiv',
  totalPrice = 20,
  price = 5,
  quantity = 4,
  unit = '元',
  itemLabel = '4个',
  buttonText = '求数量',
}: CalcQtyDivProps) {
  void type
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [animationStage, setAnimationStage] = useState<'idle' | 'knives' | 'split' | 'badges' | 'done'>('idle')
  const [activeKnives, setActiveKnives] = useState<number[]>([])
  const [activeBadges, setActiveBadges] = useState<boolean>(false)
  const [activeFinalBadge, setActiveFinalBadge] = useState<boolean>(false)

  const segmentArray = Array.from({ length: quantity })
  const middleIndex = Math.floor(quantity / 2)

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const startAnimation = async () => {
    if (isAnimating || quantity <= 1) return

    setIsAnimating(true)
    setAnimationStage('knives')
    setActiveKnives([])
    setActiveBadges(false)
    setActiveFinalBadge(false)

    for (let i = 1; i < quantity; i += 1) {
      await sleep(120)
      setActiveKnives((prev) => [...prev, i])
    }

    await sleep(300)
    setAnimationStage('split')
    await sleep(400)

    setActiveBadges(true)
    await sleep(quantity * 120 + 300)

    setAnimationStage('done')
    setActiveFinalBadge(true)
    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    setAnimationStage('idle')
    setActiveKnives([])
    setActiveBadges(false)
    setActiveFinalBadge(false)
  }

  useEffect(() => {
    resetDemo()
  }, [totalPrice, price, quantity])

  return (
    <div
      className="ui-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        padding: '32px',
        maxWidth: '540px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes qtyDivJelly {
          0%, 100% { transform: translateX(-50%) scale(1, 1); }
          30% { transform: translateX(-50%) scale(1.25, 0.75); }
          50% { transform: translateX(-50%) scale(1.15, 0.85); }
        }
      `}</style>

      <div
        className="title-part"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcQtyDiv 除法求数量组件
      </div>

      <div
        className="stage"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '54px 24px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
          minHeight: '180px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="total-label"
          style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#a3a3a3',
            letterSpacing: '0.05em',
          }}
        >
          总价: {totalPrice} {unit}
        </div>

        <div className="stage-wrapper" style={{ position: 'relative', width: '100%', height: '64px', display: 'flex', alignItems: 'center' }}>
          <div className="knives-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
            {animationStage === 'knives' && Array.from({ length: quantity - 1 }).map((_, i) => {
              const knifeIndex = i + 1
              const leftPercent = (knifeIndex / quantity) * 100
              const isDropped = activeKnives.includes(knifeIndex)
              return (
                <div
                  key={knifeIndex}
                  className="knife-line"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `calc(${leftPercent}% - 1px)`,
                    width: '2px',
                    height: '20px',
                    backgroundColor: '#0070F3',
                    opacity: isDropped ? 1 : 0,
                    transform: isDropped ? 'translateY(22px)' : 'translateY(-24px)',
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                  }}
                />
              )
            })}
          </div>

          <div
            className="segments-container"
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              zIndex: 10,
              gap: (animationStage !== 'idle' && animationStage !== 'knives') ? '16px' : '0px',
              transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {(animationStage === 'idle' || animationStage === 'knives') ? (
              <div
                className="base-line"
                style={{
                  background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                  height: '16px',
                  width: '100%',
                  borderRadius: '9999px',
                  transition: 'all 0.4s ease',
                }}
              />
            ) : (
              segmentArray.map((_, i) => {
                const isActiveBadge = activeBadges

                return (
                  <div
                    key={i}
                    className="sub-segment"
                    style={{
                      background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                      height: '16px',
                      flex: 1,
                      borderRadius: '9999px',
                      position: 'relative',
                    }}
                  >
                    <div
                      className="badge"
                      style={{
                        position: 'absolute',
                        top: '28px',
                        left: '50%',
                        transform: isActiveBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                        opacity: isActiveBadge ? 1 : 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e5e5',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        color: '#0070F3',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 6px -1px rgba(0, 70, 243, 0.08)',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        zIndex: 40,
                        animation: isActiveBadge ? 'qtyDivJelly 0.5s ease-in-out' : 'none',
                      }}
                    >
                      {price}{unit}
                    </div>

                    {i === middleIndex && (
                      <div
                        className="badge-final"
                        style={{
                          position: 'absolute',
                          top: '58px',
                          left: '50%',
                          transform: activeFinalBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                          opacity: activeFinalBadge ? 1 : 0,
                          backgroundColor: '#0070F3',
                          color: '#ffffff',
                          border: '1px solid #0070F3',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 10px 15px -3px rgba(0, 112, 243, 0.3)',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          zIndex: 40,
                          animation: activeFinalBadge ? 'qtyDivJelly 0.5s ease-in-out' : 'none',
                        }}
                      >
                        {itemLabel} <span style={{ fontSize: '10px' }}>↑</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div
        className="btn-row"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <button
          className="btn-reset"
          onClick={resetDemo}
          disabled={isAnimating}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            border: '1px solid #e5e5e5',
            background: '#f5f5f5',
            color: '#525252',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          重置
        </button>
        <button
          className="btn-action"
          onClick={startAnimation}
          disabled={isAnimating || animationStage === 'done'}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: (isAnimating || animationStage === 'done') ? 'not-allowed' : 'pointer',
            border: 'none',
            background: '#0070F3',
            color: '#ffffff',
            opacity: (isAnimating || animationStage === 'done') ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcDistMul({
  type = 'CalcDistMul',
  distance = 240,
  speed = 80,
  time = 3,
  speedUnit = '千米/时',
  timeUnit = '小时',
  distanceUnit = '千米',
  itemLabel = '路程模型探究',
  buttonText = '求路程',
}: CalcDistMulProps) {
  void type
  void speedUnit
  void itemLabel
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [droppedSegments, setDroppedSegments] = useState<number[]>([])
  const [showBadges, setShowBadges] = useState<number[]>([])
  const [isShellActive, setIsShellActive] = useState<boolean>(false)
  const [showTotal, setShowTotal] = useState<boolean>(false)
  const timerRefs = useRef<number[]>([])

  const segmentArray = Array.from({ length: time })

  const clearAllTimers = () => {
    timerRefs.current.forEach((timerId) => window.clearTimeout(timerId))
    timerRefs.current = []
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const startAnimation = async () => {
    if (isAnimating) return

    setIsAnimating(true)
    setDroppedSegments([])
    setShowBadges([])
    setIsShellActive(false)
    setShowTotal(false)
    clearAllTimers()

    for (let i = 0; i < time; i += 1) {
      const dropTimer = window.setTimeout(() => {
        setDroppedSegments((prev) => [...prev, i])
      }, i * 200)
      timerRefs.current.push(dropTimer)

      await sleep(200)

      const badgeTimer = window.setTimeout(() => {
        setShowBadges((prev) => [...prev, i])
      }, 0)
      timerRefs.current.push(badgeTimer)

      await sleep(100)
    }

    await sleep(250)
    setIsShellActive(true)
    await sleep(150)
    setShowTotal(true)
    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    clearAllTimers()
    setDroppedSegments([])
    setShowBadges([])
    setIsShellActive(false)
    setShowTotal(false)
  }

  useEffect(() => {
    resetDemo()
  }, [distance, speed, time])

  return (
    <div
      className="ui-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        padding: '32px',
        maxWidth: '600px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes distMulJelly {
          0%, 100% { transform: scale(1, 1); }
          30% { transform: scale(1.15, 0.85); }
          50% { transform: scale(1.05, 0.95); }
        }
      `}</style>

      <div
        className="title-part"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcDistMul 乘法求路程组件
      </div>

      <div
        className="stage"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '64px 24px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
          minHeight: '220px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="global-shell"
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            padding: '40px 16px 24px',
            borderRadius: '20px',
            border: isShellActive ? '2px solid #0070F3' : '2px dashed transparent',
            background: isShellActive ? 'rgba(0, 112, 243, 0.01)' : 'transparent',
            boxShadow: isShellActive ? '0 12px 24px rgba(0, 112, 243, 0.05)' : 'none',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="badge badge-total"
            style={{
              position: 'absolute',
              left: '50%',
              top: '-46px',
              transform: showTotal ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
              opacity: showTotal ? 1 : 0,
              backgroundColor: '#0070F3',
              color: '#ffffff',
              border: '1px solid #0070F3',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 15px -3px rgba(0, 112, 243, 0.3)',
              zIndex: 30,
              transition: 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            }}
          >
            总路程: {distance} {distanceUnit} <span style={{ fontSize: '10px' }}>↑</span>
          </div>

          <div style={{ display: 'flex', width: '100%', gap: '4px', alignItems: 'center' }}>
            {segmentArray.map((_, i) => {
              const isDropped = droppedSegments.includes(i)
              const showBadge = showBadges.includes(i)

              return (
                <div
                  key={i}
                  className="track-segment"
                  style={{
                    flex: 1,
                    height: '16px',
                    background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                    borderRadius: '9999px',
                    position: 'relative',
                    opacity: isDropped ? 1 : 0,
                    transform: isDropped ? 'translateY(0)' : 'translateY(-40px)',
                    transition: 'all 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                  }}
                >
                  <div
                    className="segment-badge"
                    style={{
                      position: 'absolute',
                      bottom: '26px',
                      left: '50%',
                      transform: showBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                      opacity: showBadge ? 1 : 0,
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e5e5',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      color: '#171717',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      zIndex: 20,
                      animation: showBadge ? 'distMulJelly 0.4s ease-in-out' : 'none',
                    }}
                  >
                    {speed} {distanceUnit}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: '24px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#a3a3a3',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    第 {i + 1} {timeUnit}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      <div
        className="btn-row"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <button
          className="btn-reset"
          onClick={resetDemo}
          disabled={isAnimating}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            border: '1px solid #e5e5e5',
            background: '#f5f5f5',
            color: '#525252',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          重置
        </button>
        <button
          className="btn-action"
          onClick={startAnimation}
          disabled={isAnimating || droppedSegments.length === time}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: (isAnimating || droppedSegments.length === time) ? 'not-allowed' : 'pointer',
            border: 'none',
            background: '#0070F3',
            color: '#ffffff',
            opacity: (isAnimating || droppedSegments.length === time) ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcSpeedDiv({
  type = 'CalcSpeedDiv',
  distance = 240,
  speed = 80,
  time = 3,
  speedUnit = '千米/时',
  timeUnit = '小时',
  distanceUnit = '千米',
  buttonText = '求速度',
}: CalcSpeedDivProps) {
  void type
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [animationStage, setAnimationStage] = useState<'idle' | 'knives' | 'split' | 'badges'>('idle')
  const [activeKnives, setActiveKnives] = useState<number[]>([])
  const [activeBadges, setActiveBadges] = useState<number[]>([])

  const segmentArray = Array.from({ length: time })

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const startAnimation = async () => {
    if (isAnimating || time <= 1) return

    setIsAnimating(true)
    setAnimationStage('knives')
    setActiveKnives([])
    setActiveBadges([])

    for (let i = 1; i < time; i += 1) {
      await sleep(120)
      setActiveKnives((prev) => [...prev, i])
    }

    await sleep(420)
    setAnimationStage('split')
    await sleep(400)

    setAnimationStage('badges')
    for (let i = 0; i < time; i += 1) {
      setActiveBadges((prev) => [...prev, i])
      await sleep(150)
    }

    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    setAnimationStage('idle')
    setActiveKnives([])
    setActiveBadges([])
  }

  useEffect(() => {
    resetDemo()
  }, [distance, speed, time])

  return (
    <div
      className="ui-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        padding: '32px',
        maxWidth: '540px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes speedDivJelly {
          0%, 100% { transform: translateX(-50%) scale(1, 1); }
          30% { transform: translateX(-50%) scale(1.25, 0.75); }
          50% { transform: translateX(-50%) scale(1.15, 0.85); }
        }
      `}</style>

      <div
        className="title-part"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcSpeedDiv 除法求速度组件
      </div>

      <div
        className="stage"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '54px 24px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
          minHeight: '180px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="total-label"
          style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#a3a3a3',
            letterSpacing: '0.05em',
          }}
        >
          总路程: {distance} {distanceUnit}
        </div>

        <div className="stage-wrapper" style={{ position: 'relative', width: '100%', height: '64px', display: 'flex', alignItems: 'center' }}>
          <div className="knives-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
            {animationStage === 'knives' && Array.from({ length: time - 1 }).map((_, i) => {
              const knifeIndex = i + 1
              const leftPercent = (knifeIndex / time) * 100
              const isDropped = activeKnives.includes(knifeIndex)
              return (
                <div
                  key={knifeIndex}
                  className="knife-line"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `calc(${leftPercent}% - 1px)`,
                    width: '2px',
                    height: '20px',
                    backgroundColor: '#0070F3',
                    opacity: isDropped ? 1 : 0,
                    transform: isDropped ? 'translateY(22px)' : 'translateY(-24px)',
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                  }}
                />
              )
            })}
          </div>

          <div
            className="segments-container"
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              zIndex: 10,
              gap: (animationStage !== 'idle' && animationStage !== 'knives') ? '16px' : '0px',
              transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {(animationStage === 'idle' || animationStage === 'knives') ? (
              <div
                className="base-line"
                style={{
                  background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                  height: '16px',
                  width: '100%',
                  borderRadius: '9999px',
                  transition: 'all 0.4s ease',
                }}
              />
            ) : (
              segmentArray.map((_, i) => {
                const isActiveBadge = activeBadges.includes(i)

                return (
                  <div
                    key={i}
                    className="sub-segment"
                    style={{
                      background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                      height: '16px',
                      flex: 1,
                      borderRadius: '9999px',
                      position: 'relative',
                    }}
                  >
                    <div
                      className="badge"
                      style={{
                        position: 'absolute',
                        top: '28px',
                        left: '50%',
                        transform: isActiveBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                        opacity: isActiveBadge ? 1 : 0,
                        backgroundColor: '#0070F3',
                        color: '#ffffff',
                        border: '1px solid #0070F3',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 10px 15px -3px rgba(0, 112, 243, 0.2)',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        zIndex: 40,
                        animation: isActiveBadge ? 'speedDivJelly 0.5s ease-in-out' : 'none',
                      }}
                    >
                      {speed} {speedUnit} <span style={{ fontSize: '10px' }}>↑</span>
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: '#a3a3a3',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      第 {i + 1} {timeUnit}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div
        className="btn-row"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <button
          className="btn-reset"
          onClick={resetDemo}
          disabled={isAnimating}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            border: '1px solid #e5e5e5',
            background: '#f5f5f5',
            color: '#525252',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          重置
        </button>
        <button
          className="btn-action"
          onClick={startAnimation}
          disabled={isAnimating || (animationStage === 'badges' && activeBadges.length === time)}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: (isAnimating || (animationStage === 'badges' && activeBadges.length === time)) ? 'not-allowed' : 'pointer',
            border: 'none',
            background: '#0070F3',
            color: '#ffffff',
            opacity: (isAnimating || (animationStage === 'badges' && activeBadges.length === time)) ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcTimeDiv({
  type = 'CalcTimeDiv',
  distance = 240,
  speed = 80,
  time = 3,
  speedUnit = '千米/时',
  timeUnit = '小时',
  distanceUnit = '千米',
  buttonText = '求时间',
}: CalcTimeDivProps) {
  void type
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [animationStage, setAnimationStage] = useState<'idle' | 'knives' | 'split' | 'done'>('idle')
  const [activeKnives, setActiveKnives] = useState<number[]>([])
  const [activeBadges, setActiveBadges] = useState<boolean>(false)
  const [activeFinalBadge, setActiveFinalBadge] = useState<boolean>(false)

  const segmentArray = Array.from({ length: time })
  const middleIndex = Math.floor(time / 2)

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const startAnimation = async () => {
    if (isAnimating || time <= 1) return

    setIsAnimating(true)
    setAnimationStage('knives')
    setActiveKnives([])
    setActiveBadges(false)
    setActiveFinalBadge(false)

    for (let i = 1; i < time; i += 1) {
      await sleep(120)
      setActiveKnives((prev) => [...prev, i])
    }

    await sleep(300)
    setAnimationStage('split')
    await sleep(400)

    setActiveBadges(true)
    await sleep(time * 120 + 300)

    setAnimationStage('done')
    setActiveFinalBadge(true)
    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    setAnimationStage('idle')
    setActiveKnives([])
    setActiveBadges(false)
    setActiveFinalBadge(false)
  }

  useEffect(() => {
    resetDemo()
  }, [distance, speed, time])

  return (
    <div
      className="ui-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        padding: '32px',
        maxWidth: '540px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes timeDivJelly {
          0%, 100% { transform: translateX(-50%) scale(1, 1); }
          30% { transform: translateX(-50%) scale(1.25, 0.75); }
          50% { transform: translateX(-50%) scale(1.15, 0.85); }
        }
      `}</style>

      <div
        className="title-part"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcTimeDiv 除法求时间组件
      </div>

      <div
        className="stage"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '54px 24px',
          marginBottom: '24px',
          border: '1px solid #e5e5e5',
          minHeight: '180px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="total-label"
          style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#a3a3a3',
            letterSpacing: '0.05em',
          }}
        >
          总路程: {distance} {distanceUnit}
        </div>

        <div className="stage-wrapper" style={{ position: 'relative', width: '100%', height: '64px', display: 'flex', alignItems: 'center' }}>
          <div className="knives-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
            {animationStage === 'knives' && Array.from({ length: time - 1 }).map((_, i) => {
              const knifeIndex = i + 1
              const leftPercent = (knifeIndex / time) * 100
              const isDropped = activeKnives.includes(knifeIndex)
              return (
                <div
                  key={knifeIndex}
                  className="knife-line"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `calc(${leftPercent}% - 1px)`,
                    width: '2px',
                    height: '20px',
                    backgroundColor: '#0070F3',
                    opacity: isDropped ? 1 : 0,
                    transform: isDropped ? 'translateY(22px)' : 'translateY(-24px)',
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                  }}
                />
              )
            })}
          </div>

          <div
            className="segments-container"
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              zIndex: 10,
              gap: (animationStage !== 'idle' && animationStage !== 'knives') ? '16px' : '0px',
              transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {(animationStage === 'idle' || animationStage === 'knives') ? (
              <div
                className="base-line"
                style={{
                  background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                  height: '16px',
                  width: '100%',
                  borderRadius: '9999px',
                  transition: 'all 0.4s ease',
                }}
              />
            ) : (
              segmentArray.map((_, i) => {
                const showBadge = activeBadges

                return (
                  <div
                    key={i}
                    className="sub-segment"
                    style={{
                      background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
                      height: '16px',
                      flex: 1,
                      borderRadius: '9999px',
                      position: 'relative',
                    }}
                  >
                    <div
                      className="badge"
                      style={{
                        position: 'absolute',
                        bottom: '28px',
                        left: '50%',
                        transform: showBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                        opacity: showBadge ? 1 : 0,
                        backgroundColor: '#ffffff',
                        color: '#0070F3',
                        border: '1px solid #e5e5e5',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 6px -1px rgba(0, 70, 243, 0.08)',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transitionDelay: `${i * 120}ms`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        zIndex: 40,
                        animation: showBadge ? 'timeDivJelly 0.5s ease-in-out' : 'none',
                      }}
                    >
                      {speed} {speedUnit}
                    </div>

                    {i === middleIndex && (
                      <div
                        className="badge-final"
                        style={{
                          position: 'absolute',
                          top: '28px',
                          left: '50%',
                          transform: activeFinalBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                          opacity: activeFinalBadge ? 1 : 0,
                          backgroundColor: '#0070F3',
                          color: '#ffffff',
                          border: '1px solid #0070F3',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 10px 15px -3px rgba(0, 112, 243, 0.3)',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          zIndex: 50,
                          animation: activeFinalBadge ? 'timeDivJelly 0.5s ease-in-out' : 'none',
                        }}
                      >
                        {time} {timeUnit} <span style={{ fontSize: '10px' }}>↑</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div
        className="btn-row"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <button
          className="btn-reset"
          onClick={resetDemo}
          disabled={isAnimating}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            border: '1px solid #e5e5e5',
            background: '#f5f5f5',
            color: '#525252',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          重置
        </button>
        <button
          className="btn-action"
          onClick={startAnimation}
          disabled={isAnimating || animationStage === 'done'}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: (isAnimating || animationStage === 'done') ? 'not-allowed' : 'pointer',
            border: 'none',
            background: '#0070F3',
            color: '#ffffff',
            opacity: (isAnimating || animationStage === 'done') ? 0.5 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

type SubtractiveMode = 'diff' | 'remain'

interface SubtractiveCardProps {
  mode: SubtractiveMode
  total: number
  minus: number
  unit: string
  title: string
  label: string
  buttonText: string
}

function SubtractiveCard({
  mode,
  total,
  minus,
  unit,
  title,
  label,
  buttonText,
}: SubtractiveCardProps) {
  const [currentX, setCurrentX] = useState<number>(145)
  const [currentY, setCurrentY] = useState<number>(0)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isDraggedOut, setIsDraggedOut] = useState<boolean>(false)
  const [showResult, setShowResult] = useState<boolean>(false)

  const zoneRef = useRef<HTMLDivElement>(null)
  const handlerRef = useRef<HTMLDivElement>(null)
  const startDragPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const currentOffset = useRef<{ x: number; y: number }>({ x: 145, y: 0 })

  const displayTotal = Math.max(0, total)
  const displayMinus = Math.max(0, minus)
  const DRAG_THRESHOLD = 85
  const finalResultVal = Math.max(0, displayTotal - displayMinus)
  const defaultButtonText = buttonText || (mode === 'diff' ? '直接求差' : '求剩余')
  const displayLabel = label || '按住后拖拽'

  useEffect(() => {
    handleReset()
  }, [displayTotal, displayMinus, unit, mode])

  const handleReset = () => {
    setIsDraggedOut(false)
    setIsDragging(false)
    setShowResult(false)
    currentOffset.current = { x: 145, y: 0 }
    setCurrentX(145)
    setCurrentY(0)
  }

  const clampOffset = (nextX: number, nextY: number) => {
    const zoneEl = zoneRef.current
    const handlerEl = handlerRef.current

    if (!zoneEl || !handlerEl) {
      return { x: nextX, y: nextY }
    }

    const zoneRect = zoneEl.getBoundingClientRect()
    const handlerRect = handlerEl.getBoundingClientRect()
    const padding = 12
    const maxX = Math.max(padding, zoneRect.width - handlerRect.width - padding)
    const maxY = Math.max(padding, zoneRect.height - handlerRect.height - padding)

    return {
      x: Math.min(Math.max(nextX, padding), maxX),
      y: Math.min(Math.max(nextY, padding), maxY),
    }
  }

  const startDrag = (clientX: number, clientY: number) => {
    if (isDraggedOut) return
    setIsDragging(true)
    startDragPos.current = {
      x: clientX - currentOffset.current.x,
      y: clientY - currentOffset.current.y,
    }
  }

  const doDrag = (clientX: number, clientY: number) => {
    if (!isDragging || isDraggedOut) return

    const nextX = clientX - startDragPos.current.x
    const nextY = clientY - startDragPos.current.y
    const clamped = clampOffset(nextX, nextY)

    currentOffset.current = clamped
    setCurrentX(clamped.x)
    setCurrentY(clamped.y)
  }

  const triggerSuccess = () => {
    if (isDraggedOut) return
    setIsDraggedOut(true)
    currentOffset.current = { x: 150, y: 70 }
    setCurrentX(150)
    setCurrentY(70)

    setTimeout(() => {
      setShowResult(true)
    }, 250)
  }

  const stopDrag = () => {
    if (!isDragging) return
    setIsDragging(false)

    const { x, y } = currentOffset.current
    const distance = Math.sqrt((x - 145) * (x - 145) + y * y)

    if (distance >= DRAG_THRESHOLD) {
      triggerSuccess()
    } else {
      currentOffset.current = { x: 145, y: 0 }
      setCurrentX(145)
      setCurrentY(0)
    }
  }

  const handleQuickAction = () => {
    triggerSuccess()
  }

  const getPoolBorderColor = (): string => {
    if (isDraggedOut) return 'transparent'
    if (isDragging) return '#0070F3'
    return '#D6ADFF'
  }

  return (
    <div style={styles.uiCard}>
      <div style={styles.stage}>
        <div
          ref={zoneRef}
          style={{
            ...styles.interactionZone,
            height: '200px',
            overflow: 'visible',
          }}
          onMouseMove={(e) => doDrag(e.clientX, e.clientY)}
          onTouchMove={(e) => {
            if (e.touches?.[0]) doDrag(e.touches[0].clientX, e.touches[0].clientY)
          }}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onTouchEnd={stopDrag}
        >
          <div
            style={{
              ...styles.matrixPool,
              borderColor: getPoolBorderColor(),
              overflow: 'visible',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-28px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '12px',
                color: '#7928CA',
                whiteSpace: 'nowrap',
              }}
            >
              {title}: {displayTotal} {unit}
            </div>
            {Array.from({ length: displayTotal }).map((_, index) => {
              const isTargetLock = index >= displayTotal - displayMinus
              const itemTransform = isTargetLock && isDragging
                ? `translate(${(currentX - 145) * 0.15}px, ${currentY * 0.15}px)`
                : isTargetLock && isDraggedOut
                  ? 'translate(180px, 80px) scale(0)'
                  : 'none'

              return (
                <div
                  key={index}
                  style={{
                    ...styles.poolItem,
                    ...(isTargetLock ? styles.targetLock : {}),
                    transform: itemTransform,
                    opacity: isTargetLock && isDraggedOut ? 0 : 1,
                  }}
                >
                  {index + 1}
                </div>
              )
            })}
          </div>

          <div
            ref={handlerRef}
            style={{
              ...styles.dragHandler,
              transform: `translate(${currentX}px, ${currentY}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              if (e.touches?.[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY)
            }}
          >
            <span style={styles.handLabel}>{displayLabel}</span>
            <span style={styles.handNum}>拿掉 {displayMinus} {unit}</span>
          </div>

          <div style={{ ...styles.resultPanel, ...(showResult ? styles.resultPanelShow : {}) }}>
            {mode === 'diff'
              ? `相差: ${finalResultVal} ${unit} (剩下 ${finalResultVal} 个)`
              : `剩余: ${finalResultVal} ${unit} (还剩 ${finalResultVal} 个)`}
          </div>
        </div>
      </div>

      <div style={styles.btnRow}>
        <button style={styles.btnReset} onClick={handleReset}>
          重置
        </button>
        <button style={styles.btnAction} onClick={handleQuickAction}>
          {defaultButtonText}
        </button>
      </div>
    </div>
  )
}

export function CalcDiffSub({
  numA = 20,
  numB = 8,
  unit = '个',
  labelA = '大数池',
  labelB = '',
  buttonText = '求差',
}: CalcDiffSubProps) {
  return (
    <SubtractiveCard
      mode="diff"
      total={numA}
      minus={numB}
      unit={unit}
      title={labelA || '大数池'}
      label={labelB}
      buttonText={buttonText}
    />
  )
}

const sumAddStyles: { [key: string]: React.CSSProperties } = {
  uiCard: {
    background: '#FFFFFF',
    borderRadius: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
    padding: '32px',
    maxWidth: '560px',
    width: '100%',
    boxSizing: 'border-box',
  },
  stage: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px 16px',
    marginBottom: '24px',
    border: '1px solid #e5e5e5',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  interactionZone: {
    position: 'relative',
    width: '100%',
    height: '240px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    touchAction: 'none',
  },
  targetPool: {
    width: '130px',
    height: '130px',
    borderRadius: '24px',
    border: '3px dashed #D6ADFF',
    background: '#FAFAFA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    transition: 'all 0.3s ease',
    position: 'absolute',
    zIndex: 2,
  },
  poolTip: {
    fontSize: '12px',
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: '1.4',
    pointerEvents: 'none',
    userSelect: 'none',
  },
  dragBlock: {
    position: 'absolute',
    width: '76px',
    height: '76px',
    borderRadius: '18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    cursor: 'grab',
    boxShadow: '0 6px 14px rgba(0,0,0,0.1)',
    userSelect: 'none',
  },
  blockNum: {
    fontSize: '22px',
    fontWeight: '900',
    lineHeight: '1.1',
  },
  blockLabel: {
    fontSize: '11px',
    opacity: 0.85,
    marginTop: '2px',
    whiteSpace: 'nowrap',
  },
  resultPanel: {
    position: 'absolute',
    bottom: '0px',
    transform: 'scale(0.8)',
    opacity: 0,
    background: '#0070F3',
    color: 'white',
    padding: '8px 20px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 'bold',
    boxShadow: '0 8px 24px rgba(0, 112, 243, 0.3)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    pointerEvents: 'none',
    zIndex: 20,
  },
  resultPanelShow: {
    transform: 'scale(1)',
    opacity: 1,
    bottom: '10px',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '12px',
    width: '100%',
  },
  btnReset: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid #e5e5e5',
    background: '#f5f5f5',
    color: '#525252',
  },
  btnAction: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    background: '#0070F3',
    color: '#ffffff',
  },
}

function JoinSumCard({
  parts,
  unit,
  labels,
  buttonText,
}: {
  parts: number[]
  unit: string
  labels: string[]
  buttonText: string
}) {
  const count = Math.max(2, parts.length)
  const initialPositions = parts.map((_, index) => {
    const spread = 120
    const centerOffset = (index - (count - 1) / 2) * spread
    return {
      x: centerOffset,
      y: -92,
    }
  })

  const [dragStates, setDragStates] = useState<DragState[]>(
    parts.map((_, index) => ({
      isDragging: false,
      x: initialPositions[index]?.x ?? 0,
      y: initialPositions[index]?.y ?? -92,
      startX: 0,
      startY: 0,
      isSnapped: false,
    })),
  )
  const [showResult, setShowResult] = useState<boolean>(false)

  const activeIndex = useRef<number | null>(null)
  const SNAP_THRESHOLD = 60

  useEffect(() => {
    handleReset()
  }, [parts.length, parts.join(','), unit, labels.join(','), buttonText])

  const handleReset = () => {
    setDragStates(
      parts.map((_, index) => ({
        isDragging: false,
        x: initialPositions[index]?.x ?? 0,
        y: initialPositions[index]?.y ?? -92,
        startX: 0,
        startY: 0,
        isSnapped: false,
      })),
    )
    setShowResult(false)
    activeIndex.current = null
  }

  const handleQuickSum = () => {
    setDragStates((prev) =>
      prev.map((state) => ({
        ...state,
        x: 0,
        y: 0,
        isDragging: false,
        isSnapped: true,
      })),
    )
    setShowResult(true)
  }

  const startDrag = (index: number, clientX: number, clientY: number) => {
    if (showResult) return
    activeIndex.current = index
    const target = dragStates[index]

    setDragStates((prev) =>
      prev.map((state, currentIndex) =>
        currentIndex === index
          ? {
              ...state,
              isDragging: true,
              startX: clientX - state.x,
              startY: clientY - state.y,
            }
          : state,
      ),
    )
    void target
  }

  const doDrag = (clientX: number, clientY: number) => {
    if (activeIndex.current === null) return

    const index = activeIndex.current
    const target = dragStates[index]
    if (!target?.isDragging) return

    const nextX = clientX - target.startX
    const nextY = clientY - target.startY

    setDragStates((prev) =>
      prev.map((state, currentIndex) =>
        currentIndex === index
          ? {
              ...state,
              x: nextX,
              y: nextY,
            }
          : state,
      ),
    )
  }

  const stopDrag = () => {
    if (activeIndex.current === null) return

    const index = activeIndex.current
    const target = dragStates[index]
    activeIndex.current = null

    if (!target?.isDragging) return

    const distanceToCenter = Math.sqrt(target.x * target.x + target.y * target.y)

    if (distanceToCenter < SNAP_THRESHOLD) {
      setDragStates((prev) =>
        prev.map((state, currentIndex) =>
          currentIndex === index
            ? {
                ...state,
                isDragging: false,
                x: 0,
                y: 0,
                isSnapped: true,
              }
            : state,
        ),
      )

      const snappedCount = dragStates.filter((state) => state.isSnapped).length + 1
      if (snappedCount === dragStates.length) {
        setTimeout(() => {
          setShowResult(true)
        }, 200)
      }
    } else {
      setDragStates((prev) =>
        prev.map((state, currentIndex) =>
          currentIndex === index
            ? {
                ...state,
                isDragging: false,
                x: initialPositions[currentIndex]?.x ?? 0,
                y: initialPositions[currentIndex]?.y ?? -92,
                isSnapped: false,
              }
            : state,
        ),
      )
    }
  }

  const getPoolStyle = (): React.CSSProperties => {
    const allSnapped = dragStates.every((state) => state.isSnapped)
    if (allSnapped) {
      return { ...sumAddStyles.targetPool, borderColor: '#0070F3', background: '#E6F1FF' }
    }
    if (dragStates.some((state) => state.isDragging)) {
      return { ...sumAddStyles.targetPool, borderColor: '#7928CA', background: '#F5E9FF' }
    }
    return sumAddStyles.targetPool
  }

  const total = parts.reduce((sum, value) => sum + value, 0)

  return (
    <div style={sumAddStyles.uiCard}>
      <div style={sumAddStyles.stage}>
        <div
          style={sumAddStyles.interactionZone}
          onMouseMove={(e) => { doDrag(e.clientX, e.clientY) }}
          onTouchMove={(e) => { if (e.touches?.[0]) doDrag(e.touches[0].clientX, e.touches[0].clientY) }}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onTouchEnd={stopDrag}
        >
          <div style={getPoolStyle()}>
            {dragStates.every((state) => !state.isSnapped) && <span style={sumAddStyles.poolTip}>把这些数拖到这里</span>}
            {dragStates.some((state) => state.isSnapped) && !dragStates.every((state) => state.isSnapped) && <span style={sumAddStyles.poolTip}>还差一个数...</span>}
            {showResult && <span style={{ ...sumAddStyles.poolTip, color: '#0070F3', fontWeight: 'bold' }}>成功合在一起！</span>}
          </div>

          {dragStates.map((state, index) => (
            <div
              key={index}
              style={{
                ...sumAddStyles.dragBlock,
                background: index % 2 === 0
                  ? 'linear-gradient(135deg, #7928CA 0%, #B800FF 100%)'
                  : 'linear-gradient(135deg, #FF0080 0%, #FF60B0 100%)',
                transform: `translate(${state.x}px, ${state.y}px) scale(${state.isSnapped ? 0.85 : 1})`,
                transition: state.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15)',
                zIndex: state.isDragging ? 15 : 10 + index,
                opacity: showResult ? 0.3 : 1,
              }}
              onMouseDown={(e) => startDrag(index, e.clientX, e.clientY)}
              onTouchStart={(e) => { if (e.touches?.[0]) startDrag(index, e.touches[0].clientX, e.touches[0].clientY) }}
            >
              <span style={sumAddStyles.blockNum}>{parts[index]}</span>
              <span style={sumAddStyles.blockLabel}>{labels[index] || `部分${index + 1}`}</span>
            </div>
          ))}

          <div style={{ ...sumAddStyles.resultPanel, ...(showResult ? sumAddStyles.resultPanelShow : {}) }}>
            总和: {total} {unit}
          </div>
        </div>
      </div>

      <div style={sumAddStyles.btnRow}>
        <button style={sumAddStyles.btnReset} onClick={handleReset}>
          重置
        </button>
        <button style={sumAddStyles.btnAction} onClick={handleQuickSum}>
          {buttonText || '求和'}
        </button>
      </div>
    </div>
  )
}

export function CalcSumAdd({
  parts = [3, 5],
  unit = '个',
  labels = ['', ''],
  buttonText = '求和',
}: CalcSumAddProps) {
  return <JoinSumCard parts={parts} unit={unit} labels={labels} buttonText={buttonText} />
}

export function CalcRemainSub({
  total = 20,
  used = 8,
  unit = '个',
  totalLabel = '总数池',
  usedLabel = '',
  buttonText = '求剩余',
}: CalcRemainSubProps) {
  return (
    <SubtractiveCard
      mode="remain"
      total={total}
      minus={used}
      unit={unit}
      title={totalLabel || '总数池'}
      label={usedLabel}
      buttonText={buttonText}
    />
  )
}

export function CalcTimesDiv({
  type = 'times',
  numA = 12,
  numB = 1,
  baseNum = 4,
  multiple = 3,
  unit = '倍',
  labelA = '总量',
  labelB = '',
  labelBase = '底数',
  buttonText = '开始切分求倍数',
}: CalcTimesDivProps) {
  void type
  void numB
  void labelB

  const totalSegments = Math.max(1, multiple)
  const segmentArray = Array.from({ length: totalSegments })
  const middleIndex = Math.floor(totalSegments / 2)
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [animationStage, setAnimationStage] = useState<'idle' | 'knives' | 'split' | 'badges' | 'final'>('idle')
  const [activeKnives, setActiveKnives] = useState<number[]>([])
  const [activeBadges, setActiveBadges] = useState<number[]>([])

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const startAnimation = async () => {
    if (isAnimating || totalSegments <= 1) return

    setIsAnimating(true)
    setAnimationStage('knives')
    setActiveKnives([])
    setActiveBadges([])

    for (let i = 1; i < totalSegments; i += 1) {
      await sleep(150)
      setActiveKnives((prev) => [...prev, i])
    }

    await sleep(450)
    setAnimationStage('split')
    await sleep(400)

    setAnimationStage('badges')
    for (let i = 0; i < totalSegments; i += 1) {
      setActiveBadges((prev) => [...prev, i])
      await sleep(120)
    }

    await sleep(300)
    setAnimationStage('final')
    setIsAnimating(false)
  }

  const resetDemo = () => {
    if (isAnimating) return
    setAnimationStage('idle')
    setActiveKnives([])
    setActiveBadges([])
  }

  useEffect(() => {
    resetDemo()
  }, [numA, baseNum, multiple, unit, labelA, labelBase])

  const labelText = `${labelA || '总量'}: ${numA} ${unit}`
  const finalText = `${multiple} ${unit}`

  return (
    <div style={timesDivStyles.uiCard}>
      <style>{`
        @keyframes calcTimesDivJelly {
          0%, 100% { transform: translateX(-50%) scale(1, 1); }
          30% { transform: translateX(-50%) scale(1.25, 0.75); }
          50% { transform: translateX(-50%) scale(1.15, 0.85); }
        }
      `}</style>

      <div
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#171717',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        CalcTimesDiv
      </div>

      <div style={timesDivStyles.stage}>
        <div style={timesDivStyles.interactionZone}>
          <div style={timesDivStyles.stageWrapper}>
            <div style={timesDivStyles.knivesLayer}>
              {animationStage === 'knives' && Array.from({ length: totalSegments - 1 }).map((_, i) => {
                const knifeIndex = i + 1
                const leftPercent = (knifeIndex / totalSegments) * 100
                const isDropped = activeKnives.includes(knifeIndex)

                return (
                  <div
                    key={knifeIndex}
                    style={{
                      ...timesDivStyles.knifeLine,
                      left: `calc(${leftPercent}% - 1px)`,
                      opacity: isDropped ? 1 : 0,
                      transform: isDropped ? 'translateY(22px)' : 'translateY(-24px)',
                    }}
                  />
                )
              })}
            </div>

            <div
              style={{
                ...timesDivStyles.segmentsContainer,
                gap: animationStage === 'split' || animationStage === 'badges' || animationStage === 'final' ? '16px' : '0px',
              }}
            >
              {animationStage === 'idle' || animationStage === 'knives' ? (
                <div style={timesDivStyles.baseLine} />
              ) : (
                segmentArray.map((_, i) => {
                  const isActiveBadge = activeBadges.includes(i)
                  const isCenter = i === middleIndex

                  return (
                    <div
                      key={i}
                      style={{
                        ...timesDivStyles.subSegment,
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <div
                        style={{
                          ...timesDivStyles.badge,
                          ...timesDivStyles.badgeTop,
                          opacity: isActiveBadge ? 1 : 0,
                          transform: isActiveBadge ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                          animation: isActiveBadge ? 'calcTimesDivJelly 0.5s ease-in-out' : 'none',
                        }}
                      >
                        {labelBase || '底数'}: {baseNum} {unit}
                      </div>

                      {isCenter && (
                        <div
                          style={{
                            ...timesDivStyles.badgeFinal,
                            opacity: animationStage === 'final' ? 1 : 0,
                            transform: animationStage === 'final' ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.75)',
                            animation: animationStage === 'final' ? 'calcTimesDivJelly 0.5s ease-in-out' : 'none',
                          }}
                        >
                          {finalText}
                          <span style={{ fontSize: '10px', marginLeft: '4px' }}>↑</span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {animationStage === 'idle' && (
              <div style={{
                position: 'absolute',
                top: '-10px',
                left: '-10px',
                right: '-10px',
                bottom: '-10px',
                border: '2px dashed #0070F3',
                borderRadius: '12px',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '6px',
              }}>
                <span style={{
                  fontSize: '12px',
                  color: '#0070F3',
                  fontWeight: 'bold',
                  background: '#ffffff',
                  padding: '0 6px',
                }}>
                  {labelText}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={timesDivStyles.btnRow}>
        <button style={timesDivStyles.btnReset} onClick={resetDemo} disabled={isAnimating}>
          重置
        </button>
        <button
          style={{
            ...timesDivStyles.btnAction,
            opacity: isAnimating || animationStage === 'final' ? 0.5 : 1,
            cursor: isAnimating || animationStage === 'final' ? 'not-allowed' : 'pointer',
          }}
          onClick={startAnimation}
          disabled={isAnimating || animationStage === 'final'}
        >
          {animationStage === 'final' ? '切分完成' : buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcTimesMul({
  baseNum = 4,
  multiple = 3,
  unit = '个',
  labelBase = '',
  buttonText = '求一倍数的几倍',
}: CalcTimesMulProps) {
  void unit
  const [renderedCount, setRenderedCount] = useState(1)
  const targetResult = baseNum * multiple

  return (
    <div style={styles.card}>
      <div style={styles.stage}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '100%' }}>
            <div style={styles.miniLabel}>{labelBase || '基础量'}: {baseNum} {unit}</div>
            <div style={{ display: 'flex', gap: '3px', width: '60px' }}>
              {Array.from({ length: baseNum }).map((_, i) => <div key={i} style={{ width: '8px', height: '8px', background: '#0070F3', borderRadius: '50%' }} />)}
            </div>
          </div>
          <div style={{ width: '100%', borderTop: '1px dashed #ccc', paddingTop: '12px' }}>
            <div style={styles.miniLabel}>基础量的几倍 (当前: {renderedCount} 倍)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Array.from({ length: renderedCount }).map((_, row) => (
                <div key={row} style={{ display: 'flex', gap: '3px', background: '#F5E9FF', padding: '4px', borderRadius: '4px', animation: 'jelly 0.3s ease' }}>
                  {Array.from({ length: baseNum }).map((_, i) => <div key={i} style={{ width: '8px', height: '8px', background: '#7928CA', borderRadius: '50%' }} />)}
                </div>
              ))}
            </div>
          </div>
          {showResultPanel(renderedCount === multiple, `总共几倍数量: ${targetResult} ${unit}`)}
        </div>
      </div>
      <div style={styles.btnRow}>
        <button style={styles.btnReset} onClick={() => setRenderedCount(1)}>重置</button>
        <button style={styles.btnAction} onClick={() => setRenderedCount(multiple)}>{buttonText}</button>
      </div>
    </div>
  )
}

export function CalcFracPart({
  type = 'frac_part',
  total = 12,
  part = 8,
  numerator = 2,
  denominator = 3,
  unit = '个',
  buttonText = '下一步',
}: CalcFracPartProps) {
  void type
  const safeTotal = normalizePositiveInteger(total, 12)
  const safeDenominator = normalizePositiveInteger(denominator, 3)
  const safeNumerator = clampNumber(normalizePositiveInteger(numerator, 2), 1, safeDenominator)
  const singleUnitValue = useMemo(() => safeTotal / safeDenominator, [safeTotal, safeDenominator])
  const expectedPart = useMemo(() => singleUnitValue * safeNumerator, [singleUnitValue, safeNumerator])
  const finalPart = Number.isFinite(part) ? part : expectedPart
  const [currentStep, setCurrentStep] = useState<CalcFracPartStep>('idle')

  useEffect(() => {
    setCurrentStep('idle')
  }, [safeTotal, safeDenominator, safeNumerator, finalPart, unit])

  const handleNextStep = () => {
    setCurrentStep((step) => {
      switch (step) {
        case 'idle':
          return 'divide'
        case 'divide':
          return 'multiply'
        case 'multiply':
          return 'done'
        default:
          return step
      }
    })
  }

  const handleReset = () => {
    setCurrentStep('idle')
  }

  const stageHint = {
    idle: `先看总数 ${safeTotal} ${unit}`,
    divide: `把总数平均分成 ${safeDenominator} 份`,
    multiply: `取其中 ${safeNumerator} 份`,
    done: '计算完成',
  }[currentStep]

  const showSegments = currentStep !== 'idle'
  const showResult = currentStep === 'done'

  return (
    <div style={styles.card}>
      <div
        style={{
          ...styles.stage,
          overflow: 'visible',
          padding: '64px 24px',
          marginBottom: '24px',
          minHeight: '280px',
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
            overflow: 'visible',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#7a7a7a' }}>{stageHint}</div>

          {currentStep === 'idle' && (
            <div
              style={{
                width: '100%',
                height: '52px',
                background: '#0070F3',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,112,243,0.15)',
              }}
            >
              <span style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>
                总数: {safeTotal} {unit}
              </span>
            </div>
          )}

          {showSegments && (
            <div
              style={{
                display: 'flex',
                width: '100%',
                gap: '10px',
                justifyContent: 'center',
                alignItems: 'stretch',
                position: 'relative',
              }}
            >
              {Array.from({ length: safeDenominator }).map((_, index) => {
                const isHighlighted = (currentStep === 'multiply' || currentStep === 'done') && index < safeNumerator

                return (
                  <div
                    key={`part-seg-${index}`}
                    style={{
                      flex: 1,
                      height: '52px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      background: isHighlighted ? 'linear-gradient(135deg, #00DFD8 0%, #0070F3 100%)' : '#EAEAEA',
                      color: isHighlighted ? '#ffffff' : '#666666',
                      boxShadow: isHighlighted ? '0 4px 12px rgba(0,112,243,0.2)' : 'none',
                      border: currentStep === 'divide' ? '2px solid #0070F3' : 'none',
                    }}
                  >
                    {formatDisplayNumber(singleUnitValue)} {unit}
                  </div>
                )
              })}
            </div>
          )}

          <div
            style={{
              ...styles.badgeFinal,
              top: 'auto',
              bottom: '-56px',
              opacity: showResult ? 1 : 0,
              transform: showResult ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.92)',
              pointerEvents: 'none',
            }}
          >
            部分量结果: <span style={{ color: '#00DFD8', marginLeft: '6px' }}>{formatDisplayNumber(finalPart)} {unit}</span>
            <div style={{ marginTop: '2px', fontSize: '10px', fontWeight: 700, opacity: 0.7 }}>
              {formatDisplayNumber(safeTotal)} ÷ {safeDenominator} × {safeNumerator} = {formatDisplayNumber(expectedPart)}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.btnRow}>
        <button type="button" style={styles.btnReset} onClick={handleReset}>
          重置
        </button>
        <button
          type="button"
          style={styles.btnAction}
          onClick={handleNextStep}
          disabled={currentStep === 'done'}
        >
          {currentStep === 'done' ? '运算完成' : buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcFracRate({
  type = 'frac_rate',
  total = 12,
  part = 8,
  numerator = 8,
  denominator = 12,
  unit = '个',
  buttonText = '下一步',
}: CalcFracRateProps) {
  void type
  void denominator

  const safeTotal = Math.max(1, total)
  const safeNumerator = Math.max(0, Math.min(numerator, safeTotal))
  const safePart = Math.max(0, Math.min(part, safeTotal))

  const getGCD = (a: number, b: number): number => (b === 0 ? Math.abs(a) : getGCD(b, a % b))

  const gcd = useMemo(() => getGCD(safeNumerator, safeTotal), [safeNumerator, safeTotal])
  const simpNumerator = useMemo(() => (gcd > 0 ? safeNumerator / gcd : safeNumerator), [safeNumerator, gcd])
  const simpDenominator = useMemo(() => (gcd > 0 ? safeTotal / gcd : safeTotal), [safeTotal, gcd])

  const [currentStep, setCurrentStep] = useState<'idle' | 'show_origin' | 'show_gcd_group' | 'do_reduce' | 'done'>('idle')

  const handleNextStep = () => {
    switch (currentStep) {
      case 'idle':
        setCurrentStep('show_origin')
        break
      case 'show_origin':
        setCurrentStep(gcd > 1 ? 'show_gcd_group' : 'do_reduce')
        break
      case 'show_gcd_group':
        setCurrentStep('do_reduce')
        break
      case 'do_reduce':
        setCurrentStep('done')
        break
      default:
        break
    }
  }

  const handleReset = () => {
    setCurrentStep('idle')
  }

  return (
    <div style={styles.card}>
      <div style={styles.stage}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', overflow: 'visible' }}>
          {currentStep === 'idle' && (
            <div style={{ width: '100%', height: '24px', background: '#eee', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  width: `${(safePart / safeTotal) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #7928CA, #FF0080)',
                  transition: 'width 0.5s',
                }}
              />
              <div style={{ position: 'absolute', top: '4px', left: '8px', fontSize: '11px', color: '#fff', fontWeight: 'bold' }}>部分量: {safePart} {unit}</div>
              <div style={{ position: 'absolute', top: '4px', right: '8px', fontSize: '11px', color: '#666' }}>总量: {safeTotal} {unit}</div>
            </div>
          )}

          {(currentStep === 'show_origin' || currentStep === 'show_gcd_group') && (
            <>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#8b8b8b',
                  padding: '0 4px',
                }}
              >
                <span>部分量: {safeNumerator} {unit}</span>
                <span>总量: {safeTotal} {unit}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  gap: '4px',
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {Array.from({ length: safeTotal }).map((_, index) => {
                  const isPart = index < safeNumerator
                  const isGroupStart = currentStep === 'show_gcd_group' && gcd > 1 && index % gcd === 0
                  return (
                    <div
                      key={`origin-${index}`}
                      style={{
                        position: 'relative',
                        width: `calc((100% - ${(safeTotal - 1) * 4}px) / ${safeTotal})`,
                        height: '46px',
                        background: isPart ? '#0070F3' : '#EAEAEA',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isPart ? '#ffffff' : '#666666',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        overflow: 'visible',
                      }}
                    >
                      {isGroupStart && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            left: '-2px',
                            width: `calc(${gcd} * 100% + ${(gcd - 1) * 4}px + 4px)`,
                            height: '58px',
                            border: '4px dashed #7928CA',
                            borderRadius: '12px',
                            pointerEvents: 'none',
                            zIndex: 10,
                            boxShadow: '0 0 12px rgba(121, 40, 202, 0.2)',
                            animation: 'fadeIn 0.4s ease forwards',
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {(currentStep === 'do_reduce' || currentStep === 'done') && (
            <div
              style={{
                display: 'flex',
                width: '100%',
                gap: '16px',
                alignItems: 'stretch',
                justifyContent: 'center',
                overflow: 'visible',
              }}
            >
              {Array.from({ length: simpDenominator }).map((_, index) => {
                const isPart = index < simpNumerator
                return (
                  <div
                    key={`simp-${index}`}
                    style={{
                      width: `calc((100% - ${(simpDenominator - 1) * 16}px) / ${simpDenominator})`,
                      height: '46px',
                      background: isPart ? 'linear-gradient(135deg, #00DFD8 0%, #0070F3 100%)' : '#D5D5D5',
                      color: isPart ? '#ffffff' : '#666666',
                      boxShadow: isPart ? '0 4px 10px rgba(0,112,243,0.15)' : 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                  >
                    第 {index + 1} 组
                  </div>
                )
              })}
            </div>
          )}

          <div
            style={{
              marginTop: '4px',
              background: '#0070F3',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: currentStep === 'done' ? 'scale(1)' : 'scale(0.8)',
              opacity: currentStep === 'done' ? 1 : 0,
              pointerEvents: 'none',
            }}
          >
            约分最终占比: <span style={{ color: '#00DFD8', marginLeft: '6px' }}>{simpNumerator} / {simpDenominator}</span>
          </div>
        </div>
      </div>

      <div style={styles.btnRow}>
        <button style={styles.btnReset} onClick={handleReset}>重置</button>
        <button style={styles.btnAction} onClick={handleNextStep} disabled={currentStep === 'done'}>
          {currentStep === 'done' ? '分析完成' : buttonText}
        </button>
      </div>
    </div>
  )
}

export function CalcAvgDiv({
  total = 12,
  count = 3,
  unit = '个',
  totalLabel = '总量',
  buttonText = '下一步',
}: CalcAvgDivProps) {
  const safeCount = Math.max(1, Math.round(count))
  const avgValue = useMemo(() => total / safeCount, [total, safeCount])
  const [currentStep, setCurrentStep] = useState<'idle' | 'do_divide' | 'done'>('idle')

  const handleNextStep = () => {
    switch (currentStep) {
      case 'idle':
        setCurrentStep('do_divide')
        break
      case 'do_divide':
        setCurrentStep('done')
        break
      default:
        break
    }
  }

  const handleReset = () => {
    setCurrentStep('idle')
  }

  return (
    <div style={styles.card}>
      <div
        style={{
          ...styles.stage,
          overflow: 'visible',
          padding: '64px 24px',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', overflow: 'visible' }}>
          <div style={styles.miniLabel}>{totalLabel || '总量'}: {total} {unit} 平均分到 {safeCount} 个容器里</div>

          {currentStep === 'idle' && (
            <div
              style={{
                width: '100%',
                height: '52px',
                background: '#0070F3',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,112,243,0.15)',
              }}
            >
              <div style={{
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}>
                <span style={styles.totalBarText}>
                  {totalLabel || '总量'}: {total} {unit}
                </span>
              </div>
            </div>
          )}

          {(currentStep === 'do_divide' || currentStep === 'done') && (
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '52px',
                justifyContent: 'center',
                alignItems: 'stretch',
                gap: currentStep === 'done' ? '12px' : '4px',
                position: 'relative',
                zIndex: 2,
                overflow: 'visible',
              }}
            >
              {Array.from({ length: safeCount }).map((_, index) => {
                return (
                  <div
                    key={`avg-div-${index}`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: '100%',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      background: currentStep === 'done'
                        ? 'linear-gradient(135deg, #00DFD8 0%, #0070F3 100%)'
                        : '#EAEAEA',
                      color: currentStep === 'done' ? '#ffffff' : '#666666',
                      boxShadow: currentStep === 'done' ? '0 4px 12px rgba(0,112,243,0.15)' : 'none',
                    }}
                  >
                    {currentStep === 'done' ? `${avgValue} ${unit}` : `第 ${index + 1} 份`}
                  </div>
                )
              })}

              {currentStep === 'do_divide' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    bottom: '-10px',
                    left: '-4px',
                    right: '-4px',
                    border: '3px dashed #FF0055',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                    zIndex: 10,
                    boxShadow: '0 0 10px rgba(255, 0, 85, 0.15)',
                  }}
                />
              )}
            </div>
          )}

          <div
            style={{
              ...styles.badgeFinal,
              opacity: currentStep === 'done' ? 1 : 0,
              transform: currentStep === 'done' ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.8)',
            }}
          >
            平均数结果: <span style={{ color: '#00DFD8', marginLeft: '6px' }}>{avgValue} {unit}</span>
          </div>

          <div style={styles.btnRow}>
            <button style={styles.btnReset} onClick={handleReset}>重置</button>
            <button style={styles.btnAction} onClick={handleNextStep} disabled={currentStep === 'done'}>
              {currentStep === 'done' ? '运算完成' : buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CalcMultiSum({
  parts = [2, 3, 4],
  unit = '个',
  labels = [],
  buttonText = '求总数',
}: CalcMultiSumProps) {
  return <JoinSumCard parts={parts} unit={unit} labels={labels} buttonText={buttonText} />
}

export function TimeSubSpan({
  startTime = '08:00',
  endTime = '09:30',
  pauseMinutes = 10,
  durationMinutes = 90,
  buttonText = '下一步',
}: TimeSubSpanProps) {
  const parseToMin = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map((value) => Number(value))
    return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0)
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0')
    const mins = (minutes % 60).toString().padStart(2, '0')
    return `${hours}:${mins}`
  }

  const startMin = useMemo(() => parseToMin(startTime), [startTime])
  const endMin = useMemo(() => parseToMin(endTime), [endTime])
  const timeSegments = useMemo(() => {
    const segments: Array<{
      startLabel: string
      endLabel: string
      duration: number
      isFullHour: boolean
    }> = []

    let currentMin = startMin
    while (currentMin < endMin) {
      const nextMin = Math.min(currentMin + 60, endMin)
      const duration = nextMin - currentMin
      segments.push({
        startLabel: formatTime(currentMin),
        endLabel: formatTime(nextMin),
        duration,
        isFullHour: duration === 60,
      })
      currentMin = nextMin
    }

    return segments
  }, [endMin, startMin])

  const [visibleCount, setVisibleCount] = useState(0)
  const [hasCutPause, setHasCutPause] = useState(false)

  useEffect(() => {
    setVisibleCount(0)
    setHasCutPause(false)
  }, [startTime, endTime, pauseMinutes, durationMinutes])

  const handleNextSegment = () => {
    setVisibleCount((prev) => Math.min(prev + 1, timeSegments.length))
  }

  const handleTogglePause = () => {
    setHasCutPause((prev) => !prev)
  }

  const handleReset = () => {
    setVisibleCount(0)
    setHasCutPause(false)
  }

  return (
    <div style={styles.card}>
      <div
        style={{
          ...styles.stage,
          overflow: 'visible',
          padding: '32px 24px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div style={styles.switchWrapper}>
            <span style={styles.switchLabel}>这道题有需要扣除的休息/暂停时间吗？</span>
            <button
              type="button"
              onClick={handleTogglePause}
              style={{
                ...styles.btnToggle,
                backgroundColor: hasCutPause ? '#7928CA' : '#EAEAEA',
                color: hasCutPause ? '#FFFFFF' : '#666666',
              }}
            >
              {hasCutPause ? '🔴 需要扣除暂停' : '⚪ 不需要扣除'}
            </button>
          </div>

          {visibleCount === 0 && (
            <div style={styles.idleText}>点击下方按钮，开始画时间线段</div>
          )}

          <div style={styles.segmentListContainer}>
            {timeSegments.slice(0, visibleCount).map((segment, index) => {
              const isLastSegment = index === timeSegments.length - 1

              return (
                <div key={`time-sub-span-${index}`} style={styles.segmentRow}>
                  <span style={styles.timeLabel}>{segment.startLabel}</span>

                  <div style={styles.trackBase}>
                    <div
                      style={{
                        ...styles.fillBar,
                        width: `${(segment.duration / 60) * 100}%`,
                        background: segment.isFullHour
                          ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                          : 'linear-gradient(90deg, #0070F3 0%, #00DFD8 100%)',
                      }}
                    >
                      <span style={styles.barText}>
                        {segment.isFullHour ? '满 1 小时' : `${segment.duration} 分钟`}
                      </span>

                      {isLastSegment && hasCutPause && pauseMinutes > 0 && (
                        <div
                          style={{
                            ...styles.pauseOverlayBlock,
                            width: `${Math.min(100, (pauseMinutes / Math.max(1, segment.duration)) * 100)}%`,
                          }}
                        >
                          {`-${pauseMinutes}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <span style={styles.timeLabel}>{segment.endLabel}</span>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      <div style={styles.controlPanel}>
        <div style={styles.btnRow}>
          <button style={styles.btnReset} onClick={handleReset}>重置</button>
          <button
            style={styles.btnAction}
            onClick={handleNextSegment}
            disabled={visibleCount === timeSegments.length}
          >
            {visibleCount === timeSegments.length ? '线段绘制完' : buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

export function TimeAddPass({
  type = 'time_add_pass',
  startTime = '09:00',
  endTime = '11:45',
  pauseMinutes = 30,
  durationMinutes = 135,
  buttonText = '画一段时间',
}: TimeAddPassProps) {
  void type
  void endTime

  const parseToMin = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map((value) => Number(value))
    return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0)
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0')
    const mins = (minutes % 60).toString().padStart(2, '0')
    return `${hours}:${mins}`
  }

  const startMin = useMemo(() => parseToMin(startTime), [startTime])

  const [visibleCount, setVisibleCount] = useState<number>(0)
  const [hasAddPause, setHasAddPause] = useState<boolean>(false)

  const durationSegments = useMemo(() => {
    const list: Array<{
      type: 'duration' | 'pause'
      startLabel: string
      endLabel: string
      duration: number
      isFullHour: boolean
    }> = []

    let remMinutes = durationMinutes
    let currentRunningMin = startMin

    while (remMinutes > 0) {
      const stepMinutes = Math.min(60, remMinutes)
      const nextMin = currentRunningMin + stepMinutes
      list.push({
        type: 'duration',
        startLabel: formatTime(currentRunningMin),
        endLabel: formatTime(nextMin),
        duration: stepMinutes,
        isFullHour: stepMinutes === 60,
      })
      currentRunningMin = nextMin
      remMinutes -= stepMinutes
    }

    return list
  }, [durationMinutes, startMin])

  const segments = useMemo(() => {
    if (!hasAddPause) {
      return durationSegments
    }

    return [
      ...durationSegments,
      {
        type: 'pause' as const,
        startLabel: formatTime(startMin + durationMinutes),
        endLabel: formatTime(startMin + durationMinutes + pauseMinutes),
        duration: pauseMinutes,
        isFullHour: false,
      },
    ]
  }, [durationMinutes, durationSegments, hasAddPause, pauseMinutes, startMin])

  useEffect(() => {
    setVisibleCount(0)
    setHasAddPause(false)
  }, [startTime, endTime, pauseMinutes, durationMinutes])

  const handleNextSegment = () => {
    if (visibleCount < segments.length) {
      setVisibleCount((prev) => prev + 1)
    }
  }

  const handleTogglePause = () => {
    setHasAddPause((prev) => {
      const nextState = !prev
      if (nextState) {
        setVisibleCount((current) =>
          Math.max(current, durationSegments.length + (pauseMinutes > 0 ? 1 : 0)),
        )
      } else {
        setVisibleCount((current) => Math.min(current, durationSegments.length))
      }
      return nextState
    })
  }

  const handleReset = () => {
    setVisibleCount(0)
    setHasAddPause(false)
  }

  return (
    <div style={styles.card}>
      <div
        style={{
          ...styles.stage,
          overflow: 'visible',
          padding: '32px 24px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div style={styles.switchWrapper}>
            <span style={styles.switchLabel}>需要把中间停下来没动(休息)的时间也加上吗?</span>
            <button
              onClick={handleTogglePause}
              style={{
                ...styles.btnToggle,
                backgroundColor: hasAddPause ? '#7928CA' : '#EAEAEA',
                color: hasAddPause ? '#FFFFFF' : '#666666',
              }}
            >
              {hasAddPause ? '需要加上' : '不需要加上'}
            </button>
          </div>

          {visibleCount === 0 && (
            <div style={styles.idleText}>点击下方按钮，开始画出经过的时间线段</div>
          )}

          <div style={styles.segmentListContainer}>
            {segments.slice(0, visibleCount).map((segment, index) => {
              const widthPercent = (segment.duration / 60) * 100

              let bgGradient = 'linear-gradient(90deg, #0070F3 0%, #00DFD8 100%)'
              let textLabel = `增加 ${segment.duration} 分钟`

              if (segment.type === 'duration' && segment.isFullHour) {
                bgGradient = 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                textLabel = '增加 1 小时'
              } else if (segment.type === 'pause') {
                bgGradient = 'linear-gradient(90deg, #7928CA 0%, #A855F7 100%)'
                textLabel = `加上休息 ${segment.duration} 分钟`
              }

              return (
                <div key={`add-seg-${index}`} style={styles.segmentRow}>
                  <span style={styles.timeLabel}>{segment.startLabel}</span>

                  <div style={styles.trackBase}>
                    <div
                      style={{
                        ...styles.fillBar,
                        width: `${widthPercent}%`,
                        background: bgGradient,
                      }}
                    >
                      <span style={styles.barText}>{textLabel}</span>
                    </div>
                  </div>

                  <span style={styles.timeLabel}>{segment.endLabel}</span>
                </div>
              )
            })}
          </div>

        </div>
      </div>
      <div style={styles.controlPanel}>
        <div style={styles.btnRow}>
          <button style={styles.btnReset} onClick={handleReset}>重置</button>
          <button
            style={styles.btnAction}
            onClick={handleNextSegment}
            disabled={visibleCount === segments.length}
          >
            {visibleCount === segments.length ? '线段绘制完' : buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

interface TimeSubPassStep {
  fromMin: number
  toMin: number
  leftPercent: number
  rightPercent: number
}

export function TimeSubPass({
  type = 'TimeSubPass',
  startTime = '08:00',
  endTime = '09:30',
  pauseMinutes = 10,
  durationMinutes = 90,
  buttonText = '下一步',
}: TimeSubPassProps) {
  void type
  void startTime
  void pauseMinutes

  const timeToMin = (str: string): number => {
    if (!str) return 0
    const [h, m] = str.split(':').map(Number)
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
  }

  const minToTime = (min: number): string => {
    const h = Math.floor(min / 60).toString().padStart(2, '0')
    const m = (min % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  }

  const endMin = useMemo(() => timeToMin(endTime), [endTime])
  const minStartAnchor = endMin - durationMinutes
  const [steps, setSteps] = useState<TimeSubPassStep[]>([])
  const [visibleCount, setVisibleCount] = useState<number>(0)

  useEffect(() => {
    if (!endTime || !durationMinutes) {
      setSteps([])
      setVisibleCount(0)
      return
    }

    const generatedSteps: TimeSubPassStep[] = []
    let remMinutes = durationMinutes
    let currentMin = endMin

    while (remMinutes > 0) {
      const chunk = Math.min(60, remMinutes)
      const prevMin = currentMin - chunk

      const rightPercent = ((endMin - currentMin) / durationMinutes) * 100
      const leftPercent = ((prevMin - minStartAnchor) / durationMinutes) * 100

      generatedSteps.push({
        fromMin: currentMin,
        toMin: prevMin,
        leftPercent,
        rightPercent: 100 - rightPercent,
      })

      currentMin = prevMin
      remMinutes -= chunk
    }

    setSteps(generatedSteps)
    setVisibleCount(0)
  }, [durationMinutes, endMin, endTime, minStartAnchor])

  const handleNextStep = () => {
    if (visibleCount < steps.length) {
      setVisibleCount((prev) => prev + 1)
    }
  }

  const handleReset = () => {
    setVisibleCount(0)
  }

  return (
    <div style={{ ...styles.uiCard, maxWidth: '640px' }}>
      <div
        style={{
          ...styles.stage,
          overflow: 'visible',
          padding: '24px',
          minHeight: '240px',
          justifyContent: 'space-between',
          alignItems: 'stretch',
        }}
      >
        <div style={styles.timeAxisShell}>
          <div style={styles.axisLine} />

          <svg style={styles.braceSvgLayer} viewBox="0 0 1000 56" preserveAspectRatio="none">
            {steps.slice(0, visibleCount).map((step, idx) => {
              const xLeft = step.leftPercent * 10
              const xRight = step.rightPercent * 10
              const xMid = ((step.leftPercent + step.rightPercent) / 2) * 10

              const pathData = `
                M ${xLeft} 50
                Q ${xLeft} 25, ${xLeft + 12} 25
                L ${xMid - 12} 25
                Q ${xMid} 25, ${xMid} 6
                Q ${xMid} 25, ${xMid + 12} 25
                L ${xRight - 12} 25
                Q ${xRight} 25, ${xRight} 50
              `

              return (
                <path
                  key={`time-sub-pass-brace-${idx}`}
                  d={pathData}
                  fill="none"
                  stroke="#0070F3"
                  strokeWidth="2"
                  strokeDasharray="5,4"
                  strokeLinecap="round"
                />
              )
            })}
          </svg>

          <div style={styles.pointsContainer}>
            <div style={{ ...styles.timeNode, left: '100%', transform: 'translateX(-100%)' }}>
              <span style={styles.timeAxisLabel}>{endTime}</span>
            </div>

            {steps.map((step, idx) => {
              const isFinalStartNode = idx === steps.length - 1
              const isRevealed = idx < visibleCount

              let timeStr = minToTime(step.toMin)
              let isUnknown = false

              if (!isRevealed) {
                if (isFinalStartNode && visibleCount === 0) {
                  timeStr = '??:??'
                  isUnknown = true
                } else {
                  return null
                }
              }

              return (
                <div key={`time-sub-pass-node-${idx}`} style={{ ...styles.timeNode, left: `${step.leftPercent}%` }}>
                  <span style={{ ...styles.timeAxisLabel, ...(isUnknown ? styles.unknownLabel : {}) }}>
                    {timeStr}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      <div style={styles.controlPanel}>
        <div style={styles.btnRow}>
          <button style={styles.btnReset} onClick={handleReset}>
            重置
          </button>
          <button
            style={styles.btnAction}
            onClick={handleNextStep}
            disabled={visibleCount >= steps.length}
          >
            {visibleCount >= steps.length ? '推算完成' : buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

export function UnitConv({
  type = 'UnitConvLen',
  fromUnit = '米',
  toUnit = '厘米',
  value = 3,
  rate = 100,
  buttonText = '下一步',
}: UnitConvProps) {
  void type

  const [currentStep, setCurrentStep] = useState<number>(0)
  const finalResult = value * rate

  const handleNextStep = () => {
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleReset = () => {
    setCurrentStep(0)
  }

  const getStatusText = () => {
    if (currentStep === 0) {
      return (
        <>
          想一想：从 <b>{fromUnit}</b> 换算到 <b>{toUnit}</b> 需要怎么计算？
        </>
      )
    }

    if (currentStep === 1) {
      return (
        <>
          发现规律：高级单位化低级单位，要乘它们之间的进率 <b>{rate}</b>。
        </>
      )
    }

    return (
      <>
        挑战成功！计算结果：
        <span style={{ color: '#10B981' }}>{value} {fromUnit} = {finalResult} {toUnit}</span>
      </>
    )
  }

  return (
    <div style={styles.uiCard}>
      <div style={styles.stage}>
        <div style={styles.unitConvDisplay}>
          <div style={styles.unitConvBox}>
            {value}
            <span style={styles.unitConvName}>{fromUnit}</span>
          </div>

          <div style={styles.unitConvArrow}>
            <div
              style={{
                ...styles.unitConvRateBadge,
                ...(currentStep >= 1 ? styles.unitConvRateBadgeShow : {}),
              }}
            >
              × {rate}
            </div>
            <div style={styles.unitConvArrowLine} />
          </div>

          <div style={styles.unitConvBox}>
            {currentStep === 2 ? (
              <span style={{ ...styles.unitConvPlaceholder, ...styles.unitConvPlaceholderResolved }}>
                {finalResult}
              </span>
            ) : (
              <span style={styles.unitConvPlaceholder}>?</span>
            )}
            <span style={styles.unitConvName}>{toUnit}</span>
          </div>
        </div>

        <div style={styles.badgeFinal}>{getStatusText()}</div>
      </div>

      <div style={styles.controlPanel}>
        <div style={styles.btnRow}>
          <button style={styles.btnReset} onClick={handleReset}>
            重置
          </button>
          <button
            style={styles.btnAction}
            onClick={handleNextStep}
            disabled={currentStep === 2}
          >
            {currentStep === 2 ? '完成' : buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

type PointSegShapeType = 'unclosed' | 'closed' | null
type PointSegSideType = 'single' | 'double' | null
type PointSegRuleType = 'both' | 'neither' | 'one' | 'loop' | null

export function PointSeg({
  totalLength = 20,
  spacing = 5,
  lengthUnit = '米',
  segments = 4,
  buttonText = '下一步',
}: PointSegProps) {
  const [isLoop, setIsLoop] = useState<PointSegShapeType>('unclosed')
  const [isDoubleSide, setIsDoubleSide] = useState<PointSegSideType>('double')
  const [endpointRule, setEndpointRule] = useState<PointSegRuleType>('both')
  const [currentStep, setCurrentStep] = useState<number>(0)
  const loopSize = 240
  const loopCenter = loopSize / 2

  const shouldPlantAtNode = (
    index: number,
    totalSegments: number,
    shape: PointSegShapeType,
    rule: PointSegRuleType,
  ) => {
    if (shape === 'closed') {
      return index < totalSegments
    }
    if (rule === 'both') return true
    if (rule === 'neither') return index > 0 && index < totalSegments
    if (rule === 'one') return index > 0
    return false
  }

  const handleShapeChange = (shape: 'unclosed' | 'closed') => {
    setIsLoop(shape)
    if (shape === 'closed') {
      setEndpointRule('loop')
    } else {
      setEndpointRule(null)
    }
    setCurrentStep(0)
  }

  const handleSideChange = (side: 'single' | 'double') => {
    setIsDoubleSide(side)
    setCurrentStep(0)
  }

  const handleRuleChange = (rule: 'both' | 'neither' | 'one') => {
    setEndpointRule(rule)
    setCurrentStep(0)
  }

  const isReady = isLoop !== null && isDoubleSide !== null && endpointRule !== null

  const getLoopPoint = (radius: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return {
      left: loopCenter + Math.cos(rad) * radius,
      top: loopCenter + Math.sin(rad) * radius,
    }
  }

  return (
    <div style={styles.uiCard}>
      <div style={styles.stage}>
        <div style={styles.pointSegConfigPanel}>
          <div style={styles.pointSegConfigRow}>
            <div style={styles.pointSegConfigLabel}>形态：</div>
            <div style={styles.pointSegBtnGroup}>
              <button
                style={{ ...styles.pointSegToggleBtn, ...(isLoop === 'unclosed' ? styles.pointSegActiveBtn : {}) }}
                onClick={() => handleShapeChange('unclosed')}
              >
                非封闭
              </button>
              <button
                style={{ ...styles.pointSegToggleBtn, ...(isLoop === 'closed' ? styles.pointSegActiveBtn : {}) }}
                onClick={() => handleShapeChange('closed')}
              >
                封闭
              </button>
            </div>
          </div>

          <div style={styles.pointSegConfigRow}>
            <div style={styles.pointSegConfigLabel}>单双侧：</div>
            <div style={styles.pointSegBtnGroup}>
              <button
                style={{ ...styles.pointSegToggleBtn, ...(isDoubleSide === 'double' ? styles.pointSegActiveBtn : {}) }}
                onClick={() => handleSideChange('double')}
              >
                双侧
              </button>
              <button
                style={{ ...styles.pointSegToggleBtn, ...(isDoubleSide === 'single' ? styles.pointSegActiveBtn : {}) }}
                onClick={() => handleSideChange('single')}
              >
                单侧
              </button>
            </div>
          </div>

          <div style={styles.pointSegConfigRow}>
            <div style={styles.pointSegConfigLabel}>要求：</div>
            <div style={styles.pointSegBtnGroup}>
              <button
                disabled={isLoop === 'closed'}
                style={{
                  ...styles.pointSegToggleBtn,
                  ...(endpointRule === 'both' ? styles.pointSegActiveBtn : {}),
                  ...(isLoop === 'closed' ? styles.pointSegDisabledBtn : {}),
                }}
                onClick={() => handleRuleChange('both')}
              >
                两端都要
              </button>
              <button
                disabled={isLoop === 'closed'}
                style={{
                  ...styles.pointSegToggleBtn,
                  ...(endpointRule === 'neither' ? styles.pointSegActiveBtn : {}),
                  ...(isLoop === 'closed' ? styles.pointSegDisabledBtn : {}),
                }}
                onClick={() => handleRuleChange('neither')}
              >
                两端都不要
              </button>
              <button
                disabled={isLoop === 'closed'}
                style={{
                  ...styles.pointSegToggleBtn,
                  ...(endpointRule === 'one' ? styles.pointSegActiveBtn : {}),
                  ...(isLoop === 'closed' ? styles.pointSegDisabledBtn : {}),
                }}
                onClick={() => handleRuleChange('one')}
              >
                只要一端
              </button>
            </div>
          </div>
        </div>

        <div style={styles.pointSegStageCard}>
          <div style={styles.pointSegStageInner}>
            <div style={styles.pointSegFormula}>
              <div style={styles.pointSegFormulaItem}>总长度: {totalLength} {lengthUnit}</div>
              <div style={styles.pointSegFormulaItem}>间隔距离: {spacing} {lengthUnit}</div>
              <div
                style={{
                  ...styles.pointSegFormulaItem,
                  ...(currentStep >= 1 && isReady ? styles.pointSegFormulaHighlight : {}),
                }}
              >
                {currentStep >= 1 && isReady ? `基础段数 = ${segments} 段` : '基础段数 = ?'}
              </div>
            </div>

            <div style={styles.pointSegRoadEnvironment}>
              {isReady && isLoop === 'unclosed' && (
                <div style={styles.pointSegStraightLine}>
                  <div style={styles.pointSegStraightRoadBase} />
                  {Array.from({ length: segments + 1 }).map((_, index) => {
                    const hasTree = shouldPlantAtNode(index, segments, isLoop, endpointRule)
                    return (
                      <div key={index} style={{ ...styles.pointSegStraightNode, left: `${(index / segments) * 100}%` }}>
                        <div
                          style={{
                            ...styles.pointSegFlagMarker,
                            ...styles.pointSegStraightFlag,
                            opacity: currentStep >= 1 ? 1 : 0,
                          }}
                        />
                        {hasTree && (
                          <>
                            <span
                              style={{
                                ...styles.pointSegTreeUnit,
                                bottom: 'calc(50% + 12px)',
                                transform: `scale(${currentStep === 2 ? 1 : 0}) translateX(-50%)`,
                                transformOrigin: 'bottom center',
                              }}
                            >
                              🌳
                            </span>
                            {isDoubleSide === 'double' && (
                              <span
                                style={{
                                  ...styles.pointSegTreeUnit,
                                  top: 'calc(50% + 12px)',
                                  transform: `scale(${currentStep === 2 ? 1 : 0}) translateX(-50%)`,
                                  transformOrigin: 'top center',
                                }}
                              >
                                🌳
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {isReady && isLoop === 'closed' && (
                <div style={styles.pointSegLoopCircle}>
                  {Array.from({ length: segments }).map((_, index) => {
                    const angleDeg = (index / segments) * 360
                    const loopAngle = angleDeg - 90
                    const hasTree = shouldPlantAtNode(index, segments, isLoop, endpointRule)
                    const markerPoint = getLoopPoint(loopCenter, loopAngle)
                    const outerTreePoint = getLoopPoint(loopCenter + 10, loopAngle)
                    const innerTreePoint = getLoopPoint(loopCenter - 42, loopAngle)
                    return (
                      <div key={index} style={styles.pointSegLoopNode}>
                        <div
                          style={{
                            ...styles.pointSegLoopDot,
                            left: `${markerPoint.left}px`,
                            top: `${markerPoint.top}px`,
                            opacity: currentStep >= 1 ? 1 : 0,
                          }}
                        />
                        {hasTree && (
                          <>
                            <span
                              style={{
                                ...styles.pointSegTreeUnit,
                                left: `${outerTreePoint.left}px`,
                                top: `${outerTreePoint.top}px`,
                                transform: `translate(-50%, -50%) scale(${currentStep === 2 ? 1 : 0})`,
                              }}
                            >
                              🌳
                            </span>
                            {isDoubleSide === 'double' && (
                              <span
                                style={{
                                  ...styles.pointSegTreeUnit,
                                  left: `${innerTreePoint.left}px`,
                                  top: `${innerTreePoint.top}px`,
                                  transform: `translate(-50%, -50%) scale(${currentStep === 2 ? 1 : 0})`,
                                }}
                              >
                                🌳
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        <div style={styles.controlPanel}>
          <button
            style={styles.btnReset}
            onClick={() => {
              setIsLoop('unclosed')
              setIsDoubleSide('double')
              setEndpointRule('both')
              setCurrentStep(0)
            }}
          >
            重置
          </button>
          <button
            style={styles.btnAction}
            disabled={!isReady || currentStep === 2}
            onClick={() => currentStep < 2 && setCurrentStep((prev) => prev + 1)}
          >
            {currentStep === 2 ? '完成' : buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

const showResultPanel = (visible: boolean, text: string) => {
  return (
    <div
      style={{
        marginTop: '12px',
        background: '#0070F3',
        color: '#fff',
        padding: '6px 14px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: visible ? 'scale(1)' : 'scale(0.8)',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#FFFFFF',
    borderRadius: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
    padding: '32px',
    maxWidth: '560px',
    width: '100%',
    boxSizing: 'border-box',
  },
  uiCard: {
    background: '#FFFFFF',
    borderRadius: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
    padding: '32px',
    maxWidth: '560px',
    width: '100%',
    boxSizing: 'border-box',
  },
  stage: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '32px 16px',
    marginBottom: '24px',
    border: '1px solid #e5e5e5',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  pointSegConfigPanel: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  pointSegConfigRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  pointSegConfigLabel: {
    minWidth: '60px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#666666',
  },
  pointSegBtnGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  pointSegToggleBtn: {
    padding: '9px 14px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    border: '1px solid #e5e5e5',
    background: '#f5f5f5',
    color: '#525252',
    transition: 'all 0.2s',
  },
  pointSegActiveBtn: {
    borderColor: '#0070F3',
    background: '#E0F2FE',
    color: '#0070F3',
  },
  pointSegDisabledBtn: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  pointSegStageCard: {
    width: '100%',
    borderRadius: '16px',
    border: '1px solid #e5e5e5',
    background: '#FFFFFF',
    padding: '24px',
    boxSizing: 'border-box',
  },
  pointSegStageInner: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    position: 'relative',
  },
  pointSegFormula: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
  },
  pointSegFormulaItem: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#666666',
    lineHeight: 1.4,
  },
  pointSegFormulaHighlight: {
    color: '#0070F3',
    fontWeight: 800,
  },
  pointSegRoadEnvironment: {
    position: 'relative',
    width: '100%',
    minHeight: '280px',
    marginTop: '6px',
  },
  pointSegStraightLine: {
    position: 'relative',
    width: '100%',
    minHeight: '220px',
    marginTop: '34px',
  },
  pointSegStraightRoadBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: '4px',
    transform: 'translateY(-50%)',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #0070F3 0%, #00DFD8 100%)',
    boxShadow: '0 4px 14px rgba(0,112,243,0.12)',
  },
  pointSegStraightNode: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    transform: 'translateX(-50%)',
  },
  pointSegFlagMarker: {
    position: 'absolute',
    width: '2px',
    height: '26px',
    background: '#0070F3',
    left: '50%',
    top: '50%',
    transformOrigin: 'center bottom',
    transform: 'translateX(-50%) translateY(-50%)',
    transition: 'opacity 0.25s ease',
  },
  pointSegLoopDot: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    background: '#0070F3',
    boxShadow: '0 0 0 3px rgba(0,112,243,0.12)',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    transition: 'opacity 0.25s ease',
  },
  pointSegStraightFlag: {
    top: '50%',
  },
  pointSegTreeUnit: {
    position: 'absolute',
    left: '50%',
    fontSize: '28px',
    lineHeight: 1,
    userSelect: 'none',
    transition: 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  pointSegLoopCircle: {
    position: 'relative',
    width: '240px',
    height: '240px',
    margin: '48px auto 0',
    borderRadius: '50%',
    border: '2px dashed #DCEBFF',
    background: 'radial-gradient(circle at center, #F8FBFF 0%, #FFFFFF 70%)',
    overflow: 'visible',
  },
  pointSegLoopNode: {
    position: 'absolute',
    inset: 0,
    transformOrigin: 'center center',
    pointerEvents: 'none',
  },
  unitConvDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '20px',
    position: 'relative',
  },
  unitConvBox: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '4px',
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#171717',
    fontFamily: 'monospace',
  },
  unitConvName: {
    fontSize: '18px',
    color: '#4D4D4D',
    fontWeight: 'normal',
    marginLeft: '2px',
  },
  unitConvPlaceholder: {
    display: 'inline-block',
    width: '80px',
    height: '46px',
    border: '2px dashed #EF4444',
    backgroundColor: '#FFF5F5',
    borderRadius: '8px',
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: '40px',
    fontSize: '24px',
    fontWeight: 900,
  },
  unitConvPlaceholderResolved: {
    border: '2px solid #10B981',
    backgroundColor: '#ECFDF5',
    color: '#10B981',
    width: 'auto',
    padding: '0 12px',
  },
  unitConvArrow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '120px',
    position: 'relative',
  },
  unitConvArrowLine: {
    width: '100%',
    height: '2px',
    backgroundColor: '#e5e5e5',
    position: 'relative',
    marginTop: '14px',
  },
  unitConvRateBadge: {
    backgroundColor: '#F3F4F6',
    color: '#4D4D4D',
    fontSize: '13px',
    fontWeight: 'bold',
    padding: '3px 10px',
    borderRadius: '20px',
    border: '1px solid #e5e5e5',
    transform: 'scale(0)',
    opacity: 0,
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  unitConvRateBadgeShow: {
    transform: 'scale(1)',
    opacity: 1,
    backgroundColor: '#E0F2FE',
    color: '#0070F3',
    borderColor: '#BAE6FD',
  },
  timeAxisShell: {
    position: 'relative',
    width: '100%',
    height: '120px',
    marginTop: '20px',
  },
  axisLine: {
    position: 'absolute',
    left: '40px',
    right: '40px',
    top: '60px',
    height: '4px',
    backgroundColor: '#0070F3',
    borderRadius: '2px',
  },
  braceSvgLayer: {
    position: 'absolute',
    left: '40px',
    right: '40px',
    top: 0,
    height: '56px',
    width: 'calc(100% - 80px)',
    pointerEvents: 'none',
    overflow: 'visible',
  },
  pointsContainer: {
    position: 'absolute',
    left: '40px',
    right: '40px',
    top: 0,
    height: '120px',
  },
  timeNode: {
    position: 'absolute',
    top: '72px',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timeAxisLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#333333',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  unknownLabel: {
    color: '#9CA3AF',
    letterSpacing: '0.08em',
  },
  miniLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#666666',
    lineHeight: 1.4,
  },
  segmentListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
  },
  idleText: {
    color: '#999999',
    fontSize: '14px',
    textAlign: 'center',
    padding: '30px 0 12px',
  },
  timeSummaryTrack: {
    width: '100%',
    height: '18px',
    backgroundColor: '#EAEAEA',
    borderRadius: '999px',
    overflow: 'hidden',
    position: 'relative',
  },
  timeSummaryFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #0070F3 0%, #00DFD8 100%)',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    transition: 'width 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    overflow: 'hidden',
  },
  timeSummaryCutTail: {
    height: '100%',
    background: 'linear-gradient(90deg, #7928CA 0%, #FF0080 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  segmentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  timeLabel: {
    width: '52px',
    flexShrink: 0,
    fontSize: '12px',
    fontWeight: 700,
    color: '#333333',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  trackBase: {
    flex: 1,
    height: '36px',
    backgroundColor: '#F5F5F5',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
  },
  fillBar: {
    height: '100%',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '12px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  barText: {
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0,0,0,0.12)',
  },
  pauseOverlayBlock: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, rgba(121,40,202,0.85) 0%, rgba(255,0,128,0.95) 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  interactionZone: {
    position: 'relative',
    width: '100%',
    minHeight: '260px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    overflow: 'hidden',
  },
  matrixPool: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
    background: '#F5E9FF',
    padding: '16px',
    borderRadius: '18px',
    border: '2px dashed #D6ADFF',
    position: 'relative',
    transition: 'border-color 0.3s',
  },
  poolItem: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #7928CA 0%, #FF0080 100%)',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(121, 40, 202, 0.15)',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    transition: 'transform 0.3s ease, opacity 0.5s ease',
  },
  targetLock: {
    background: 'linear-gradient(135deg, #00DFD8 0%, #0070F3 100%)',
    boxShadow: '0 4px 10px rgba(0, 112, 243, 0.25)',
  },
  dragHandler: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    border: '2px solid #0070F3',
    borderRadius: '20px',
    padding: '0 16px',
    height: '64px',
    minWidth: '170px',
    cursor: 'grab',
    zIndex: 20,
    touchAction: 'none',
    userSelect: 'none',
    left: '50%',
    top: '50%',
    marginLeft: '-85px',
    marginTop: '-32px',
  },
  handLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#888888',
    marginBottom: '3px',
  },
  handNum: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#0070F3',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  },
  resultPanel: {
    position: 'absolute',
    background: '#0070F3',
    color: 'white',
    padding: '6px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0 10px 20px rgba(0, 112, 243, 0.3)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    pointerEvents: 'none',
    zIndex: 20,
    textAlign: 'center',
    opacity: 0,
  },
  resultPanelShow: {
    opacity: 1,
    bottom: '12px',
    transform: 'scale(1)',
  },
  badgeFinal: {
    position: 'absolute',
    bottom: '-56px',
    left: '50%',
    transform: 'translateX(-50%)',
    whiteSpace: 'nowrap',
    background: '#171717',
    color: '#ffffff',
    padding: '8px 24px',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: 900,
    boxShadow: '0 8px 22px rgba(0,0,0,0.15)',
    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    zIndex: 10,
  },
  subHint: {
    marginLeft: '8px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#A0A0A0',
  },
  controlPanel: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '12px',
    width: '100%',
  },
  btnReset: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid #e5e5e5',
    background: '#f5f5f5',
    color: '#525252',
    transition: 'all 0.2s',
  },
  btnAction: {
    padding: '10px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    background: '#0070F3',
    color: '#ffffff',
  },
  switchWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  switchLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666666',
  },
  btnToggle: {
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    alignSelf: 'flex-start',
  },
}

function parseCalcTotalMulProps(block: MathComponentProps['block']): CalcTotalMulProps {
  const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
    ? (block.props as Record<string, unknown>)
    : {}

  return {
    count: typeof props.count === 'number' ? props.count : Number(props.count) || 4,
    perValue: typeof props.perValue === 'number' ? props.perValue : Number(props.perValue) || 10,
    unit: typeof props.unit === 'string' ? props.unit : '个',
    stepLabel: typeof props.stepLabel === 'string' ? props.stepLabel : '每组10个，共4组',
    totalLabel: typeof props.totalLabel === 'string' ? props.totalLabel : '共40个',
    buttonText: typeof props.buttonText === 'string' ? props.buttonText : '求总量',
  }
}

function CalcTotalMulBlock({ block }: MathComponentProps) {
  const props = parseCalcTotalMulProps(block)
  return <CalcTotalMul {...props} />
}

function UnknownMathComponent({ block }: MathComponentProps) {
  const visual = buildVisualMeta(block.visual_object)

  return (
    <MathComponentShell block={block} buttonLabel="查看说明">
      {(active) => (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-[20px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="text-3xl">{visual.emoji}</div>
            <div>
              <div className="text-sm font-medium text-[var(--color-ink)]">{block.component || '未知组件'}</div>
              <div className="mt-1 text-xs text-[var(--color-mute)]">
                {active ? '这个组件还没有注册到新映射里。' : '先放一个占位，避免页面报错。'}
              </div>
            </div>
          </div>
        </div>
      )}
    </MathComponentShell>
  )
}

const componentMap: Record<string, (props: MathComponentProps) => ReactElement> = {
  CalcTotalMul: CalcTotalMulBlock,
  CalcPartDiv: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcPartDiv
        total={typeof props.total === 'number' ? props.total : Number(props.total) || 60}
        stepValue={typeof props.stepValue === 'number' ? props.stepValue : Number(props.stepValue) || 15}
        unit={typeof props.unit === 'string' ? props.unit : '厘米'}
        stepLabel={typeof props.stepLabel === 'string' ? props.stepLabel : '4份'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求份数'}
      />
    )
  },
  CalcUnitDiv: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcUnitDiv
        total={typeof props.total === 'number' ? props.total : Number(props.total) || 60}
        stepValue={typeof props.stepValue === 'number' ? props.stepValue : Number(props.stepValue) || 15}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        stepLabel={typeof props.stepLabel === 'string' ? props.stepLabel : '15个'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求每份数'}
      />
    )
  },
  CalcPriceMul: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcPriceMul
        type={typeof props.type === 'string' ? props.type : 'CalcPriceMul'}
        totalPrice={typeof props.totalPrice === 'number' ? props.totalPrice : Number(props.totalPrice) || 20}
        price={typeof props.price === 'number' ? props.price : Number(props.price) || 5}
        quantity={typeof props.quantity === 'number' ? props.quantity : Number(props.quantity) || 4}
        unit={typeof props.unit === 'string' ? props.unit : '元'}
        itemLabel={typeof props.itemLabel === 'string' ? props.itemLabel : '总价模型探究'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求总价'}
      />
    )
  },
  CalcUnitPriceDiv: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcUnitPriceDiv
        type={typeof props.type === 'string' ? props.type : 'CalcUnitPriceDiv'}
        totalPrice={typeof props.totalPrice === 'number' ? props.totalPrice : Number(props.totalPrice) || 20}
        price={typeof props.price === 'number' ? props.price : Number(props.price) || 5}
        quantity={typeof props.quantity === 'number' ? props.quantity : Number(props.quantity) || 4}
        unit={typeof props.unit === 'string' ? props.unit : '元'}
        itemLabel={typeof props.itemLabel === 'string' ? props.itemLabel : '单价: 5元'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求单价'}
      />
    )
  },
  CalcQtyDiv: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcQtyDiv
        type={typeof props.type === 'string' ? props.type : 'CalcQtyDiv'}
        totalPrice={typeof props.totalPrice === 'number' ? props.totalPrice : Number(props.totalPrice) || 20}
        price={typeof props.price === 'number' ? props.price : Number(props.price) || 5}
        quantity={typeof props.quantity === 'number' ? props.quantity : Number(props.quantity) || 4}
        unit={typeof props.unit === 'string' ? props.unit : '元'}
        itemLabel={typeof props.itemLabel === 'string' ? props.itemLabel : '4个'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求数量'}
      />
    )
  },
  CalcDistMul: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcDistMul
        type={typeof props.type === 'string' ? props.type : 'CalcDistMul'}
        distance={typeof props.distance === 'number' ? props.distance : Number(props.distance) || 240}
        speed={typeof props.speed === 'number' ? props.speed : Number(props.speed) || 80}
        time={typeof props.time === 'number' ? props.time : Number(props.time) || 3}
        speedUnit={typeof props.speedUnit === 'string' ? props.speedUnit : '千米/时'}
        timeUnit={typeof props.timeUnit === 'string' ? props.timeUnit : '小时'}
        distanceUnit={typeof props.distanceUnit === 'string' ? props.distanceUnit : '千米'}
        itemLabel={typeof props.itemLabel === 'string' ? props.itemLabel : '路程模型探究'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求路程'}
      />
    )
  },
  CalcSpeedDiv: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcSpeedDiv
        type={typeof props.type === 'string' ? props.type : 'CalcSpeedDiv'}
        distance={typeof props.distance === 'number' ? props.distance : Number(props.distance) || 240}
        speed={typeof props.speed === 'number' ? props.speed : Number(props.speed) || 80}
        time={typeof props.time === 'number' ? props.time : Number(props.time) || 3}
        speedUnit={typeof props.speedUnit === 'string' ? props.speedUnit : '千米/时'}
        timeUnit={typeof props.timeUnit === 'string' ? props.timeUnit : '小时'}
        distanceUnit={typeof props.distanceUnit === 'string' ? props.distanceUnit : '千米'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求速度'}
      />
    )
  },
  CalcTimeDiv: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcTimeDiv
        type={typeof props.type === 'string' ? props.type : 'CalcTimeDiv'}
        distance={typeof props.distance === 'number' ? props.distance : Number(props.distance) || 240}
        speed={typeof props.speed === 'number' ? props.speed : Number(props.speed) || 80}
        time={typeof props.time === 'number' ? props.time : Number(props.time) || 3}
        speedUnit={typeof props.speedUnit === 'string' ? props.speedUnit : '千米/时'}
        timeUnit={typeof props.timeUnit === 'string' ? props.timeUnit : '小时'}
        distanceUnit={typeof props.distanceUnit === 'string' ? props.distanceUnit : '千米'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求时间'}
      />
    )
  },
  CalcDiffSub: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcDiffSub
        numA={typeof props.numA === 'number' ? props.numA : Number(props.numA) || 20}
        numB={typeof props.numB === 'number' ? props.numB : Number(props.numB) || 8}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        labelA={typeof props.labelA === 'string' ? props.labelA : ''}
        labelB={typeof props.labelB === 'string' ? props.labelB : ''}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求差'}
      />
    )
  },
  CalcSumAdd: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}
    const rawParts = Array.isArray(props.parts) ? props.parts : [3, 5]
    const rawLabels = Array.isArray(props.labels) ? props.labels : ['', '']

    return (
      <CalcSumAdd
        parts={rawParts.map((value) => (typeof value === 'number' ? value : Number(value) || 0))}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        labels={rawLabels.map((value) => (typeof value === 'string' ? value : String(value || '')))}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求和'}
      />
    )
  },
  CalcRemainSub: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcRemainSub
        total={typeof props.total === 'number' ? props.total : Number(props.total) || 20}
        used={typeof props.used === 'number' ? props.used : Number(props.used) || 8}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        totalLabel={typeof props.totalLabel === 'string' ? props.totalLabel : '总数'}
        usedLabel={typeof props.usedLabel === 'string' ? props.usedLabel : '拿走'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求剩余'}
      />
    )
  },
  CalcTimesDiv: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcTimesDiv
        numA={typeof props.numA === 'number' ? props.numA : Number(props.numA) || 12}
        numB={typeof props.numB === 'number' ? props.numB : Number(props.numB) || 3}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        labelA={typeof props.labelA === 'string' ? props.labelA : '比较数'}
        labelB={typeof props.labelB === 'string' ? props.labelB : '标准基准数'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求倍数'}
      />
    )
  },
  CalcTimesMul: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcTimesMul
        baseNum={typeof props.baseNum === 'number' ? props.baseNum : Number(props.baseNum) || 4}
        multiple={typeof props.multiple === 'number' ? props.multiple : Number(props.multiple) || 3}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        labelBase={typeof props.labelBase === 'string' ? props.labelBase : '基础量'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求一倍数的几倍'}
      />
    )
  },
  CalcFracPart: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcFracPart
        total={typeof props.total === 'number' ? props.total : Number(props.total) || 12}
        part={typeof props.part === 'number' ? props.part : Number(props.part) || 8}
        numerator={typeof props.numerator === 'number' ? props.numerator : Number(props.numerator) || 2}
        denominator={typeof props.denominator === 'number' ? props.denominator : Number(props.denominator) || 3}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '下一步'}
      />
    )
  },
  CalcFracRate: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcFracRate
        total={typeof props.total === 'number' ? props.total : Number(props.total) || 12}
        part={typeof props.part === 'number' ? props.part : Number(props.part) || 8}
        numerator={typeof props.numerator === 'number' ? props.numerator : Number(props.numerator) || 8}
        denominator={typeof props.denominator === 'number' ? props.denominator : Number(props.denominator) || 12}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '下一步'}
      />
    )
  },
  CalcAvgDiv: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <CalcAvgDiv
        total={typeof props.total === 'number' ? props.total : Number(props.total) || 12}
        count={typeof props.count === 'number' ? props.count : Number(props.count) || 3}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        totalLabel={typeof props.totalLabel === 'string' ? props.totalLabel : '总量'}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '下一步'}
      />
    )
  },
  CalcMultiSum: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}
    const rawParts = Array.isArray(props.parts) ? props.parts : [2, 3, 4]
    const rawLabels = Array.isArray(props.labels) ? props.labels : []

    return (
      <CalcMultiSum
        parts={rawParts.map((value) => (typeof value === 'number' ? value : Number(value) || 0))}
        unit={typeof props.unit === 'string' ? props.unit : '个'}
        labels={rawLabels.map((value) => (typeof value === 'string' ? value : String(value || '')))}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '求总数'}
      />
    )
  },
  PointSeg: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <PointSeg
        totalLength={typeof props.totalLength === 'number' ? props.totalLength : Number(props.totalLength) || 20}
        spacing={typeof props.spacing === 'number' ? props.spacing : Number(props.spacing) || 5}
        lengthUnit={typeof props.lengthUnit === 'string' ? props.lengthUnit : '米'}
        segments={typeof props.segments === 'number' ? props.segments : Number(props.segments) || 4}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '下一步'}
      />
    )
  },
  UnitConv: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <UnitConv
        type={typeof props.type === 'string' ? props.type : 'UnitConvLen'}
        fromUnit={typeof props.fromUnit === 'string' ? props.fromUnit : '米'}
        toUnit={typeof props.toUnit === 'string' ? props.toUnit : '厘米'}
        value={typeof props.value === 'number' ? props.value : Number(props.value) || 3}
        rate={typeof props.rate === 'number' ? props.rate : Number(props.rate) || 100}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '下一步'}
      />
    )
  },
  TimeSubPass: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <TimeSubPass
        type={typeof props.type === 'string' ? props.type : 'TimeSubPass'}
        startTime={typeof props.startTime === 'string' ? props.startTime : '08:00'}
        endTime={typeof props.endTime === 'string' ? props.endTime : '09:30'}
        pauseMinutes={typeof props.pauseMinutes === 'number' ? props.pauseMinutes : Number(props.pauseMinutes) || 10}
        durationMinutes={typeof props.durationMinutes === 'number' ? props.durationMinutes : Number(props.durationMinutes) || 90}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '下一步'}
      />
    )
  },
  TimeSubSpan: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <TimeSubSpan
        type={typeof props.type === 'string' ? props.type : 'TimeSubSpan'}
        startTime={typeof props.startTime === 'string' ? props.startTime : '08:00'}
        endTime={typeof props.endTime === 'string' ? props.endTime : '09:30'}
        pauseMinutes={typeof props.pauseMinutes === 'number' ? props.pauseMinutes : Number(props.pauseMinutes) || 0}
        durationMinutes={typeof props.durationMinutes === 'number' ? props.durationMinutes : Number(props.durationMinutes) || 90}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '下一步'}
      />
    )
  },
  TimeAddPass: ({ block }) => {
    const props = (block.props && typeof block.props === 'object' && !Array.isArray(block.props))
      ? (block.props as Record<string, unknown>)
      : {}

    return (
      <TimeAddPass
        type={typeof props.type === 'string' ? props.type : 'TimeAddPass'}
        startTime={typeof props.startTime === 'string' ? props.startTime : '09:00'}
        endTime={typeof props.endTime === 'string' ? props.endTime : '11:45'}
        pauseMinutes={typeof props.pauseMinutes === 'number' ? props.pauseMinutes : Number(props.pauseMinutes) || 30}
        durationMinutes={typeof props.durationMinutes === 'number' ? props.durationMinutes : Number(props.durationMinutes) || 135}
        buttonText={typeof props.buttonText === 'string' ? props.buttonText : '画一段时间'}
      />
    )
  },
}

export function MathComponentRenderer({ block }: MathComponentProps) {
  const Component = componentMap[block.component]
  return Component ? Component({ block }) : <UnknownMathComponent block={block} />
}

export const MATH_COMPONENT_NAMES = Object.keys(componentMap)
