export type MapPanelView = 'map' | 'camera'

export const INSET_MIN_WIDTH = 220
export const INSET_MAX_WIDTH = 960
export const INSET_KEY_STEP = 40

export const INSET_SIZES: Record<MapPanelView, { small: number; large: number }> = {
  camera: { small: 280, large: 560 },
  map: { small: 320, large: 560 },
}

export function otherView(view: MapPanelView): MapPanelView {
  return view === 'map' ? 'camera' : 'map'
}

export function clampInsetWidth(width: number): number {
  return Math.round(Math.min(INSET_MAX_WIDTH, Math.max(INSET_MIN_WIDTH, width)))
}

export function isLargeInset(view: MapPanelView, width: number): boolean {
  return width >= INSET_SIZES[view].large
}

export function toggledInsetWidth(view: MapPanelView, width: number): number {
  return isLargeInset(view, width) ? INSET_SIZES[view].small : INSET_SIZES[view].large
}

export function draggedInsetWidth(startWidth: number, startX: number, x: number): number {
  return clampInsetWidth(startWidth + startX - x)
}

export function insetWidthForKey(width: number, key: string): number | null {
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return clampInsetWidth(width + INSET_KEY_STEP)
    case 'ArrowDown':
    case 'ArrowLeft':
      return clampInsetWidth(width - INSET_KEY_STEP)
    case 'Home':
      return INSET_MIN_WIDTH
    case 'End':
      return INSET_MAX_WIDTH
    default:
      return null
  }
}
