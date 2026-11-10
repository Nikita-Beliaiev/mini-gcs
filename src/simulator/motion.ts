import { normalizeDegrees, signedAngleDifference } from '../geo/geo'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function approach(current: number, target: number, maxStep: number): number {
  if (Math.abs(target - current) <= maxStep) {
    return target
  }
  return current + Math.sign(target - current) * maxStep
}

export function turnToward(headingDeg: number, targetDeg: number, maxTurnDeg: number): number {
  const turn = approach(0, signedAngleDifference(headingDeg, targetDeg), maxTurnDeg)
  return normalizeDegrees(headingDeg + turn)
}
