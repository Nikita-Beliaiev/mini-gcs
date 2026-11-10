import { useEffect, useRef } from 'react'
import { useGroundStation } from '../station/stationContext'
import { horizonTransform, PITCH_PX_PER_DEG, rollPointerTransform } from './attitude'
import styles from './AttitudeIndicator.module.css'

const PITCH_MARKS = [-30, -20, -10, 10, 20, 30]
const ROLL_MARKS = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]
const LADDER_HALF_WIDTH = 16

export function AttitudeIndicator() {
  const { telemetry } = useGroundStation()
  const horizonRef = useRef<SVGGElement>(null)
  const pointerRef = useRef<SVGGElement>(null)

  useEffect(() => {
    function render(): void {
      const attitude = telemetry.getSnapshot().attitude
      const rollDeg = attitude?.rollDeg ?? 0
      const pitchDeg = attitude?.pitchDeg ?? 0
      horizonRef.current?.setAttribute('transform', horizonTransform(rollDeg, pitchDeg))
      pointerRef.current?.setAttribute('transform', rollPointerTransform(rollDeg))
    }
    render()
    return telemetry.subscribe(render)
  }, [telemetry])

  return (
    <svg
      className={styles.indicator}
      viewBox="-100 -100 200 200"
      role="img"
      aria-label="Attitude indicator"
    >
      <g ref={horizonRef} data-part="horizon">
        <rect className={styles.sky} x={-300} y={-300} width={600} height={300} />
        <rect className={styles.ground} x={-300} y={0} width={600} height={300} />
        <line className={styles.horizonLine} x1={-300} x2={300} y1={0} y2={0} />
        {PITCH_MARKS.map((pitchDeg) => (
          <g key={pitchDeg} transform={`translate(0 ${String(-pitchDeg * PITCH_PX_PER_DEG)})`}>
            <line className={styles.ladder} x1={-LADDER_HALF_WIDTH} x2={LADDER_HALF_WIDTH} />
            <text className={styles.ladderLabel} x={LADDER_HALF_WIDTH + 4} dy={3}>
              {Math.abs(pitchDeg)}
            </text>
          </g>
        ))}
      </g>
      {ROLL_MARKS.map((rollDeg) => (
        <line
          key={rollDeg}
          className={styles.rollMark}
          transform={`rotate(${String(rollDeg)})`}
          y1={-96}
          y2={rollDeg % 30 === 0 ? -86 : -90}
        />
      ))}
      <g ref={pointerRef}>
        <path className={styles.rollPointer} d="M0 -85 L-6 -75 L6 -75 Z" />
      </g>
      <path className={styles.aircraft} d="M-52 0 H-18 L-10 9 M52 0 H18 L10 9" />
      <circle className={styles.aircraftCenter} r={3} />
      <circle className={styles.bezel} r={98} />
    </svg>
  )
}
