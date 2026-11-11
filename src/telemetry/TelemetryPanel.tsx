import { useId } from 'react'
import type { Messages } from '../i18n/en'
import { useMessages } from '../i18n/localeStore'
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
  id: keyof Messages['telemetry']['readouts']
  unit?: keyof Messages['units']
  select: (state: TelemetryState, messages: Messages) => string
}

const READOUTS: readonly ReadoutDefinition[] = [
  { id: 'flightMode', select: (state) => state.heartbeat?.mode ?? NO_VALUE },
  {
    id: 'arming',
    select: (state, messages) => formatArmed(state.heartbeat?.armed, messages.telemetry),
  },
  {
    id: 'altitude',
    unit: 'meters',
    select: (state) => formatDecimal(state.position?.altitudeM, 1),
  },
  {
    id: 'groundSpeed',
    unit: 'metersPerSecond',
    select: (state) => formatDecimal(state.position?.groundSpeedMs, 1),
  },
  { id: 'heading', select: (state) => formatHeading(state.position?.headingDeg) },
  { id: 'roll', select: (state) => formatSignedAngle(state.attitude?.rollDeg) },
  { id: 'pitch', select: (state) => formatSignedAngle(state.attitude?.pitchDeg) },
  {
    id: 'battery',
    unit: 'percent',
    select: (state) => formatDecimal(state.systemStatus?.batteryPercent, 0),
  },
  {
    id: 'gps',
    unit: 'satellites',
    select: (state, messages) => formatGps(state.systemStatus, messages.telemetry.noGpsFix),
  },
  {
    id: 'linkQuality',
    unit: 'percent',
    select: (state) => formatDecimal(state.systemStatus?.linkQualityPercent, 0),
  },
]

function Readout({ id, unit, select }: ReadoutDefinition) {
  const messages = useMessages()
  const value = useTelemetry((state) => select(state, messages))
  const labelId = useId()
  const showUnit = unit !== undefined && value !== NO_VALUE

  return (
    <div role="group" aria-labelledby={labelId} className={styles.readout}>
      <span id={labelId} className={styles.label}>
        {messages.telemetry.readouts[id]}
      </span>
      <span className={styles.value}>
        {value}
        {showUnit ? (
          <>
            {' '}
            <span className={styles.unit}>{messages.units[unit]}</span>
          </>
        ) : null}
      </span>
    </div>
  )
}

export function TelemetryPanel() {
  const text = useMessages().telemetry
  const titleId = useId()

  return (
    <aside className={classNames(panelStyles.panel, styles.telemetry)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        {text.title}
      </h2>
      <AttitudeIndicator />
      <div className={styles.readouts}>
        {READOUTS.map((readout) => (
          <Readout key={readout.id} {...readout} />
        ))}
      </div>
    </aside>
  )
}
