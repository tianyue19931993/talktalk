export type BasicAtomType = 'line' | 'rect' | 'circle' | 'text' | 'brace' | 'button'

export interface BasicAtomElement {
  id: string
  type: BasicAtomType
  x?: number
  y?: number
  x1?: number
  y1?: number
  cx?: number
  cy?: number
  width?: number
  height?: number
  r?: number
  x2?: number
  y2?: number
  startX?: number
  startY?: number
  endX?: number
  endY?: number
  content?: string
  color?: string
  fill?: string
  strokeWidth?: number
  opacity?: number
  dash?: boolean
  fontSize?: number
  fontWeight?: string | number
  textAlign?: 'left' | 'center' | 'right' | string
  draggable?: boolean
  visible?: boolean
}

export declare function renderLine(element?: BasicAtomElement): string
export declare function renderRect(element?: BasicAtomElement): string
export declare function renderCircle(element?: BasicAtomElement): string
export declare function renderText(element?: BasicAtomElement): string
export declare function renderB(element?: BasicAtomElement): string
export declare function renderButton(element?: BasicAtomElement): string
export declare function renderElement(element?: BasicAtomElement): string
export declare function renderAllElements(elements?: BasicAtomElement[]): string
export declare function bindInteractiveBoxDrag(
  svgEl: SVGSVGElement,
  elementsRef: { current: BasicAtomElement[] },
  onChange: (nextElements: BasicAtomElement[]) => void,
): () => void
export declare const SAMPLE_BASIC_ATOM_ELEMENTS: BasicAtomElement[]
