import { normalizeDegrees, signedAngleDifference, toDegrees, toRadians } from '../geo/geo'

export interface Tilt {
  rollDeg: number
  pitchDeg: number
}

export const MAX_TILT_DEG = 35
const GRAVITY_MS2 = 9.81
const DRAG_TILT_DEG_PER_MS = 0.8

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

export function tiltForMotion(
  speedMs: number,
  turnRateDegS: number,
  accelerationMs2: number,
): Tilt {
  const bankDeg = toDegrees(Math.atan((speedMs * toRadians(turnRateDegS)) / GRAVITY_MS2))
  const leanDeg =
    toDegrees(Math.atan(accelerationMs2 / GRAVITY_MS2)) + DRAG_TILT_DEG_PER_MS * speedMs
  return {
    rollDeg: clamp(bankDeg, -MAX_TILT_DEG, MAX_TILT_DEG),
    pitchDeg: clamp(-leanDeg, -MAX_TILT_DEG, MAX_TILT_DEG),
  }
}
