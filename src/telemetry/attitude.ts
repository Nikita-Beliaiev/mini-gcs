import { clamp } from '../simulator/motion'

export const PITCH_PX_PER_DEG = 2
export const MAX_SHOWN_PITCH_DEG = 40

function svgNumber(value: number): string {
  return value.toFixed(2)
}

export function horizonTransform(rollDeg: number, pitchDeg: number): string {
  const shownPitch = clamp(pitchDeg, -MAX_SHOWN_PITCH_DEG, MAX_SHOWN_PITCH_DEG)
  return `rotate(${svgNumber(-rollDeg)}) translate(0 ${svgNumber(shownPitch * PITCH_PX_PER_DEG)})`
}

export function rollPointerTransform(rollDeg: number): string {
  return `rotate(${svgNumber(-rollDeg)})`
}
