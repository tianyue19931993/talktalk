const SVG_WIDTH = 700
const SVG_HEIGHT = 480

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * @param {string} value
 */
function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * @param {boolean | undefined} dash
 */
function getDashAttr(dash) {
  return dash ? ' stroke-dasharray="6 4"' : ''
}

/**
 * @param {object} element
 */
function clampRectBox(element = {}) {
  const width = clamp(toNumber(element.width), 0, SVG_WIDTH)
  const height = clamp(toNumber(element.height), 0, SVG_HEIGHT)
  const x = clamp(toNumber(element.x), 0, Math.max(0, SVG_WIDTH - width))
  const y = clamp(toNumber(element.y), 0, Math.max(0, SVG_HEIGHT - height))
  return { x, y, width, height }
}

/**
 * @param {object} element
 */
function clampCircleCenter(element = {}) {
  const r = Math.max(0, toNumber(element.r, 0))
  const baseX = toNumber(element.x, element.cx)
  const baseY = toNumber(element.y, element.cy)
  const x = clamp(baseX, r, Math.max(r, SVG_WIDTH - r))
  const y = clamp(baseY, r, Math.max(r, SVG_HEIGHT - r))
  return { x, y, r }
}

/**
 * @param {object} element
 */
function clampDragPosition(element = {}, nextX, nextY) {
  if (element.type === 'circle') {
    const r = Math.max(0, toNumber(element.r, 0))
    return {
      x: clamp(nextX, r, Math.max(r, SVG_WIDTH - r)),
      y: clamp(nextY, r, Math.max(r, SVG_HEIGHT - r)),
    }
  }

  if (element.type === 'rect') {
    const width = clamp(toNumber(element.width), 0, SVG_WIDTH)
    const height = clamp(toNumber(element.height), 0, SVG_HEIGHT)
    return {
      x: clamp(nextX, 0, Math.max(0, SVG_WIDTH - width)),
      y: clamp(nextY, 0, Math.max(0, SVG_HEIGHT - height)),
    }
  }

  return {
    x: clamp(nextX, 0, SVG_WIDTH),
    y: clamp(nextY, 0, SVG_HEIGHT),
  }
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clampPathValue(value, min, max) {
  return clamp(value, min, max)
}

/**
 * @param {number} x
 * @param {number} y
 */
function point(x, y) {
  return {
    x: clampPathValue(x, 0, SVG_WIDTH),
    y: clampPathValue(y, 0, SVG_HEIGHT),
  }
}

/**
 * @param {string} id
 * @param {object} element
 */
function dispatchButtonClick(id, element) {
  const detail = { id, element }
  const windowEvent = new CustomEvent('basic-atom-button-click', { bubbles: true, cancelable: true, detail })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(windowEvent)
  }
}

/**
 * @param {object} element
 */
export function renderLine(element = {}) {
  if (element.visible === false) return ''

  const x1 = clamp(toNumber(element.x, element.x1), 0, SVG_WIDTH)
  const y1 = clamp(toNumber(element.y, element.y1), 0, SVG_HEIGHT)
  const x2 = clamp(toNumber(element.x2, x1), 0, SVG_WIDTH)
  const y2 = clamp(toNumber(element.y2, y1), 0, SVG_HEIGHT)

  return `<line id="${escapeXml(element.id)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${escapeXml(element.color || '#333')}" stroke-width="${Math.max(0, toNumber(element.strokeWidth, 2))}" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}"${getDashAttr(element.dash)} fill="none" stroke-linecap="round" />`
}

/**
 * @param {object} element
 */
export function renderRect(element = {}) {
  if (element.visible === false) return ''

  const { x, y, width, height } = clampRectBox(element)
  const dragAttr = element.draggable ? ' data-drag="true"' : ''

  return `<rect id="${escapeXml(element.id)}" x="${x}" y="${y}" width="${width}" height="${height}" fill="${escapeXml(element.fill || '#fff')}" stroke="${escapeXml(element.color || '#333')}" stroke-width="${Math.max(0, toNumber(element.strokeWidth, 2))}" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}"${getDashAttr(element.dash)}${dragAttr} />`
}

/**
 * @param {object} element
 */
export function renderCircle(element = {}) {
  if (element.visible === false) return ''

  const { x: cx, y: cy, r } = clampCircleCenter(element)
  const dragAttr = element.draggable ? ' data-drag="true"' : ''

  if (r <= 0) return ''

  return `<circle id="${escapeXml(element.id)}" cx="${cx}" cy="${cy}" r="${r}" fill="${escapeXml(element.fill || '#fff')}" stroke="${escapeXml(element.color || '#333')}" stroke-width="${Math.max(0, toNumber(element.strokeWidth, 2))}" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}"${getDashAttr(element.dash)}${dragAttr} />`
}

