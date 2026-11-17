import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { useMessages } from '../i18n/localeStore'
import {
  draggedInsetWidth,
  INSET_MAX_WIDTH,
  INSET_MIN_WIDTH,
  insetWidthForKey,
  type MapPanelView,
} from './insetWindow'
import styles from './InsetWindow.module.css'

interface InsetResizeHandleProps {
  view: MapPanelView
  width: number
  onResize: (width: number) => void
}

interface Drag {
  startX: number
  startWidth: number
}

export function InsetResizeHandle({ view, width, onResize }: InsetResizeHandleProps) {
  const text = useMessages().map.windows
  const drag = useRef<Drag | null>(null)

  function startDrag(event: PointerEvent<HTMLDivElement>): void {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, startWidth: width }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>): void {
    if (drag.current) {
      onResize(draggedInsetWidth(drag.current.startWidth, drag.current.startX, event.clientX))
    }
  }

  function endDrag(): void {
    drag.current = null
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const next = insetWidthForKey(width, event.key)
    if (next !== null) {
      event.preventDefault()
      onResize(next)
    }
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      className={styles.handle}
      aria-label={text[view].size}
      aria-valuemin={INSET_MIN_WIDTH}
      aria-valuemax={INSET_MAX_WIDTH}
      aria-valuenow={width}
      aria-valuetext={text.width(width)}
      title={text[view].size}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
    />
  )
}
