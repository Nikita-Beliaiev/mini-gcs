export interface LatLon {
  lat: number
  lon: number
}

const EARTH_RADIUS_M = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export function signedAngleDifference(fromDegrees: number, toDegrees: number): number {
  const difference = normalizeDegrees(toDegrees - fromDegrees)
  return difference > 180 ? difference - 360 : difference
}

export function distanceMeters(from: LatLon, to: LatLon): number {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const haversine =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine))
}

export function bearingDegrees(from: LatLon, to: LatLon): number {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const y = Math.sin(deltaLon) * Math.cos(toLat)
  const x =
    Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon)

  return normalizeDegrees(toDegrees(Math.atan2(y, x)))
}

export function destinationPoint(from: LatLon, bearing: number, distance: number): LatLon {
  const angularDistance = distance / EARTH_RADIUS_M
  const bearingRad = toRadians(bearing)
  const fromLat = toRadians(from.lat)
  const fromLon = toRadians(from.lon)

  const lat = Math.asin(
    Math.sin(fromLat) * Math.cos(angularDistance) +
      Math.cos(fromLat) * Math.sin(angularDistance) * Math.cos(bearingRad),
  )
  const lon =
    fromLon +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(fromLat),
      Math.cos(angularDistance) - Math.sin(fromLat) * Math.sin(lat),
    )

  return { lat: toDegrees(lat), lon: toDegrees(lon) }
}

export function routeLengthMeters(points: readonly LatLon[]): number {
  let length = 0
  points.forEach((point, index) => {
    const previous = index > 0 ? points[index - 1] : undefined
    if (previous) {
      length += distanceMeters(previous, point)
    }
  })
  return length
}

export function isPointInPolygon(point: LatLon, polygon: readonly LatLon[]): boolean {
  if (polygon.length < 3) {
    return false
  }

  let inside = false
  polygon.forEach((vertex, index) => {
    const previous = polygon.at(index - 1)
    if (!previous) {
      return
    }
    const vertexIsNorth = vertex.lat > point.lat
    const previousIsNorth = previous.lat > point.lat
    if (vertexIsNorth === previousIsNorth) {
      return
    }
    const edgeLonAtPointLat =
      vertex.lon +
      ((point.lat - vertex.lat) * (previous.lon - vertex.lon)) / (previous.lat - vertex.lat)
    if (point.lon < edgeLonAtPointLat) {
      inside = !inside
    }
  })
  return inside
}