/**
 * @param {object} element
 */
export function renderText(element = {}) {
  if (element.visible === false) return ''
  const content = String(element.content ?? '')
  if (!content) return ''

  const baseX = clamp(toNumber(element.x), 0, SVG_WIDTH)
  const textAlign = String(element.textAlign || 'left')
  const fontSize = Math.max(1, toNumber(element.fontSize, 16))
  const estimatedWidth = Math.max(0, content.length * fontSize * 0.62)
  let x = clamp(Math.min(baseX, SVG_WIDTH - estimatedWidth - 8), 8, SVG_WIDTH - 8)
  let textAnchor = 'start'

  if (textAlign === 'center') {
    const halfWidth = estimatedWidth / 2
    x = halfWidth * 2 + 16 >= SVG_WIDTH
      ? SVG_WIDTH / 2
      : clamp(baseX, halfWidth + 8, SVG_WIDTH - halfWidth - 8)
    textAnchor = 'middle'
  } else if (textAlign === 'right') {
    x = clamp(baseX, estimatedWidth + 8, SVG_WIDTH - 8)
    textAnchor = 'end'
  }

  const y = clamp(toNumber(element.y), 0, SVG_HEIGHT)
  const fontWeight = element.fontWeight != null ? ` font-weight="${escapeXml(element.fontWeight)}"` : ''

  return `<text id="${escapeXml(element.id)}" x="${x}" y="${y}" text-anchor="${textAnchor}" fill="${escapeXml(element.color || '#333')}" font-size="${fontSize}" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}" font-family="Arial, system-ui, sans-serif"${fontWeight}>${escapeXml(content)}</text>`
}

/**
 * @param {object} element
 */
function buildBraceFragments(element = {}) {
  const startX = clamp(toNumber(element.startX, element.x), 0, SVG_WIDTH)
  const startY = clamp(toNumber(element.startY, element.y), 0, SVG_HEIGHT)
  const endX = clamp(toNumber(element.endX, element.x2), 0, SVG_WIDTH)
  const endY = clamp(toNumber(element.endY, element.y2), 0, SVG_HEIGHT)
  const left = Math.min(startX, endX)
  const right = Math.max(startX, endX)
  const top = Math.min(startY, endY)
  const bottom = Math.max(startY, endY)
  const width = right - left
  const height = bottom - top
  const isHorizontal = width >= height
  const span = isHorizontal ? width : height
  const offset = span < 40 ? 6 : 10
  const triSize = span < 40 ? 5 : 7
  const corner = clamp(offset, 6, 12)
  const triangle = clamp(triSize, 5, 12)
  const stackOffset = span < 160 ? 4 : span < 360 ? 6 : 10

  if (isHorizontal) {
    const isUpperBrace = span < 220
    const axisY = clamp(startY, 0, SVG_HEIGHT)
    const braceY = clamp(axisY + (isUpperBrace ? -corner : corner), 0, SVG_HEIGHT)
    const midX = clamp((left + right) / 2, 0, SVG_WIDTH)
    const triHalf = triangle
    const triangleDir = braceY < axisY ? -1 : 1
    const triApexY = clamp(braceY + triangleDir * triangle, 0, SVG_HEIGHT)

    const outline = `M ${left} ${axisY} L ${left} ${braceY} L ${right} ${braceY} L ${right} ${axisY}`
    const trianglePath = `M ${midX - triHalf} ${braceY} L ${midX} ${triApexY} L ${midX + triHalf} ${braceY}`

    return {
      lines: [
        `<path d="${outline}" stroke="${escapeXml(element.color || '#333')}" stroke-width="${Math.max(0, toNumber(element.strokeWidth, 2))}" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}"${getDashAttr(element.dash)} fill="none" stroke-linecap="round" stroke-linejoin="round" />`,
      ],
      triangle: `<path d="${trianglePath}" stroke="${escapeXml(element.color || '#333')}" stroke-width="${Math.max(0, toNumber(element.strokeWidth, 2))}" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}"${getDashAttr(element.dash)} fill="none" stroke-linecap="round" stroke-linejoin="round" />`,
    }
  }

  const isLeftBrace = span < 220
  const axisX = clamp(startX, 0, SVG_WIDTH)
  const baseX = clamp(startX + (isLeftBrace ? -stackOffset : stackOffset), 0, SVG_WIDTH)
  const innerX = clamp(baseX + (isLeftBrace ? -corner : corner), 0, SVG_WIDTH)
  const midY = clamp((top + bottom) / 2, 0, SVG_HEIGHT)
  const triHalf = triangle
  const triangleDir = innerX < axisX ? -1 : 1
  const triApexX = clamp(innerX + triangleDir * triangle, 0, SVG_WIDTH)

  const outline = `M ${baseX} ${top} L ${innerX} ${top} L ${innerX} ${bottom} L ${baseX} ${bottom}`
  const trianglePath = `M ${innerX} ${midY - triHalf} L ${triApexX} ${midY} L ${innerX} ${midY + triHalf}`

  return {
    lines: [
      `<path d="${outline}" stroke="${escapeXml(element.color || '#333')}" stroke-width="${Math.max(0, toNumber(element.strokeWidth, 2))}" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}"${getDashAttr(element.dash)} fill="none" stroke-linecap="round" stroke-linejoin="round" />`,
    ],
    triangle: `<path d="${trianglePath}" stroke="${escapeXml(element.color || '#333')}" stroke-width="${Math.max(0, toNumber(element.strokeWidth, 2))}" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}"${getDashAttr(element.dash)} fill="none" stroke-linecap="round" stroke-linejoin="round" />`,
  }
}

