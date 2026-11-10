import { useId } from 'react'
import { useTelemetry } from '../station/stationContext'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { AttitudeIndicator } from './AttitudeIndicator'
import {
  formatArmed,
  formatDecimal,
  formatGps,
  formatHeading,
  formatSignedAngle,
  NO_VALUE,
} from './format'
import styles from './TelemetryPanel.module.css'
import type { TelemetryState } from './telemetryStore'

interface ReadoutDefinition {
  label: string
  unit?: string
  select: (state: TelemetryState) => string
}

const READOUTS: readonly ReadoutDefinition[] = [
  { label: 'Flight mode', select: (state) => state.heartbeat?.mode ?? NO_VALUE },
  { label: 'Arming', select: (state) => formatArmed(state.heartbeat?.armed) },
  {
    label: 'Altitude',
    unit: 'm',
    select: (state) => formatDecimal(state.position?.altitudeM, 1),
  },
  {
    label: 'Ground speed',
    unit: 'm/s',
    select: (state) => formatDecimal(state.position?.groundSpeedMs, 1),
  },
  { label: 'Heading', select: (state) => formatHeading(state.position?.headingDeg) },
  { label: 'Roll', select: (state) => formatSignedAngle(state.attitude?.rollDeg) },
  { label: 'Pitch', select: (state) => formatSignedAngle(state.attitude?.pitchDeg) },
  {
    label: 'Battery',
    unit: '%',
    select: (state) => formatDecimal(state.systemStatus?.batteryPercent, 0),
  },
  { label: 'GPS', unit: 'sats', select: (state) => formatGps(state.systemStatus) },
  {
    label: 'Link quality',
    unit: '%',
    select: (state) => formatDecimal(state.systemStatus?.linkQualityPercent, 0),
  },
]

function Readout({ label, unit, select }: ReadoutDefinition) {
  const value = useTelemetry(select)
  const labelId = useId()
  const showUnit = unit !== undefined && value !== NO_VALUE

  return (
    <div role="group" aria-labelledby={labelId} className={styles.readout}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <span className={styles.value}>
        {value}
        {showUnit ? (
          <>
            {' '}
            <span className={styles.unit}>{unit}</span>
          </>
        ) : null}
      </span>
    </div>
  )
}

export function TelemetryPanel() {
  const titleId = useId()

  return (
    <aside className={classNames(panelStyles.panel, styles.telemetry)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        Telemetry
      </h2>
      <AttitudeIndicator />
      <div className={styles.readouts}>
        {READOUTS.map((readout) => (
          <Readout key={readout.label} {...readout} />
        ))}
      </div>
    </aside>
  )
}
