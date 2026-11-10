import type { LatLon } from '../geo/geo'

export interface DraftPoint extends LatLon {
  id: string
}

export function toDraftPoints(positions: readonly LatLon[], firstId: number): DraftPoint[] {
  return positions.map(({ lat, lon }, index) => ({
    id: `point-${String(firstId + index)}`,
    lat,
    lon,
  }))
}

export function movePointTo(
  points: readonly DraftPoint[],
  id: string,
  position: LatLon,
): DraftPoint[] {
  return points.map((point) =>
    point.id === id ? { id, lat: position.lat, lon: position.lon } : point,
  )
}

export function removePointById(points: readonly DraftPoint[], id: string): DraftPoint[] {
  return points.filter((point) => point.id !== id)
}

export function shiftPointBy(
  points: readonly DraftPoint[],
  id: string,
  offset: -1 | 1,
): DraftPoint[] {
  const index = points.findIndex((point) => point.id === id)
  const targetIndex = index + offset
  const result = [...points]
  if (index === -1 || targetIndex < 0 || targetIndex >= points.length) {
    return result
  }
  const [moved] = result.splice(index, 1)
  if (moved) {
    result.splice(targetIndex, 0, moved)
  }
  return result
}