/**
 * @param {object} element
 */
export function renderB(element = {}) {
  if (element.visible === false) return ''

  const fragments = buildBraceFragments(element)
  return [ ...fragments.lines, fragments.triangle ].join('')
}

/**
 * @param {object} element
 */
export function renderButton(element = {}) {
  if (element.visible === false) return ''

  const { x, y, width, height } = clampRectBox(element)
  const fontSize = Math.max(1, toNumber(element.fontSize, 16))
  const cx = x + width / 2
  const cy = y + height / 2
  const content = String(element.content ?? '按钮')

  return [
    `<g id="${escapeXml(element.id)}" data-btn="true" style="transform-box: fill-box; transform-origin: center; transition: transform 150ms ease; cursor: pointer;">`,
    `<rect id="${escapeXml(element.id)}-rect" x="${x}" y="${y}" width="${width}" height="${height}" rx="6" ry="6" fill="${escapeXml(element.fill || '#fff')}" stroke="${escapeXml(element.color || '#333')}" stroke-width="${Math.max(0, toNumber(element.strokeWidth, 2))}" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}" data-btn="true" pointer-events="all" />`,
    `<text id="${escapeXml(element.id)}-text" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(element.color || '#333')}" font-size="${fontSize}" font-family="Arial, system-ui, sans-serif" pointer-events="none" opacity="${clamp(toNumber(element.opacity, 1), 0, 1)}">${escapeXml(content)}</text>`,
    `</g>`,
  ].join('')
}

/**
 * @param {object} element
 */
export function renderElement(element = {}) {
  if (!element || element.visible === false) return ''

  switch (element.type) {
    case 'line':
      return renderLine(element)
    case 'rect':
      return renderRect(element)
    case 'circle':
      return renderCircle(element)
    case 'text':
      return renderText(element)
    case 'brace':
      return renderB(element)
    case 'button':
      return renderButton(element)
    default:
      return ''
  }
}

/**
 * @param {Array<object>} elements
 */
export function renderAllElements(elements = []) {
  return (Array.isArray(elements) ? elements : []).map((element) => renderElement(element)).join('')
}

/**
 * @param {SVGSVGElement} svgEl
 * @param {{ current: Array<object> }} elementsRef
 * @param {(nextElements: Array<object>) => void} onChange
 */
