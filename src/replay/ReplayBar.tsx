import { useId } from 'react'
import { useReplaySession } from '../session/sessionContext'
import { formatDuration } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { PLAYBACK_SPEEDS } from './replayPlayer'
import styles from './ReplayBar.module.css'
import { usePlayback } from './usePlayback'

const SKIP_MS = 10_000

export function ReplayBar() {
  const titleId = useId()
  const speedLabelId = useId()
  const { player } = useReplaySession()
  const isPlaying = usePlayback((state) => state.isPlaying)
  const speed = usePlayback((state) => state.speed)
  const durationMs = usePlayback((state) => state.durationMs)
  const positionSeconds = usePlayback((state) => Math.floor(state.positionMs / 1000))
  const positionText = formatDuration(positionSeconds * 1000)
  const durationText = formatDuration(durationMs)

  function skip(offsetMs: number): void {
    player.seek(player.getState().positionMs + offsetMs)
  }

  return (
    <section className={classNames(panelStyles.panel, styles.replay)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        Flight replay
      </h2>
      <div className={styles.controls}>
        <button
          type="button"
          className={classNames(buttonStyles.button, styles.playButton)}
          onClick={isPlaying ? player.pause : player.play}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className={buttonStyles.button}
          onClick={() => {
            skip(-SKIP_MS)
          }}
        >
          Back 10 s
        </button>
        <button
          type="button"
          className={buttonStyles.button}
          onClick={() => {
            skip(SKIP_MS)
          }}
        >
          Forward 10 s
        </button>
        <p className={styles.time}>
          {positionText} / {durationText}
        </p>
        <div className={styles.speeds} role="group" aria-labelledby={speedLabelId}>
          <span id={speedLabelId} className={styles.speedLabel}>
            Speed
          </span>
          {PLAYBACK_SPEEDS.map((option) => (
            <button
              key={option}
              type="button"
              className={buttonStyles.button}
              aria-pressed={option === speed}
              onClick={() => {
                player.setSpeed(option)
              }}
            >
              {option}×
            </button>
          ))}
        </div>
      </div>
      <input
        type="range"
        className={styles.timeline}
        aria-label="Replay position"
        aria-valuetext={`${positionText} of ${durationText}`}
        min={0}
        max={Math.floor(durationMs / 1000)}
        step={1}
        value={positionSeconds}
        onChange={(event) => {
          player.seek(event.currentTarget.valueAsNumber * 1000)
        }}
      />
    </section>
  )
}