export function bindInteractiveBoxDrag(svgEl, elementsRef, onChange) {
  if (!svgEl || !elementsRef) return () => {}

  let active = null
  let activeButtonRoot = null

  const getPoint = (event) => {
    const point = svgEl.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svgEl.getScreenCTM()
    if (!matrix) return { x: event.clientX, y: event.clientY }
    const svgPoint = point.matrixTransform(matrix.inverse())
    return { x: svgPoint.x, y: svgPoint.y }
  }

  const findDomById = (id) => {
    return Array.from(svgEl.querySelectorAll('[id]')).find((node) => node.getAttribute('id') === id) || null
  }

  const syncDom = (id, element) => {
    const dom = findDomById(id)
    if (!dom) return
    if (element.type === 'rect') {
      dom.setAttribute('x', String(clamp(toNumber(element.x), 0, SVG_WIDTH)))
      dom.setAttribute('y', String(clamp(toNumber(element.y), 0, SVG_HEIGHT)))
    }
    if (element.type === 'circle') {
      dom.setAttribute('cx', String(clamp(toNumber(element.cx, element.x), 0, SVG_WIDTH)))
      dom.setAttribute('cy', String(clamp(toNumber(element.cy, element.y), 0, SVG_HEIGHT)))
    }
  }

  const updateElement = (id, nextX, nextY) => {
    const current = Array.isArray(elementsRef.current) ? elementsRef.current : []
    const nextElements = current.map((item) => {
      if (item.id !== id) return item
      const clamped = clampDragPosition(item, nextX, nextY)
      const next = item.type === 'circle'
        ? { ...item, x: clamped.x, y: clamped.y, cx: clamped.x, cy: clamped.y }
        : { ...item, x: clamped.x, y: clamped.y }
      syncDom(id, next)
      return next
    })
    elementsRef.current = nextElements
    onChange?.(nextElements)
  }

  const getButtonRoot = (target) => {
    if (!target || typeof target.closest !== 'function') return null
    return target.closest('g[data-btn="true"]') || target.closest('rect[data-btn="true"]')
  }

  const setButtonPressed = (root, pressed) => {
    if (!root) return
    if (pressed) {
      const box = typeof root.getBBox === 'function' ? root.getBBox() : null
      if (box) {
        const cx = box.x + box.width / 2
        const cy = box.y + box.height / 2
        root.setAttribute('transform', `translate(${cx} ${cy}) scale(0.97) translate(${-cx} ${-cy})`)
      }
      root.style.transform = 'scale(0.97)'
    } else {
      root.removeAttribute('transform')
      root.style.transform = ''
    }
  }

  const onMouseDown = (event) => {
    const target = event.target?.closest?.('[data-drag="true"]')
    if (!target) return

    const id = target.getAttribute('id')
    if (!id) return

    const item = (elementsRef.current || []).find((entry) => entry.id === id)
    if (!item || !['rect', 'circle'].includes(item.type)) return

    event.preventDefault()
    const point = getPoint(event)
    const baseX = item.type === 'circle' ? toNumber(item.cx, item.x) : toNumber(item.x)
    const baseY = item.type === 'circle' ? toNumber(item.cy, item.y) : toNumber(item.y)

    active = {
      id,
      type: item.type,
      offsetX: point.x - baseX,
      offsetY: point.y - baseY,
    }
  }

  const onMouseMove = (event) => {
    if (!active) return
    event.preventDefault()
    const point = getPoint(event)
    updateElement(
      active.id,
      clamp(point.x - active.offsetX, 0, SVG_WIDTH),
      clamp(point.y - active.offsetY, 0, SVG_HEIGHT),
    )
  }

  const onMouseUp = () => {
    active = null
  }

  const onPointerDown = (event) => {
    const buttonRoot = getButtonRoot(event.target)
    if (!buttonRoot) return
    const id = buttonRoot.getAttribute('id')
    if (!id) return
    const item = (elementsRef.current || []).find((entry) => entry.id === id)
    if (!item || item.type !== 'button') return

    activeButtonRoot = buttonRoot
    setButtonPressed(buttonRoot, true)
  }

  const onPointerUp = (event) => {
    const buttonRoot = activeButtonRoot || getButtonRoot(event.target)
    if (!buttonRoot) return
    if (activeButtonRoot) {
      setButtonPressed(activeButtonRoot, false)
    } else {
      setButtonPressed(buttonRoot, false)
    }
    activeButtonRoot = null
  }

  const onButtonClick = (event) => {
    const buttonRoot = getButtonRoot(event.target)
    if (!buttonRoot) return
    const id = buttonRoot.getAttribute('id')
    if (!id) return
    const item = (elementsRef.current || []).find((entry) => entry.id === id)
    if (!item || item.type !== 'button') return

    dispatchButtonClick(id, item)
  }

  svgEl.addEventListener('mousedown', onMouseDown)
  svgEl.addEventListener('mousemove', onMouseMove)
  svgEl.addEventListener('mouseup', onMouseUp)
  svgEl.addEventListener('mouseleave', onMouseUp)
  svgEl.addEventListener('pointerdown', onPointerDown)
  svgEl.addEventListener('pointerup', onPointerUp)
  svgEl.addEventListener('pointercancel', onPointerUp)
  svgEl.addEventListener('click', onButtonClick)

  return () => {
    svgEl.removeEventListener('mousedown', onMouseDown)
    svgEl.removeEventListener('mousemove', onMouseMove)
    svgEl.removeEventListener('mouseup', onMouseUp)
    svgEl.removeEventListener('mouseleave', onMouseUp)
    svgEl.removeEventListener('pointerdown', onPointerDown)
    svgEl.removeEventListener('pointerup', onPointerUp)
    svgEl.removeEventListener('pointercancel', onPointerUp)
    svgEl.removeEventListener('click', onButtonClick)
  }
}

/**
 * 6 种基础原子渲染单元测试数据
 */
export const SAMPLE_BASIC_ATOM_ELEMENTS = [
  {
    id: 'bg',
    type: 'rect',
    x: 0,
    y: 0,
    width: 700,
    height: 480,
    fill: '#f8f9fa',
    strokeWidth: 0,
    opacity: 1,
    visible: true,
  },
  {
    id: 'testTitle',
    type: 'text',
    x: 350,
    y: 20,
    content: '6种渲染原子测试（无基准线，全部可见）',
    color: '#222222',
    fontSize: 22,
    textAlign: 'center',
    opacity: 1,
    visible: true,
  },
  {
    id: 'solidLine',
    type: 'line',
    x1: 60,
    y1: 70,
    x2: 320,
    y2: 70,
    color: '#333333',
    strokeWidth: 2,
    opacity: 1,
    dash: false,
    visible: true,
  },
  {
    id: 'dashLine',
    type: 'line',
    x1: 60,
    y1: 130,
    x2: 320,
    y2: 130,
    color: '#4285F4',
    strokeWidth: 2,
    opacity: 1,
    dash: true,
    visible: true,
  },
  {
    id: 'lineTip',
    type: 'text',
    x: 60,
    y: 55,
    content: 'line 实线/虚线线段',
    color: '#222222',
    fontSize: 14,
    textAlign: 'left',
    opacity: 1,
    visible: true,
  },
  {
    id: 'dragRect',
    type: 'rect',
    x: 60,
    y: 160,
    width: 100,
    height: 60,
    fill: '#E8F0FE',
    color: '#4285F4',
    strokeWidth: 2,
    opacity: 1,
    dash: false,
    visible: true,
    draggable: true,
  },
  {
    id: 'rectTip',
    type: 'text',
    x: 60,
    y: 145,
    content: 'rect 可拖拽矩形',
    color: '#222222',
    fontSize: 14,
    textAlign: 'left',
    opacity: 1,
    visible: true,
  },
  {
    id: 'dragCircle',
    type: 'circle',
    cx: 220,
    cy: 190,
    r: 22,
    fill: '#D1E7DD',
    color: '#198754',
    strokeWidth: 2,
    opacity: 1,
    dash: false,
    visible: true,
    draggable: true,
  },
  {
    id: 'circleTip',
    type: 'text',
    x: 180,
    y: 145,
    content: 'circle 可拖拽圆形',
    color: '#222222',
    fontSize: 14,
    textAlign: 'left',
    opacity: 1,
    visible: true,
  },
  {
    id: 'horiBrace',
    type: 'brace',
    startX: 60,
    startY: 260,
    endX: 320,
    endY: 260,
    color: '#9C27B0',
    strokeWidth: 2,
    opacity: 1,
    dash: false,
    visible: true,
  },
  {
    id: 'horiTip',
    type: 'text',
    x: 190,
    y: 290,
    content: '横向大括号，无基准线',
    color: '#9C27B0',
    fontSize: 14,
    textAlign: 'center',
    opacity: 1,
    visible: true,
  },
  {
    id: 'vertBrace',
    type: 'brace',
    startX: 420,
    startY: 70,
    endX: 420,
    endY: 280,
    color: '#E65100',
    strokeWidth: 2,
    opacity: 1,
    dash: false,
    visible: true,
  },
  {
    id: 'vertTip',
    type: 'text',
    x: 440,
    y: 175,
    content: '纵向大括号，无基准线',
    color: '#E65100',
    fontSize: 14,
    textAlign: 'left',
    opacity: 1,
    visible: true,
  },
  {
    id: 'testBtn',
    type: 'button',
    x: 305,
    y: 400,
    width: 90,
    height: 36,
    fill: '#2196F3',
    color: '#ffffff',
    content: '下一步',
    fontSize: 14,
    visible: true,
  },
]
