import { useEffect, useId, useState } from 'react'
import { useMessages } from '../i18n/localeStore'
import { formatMegabytes } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { useAppUpdateStore } from './appUpdate'
import {
  areaBytes,
  browserAreaStorage,
  readAreaStatus,
  removeArea,
  saveArea,
  type AreaManifest,
  type AreaStatus,
  type AreaStorageEnvironment,
} from './areaStorage'
import { useMapSourceStore, usesAreaPackage } from './mapSourceStore'
import styles from './OfflinePanel.module.css'

type PanelState =
  | { kind: 'checking' }
  | AreaStatus
  | { kind: 'saving'; manifest: AreaManifest; savedBytes: number }
  | { kind: 'failed'; manifest: AreaManifest }

interface OfflinePanelProps {
  storage?: AreaStorageEnvironment
}

export function OfflinePanel({ storage }: OfflinePanelProps) {
  const messages = useMessages()
  const text = messages.offline
  const titleId = useId()
  const isOnline = useMapSourceStore((state) => state.isOnline)
  const usesArea = useMapSourceStore(usesAreaPackage)
  const setPreferArea = useMapSourceStore((state) => state.setPreferArea)
  const appReady = useAppUpdateStore((state) => state.offlineReady)
  const [areaStorage] = useState(() => storage ?? browserAreaStorage())
  const [state, setState] = useState<PanelState>({ kind: 'checking' })

  useEffect(() => {
    let active = true
    readAreaStatus(areaStorage).then(
      (status) => {
        if (active) {
          setState(status)
        }
      },
      () => {
        if (active) {
          setState({ kind: 'unavailable' })
        }
      },
    )
    return () => {
      active = false
    }
  }, [areaStorage])

  function size(bytes: number): string {
    return formatMegabytes(bytes, messages.units)
  }

  async function save(manifest: AreaManifest): Promise<void> {
    setState({ kind: 'saving', manifest, savedBytes: 0 })
    try {
      await saveArea(
        manifest,
        (savedBytes) => {
          setState({ kind: 'saving', manifest, savedBytes })
        },
        areaStorage,
      )
      setState({ kind: 'saved', manifest })
    } catch {
      setState({ kind: 'failed', manifest })
    }
  }

  async function remove(manifest: AreaManifest): Promise<void> {
    await removeArea(areaStorage)
    setState({ kind: 'notSaved', manifest })
  }

  function describe(): string {
    switch (state.kind) {
      case 'checking':
        return text.checking
      case 'unavailable':
        return text.unavailable
      case 'notSaved':
        return text.notSaved(size(areaBytes(state.manifest)))
      case 'saving':
        return text.saving(size(state.savedBytes), size(areaBytes(state.manifest)))
      case 'saved':
        return text.saved(size(areaBytes(state.manifest)), state.manifest.builtAt)
      case 'failed':
        return text.failed
    }
  }

  return (
    <section className={classNames(panelStyles.panel, styles.offline)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        {text.title}
      </h2>
      <p className={styles.note}>{appReady ? text.appReady : text.appNotReady}</p>
      {isOnline ? null : <p className={styles.warning}>{text.noNetworkNote}</p>}
      <p className={styles.status} data-error={state.kind === 'failed'} aria-live="polite">
        {describe()}
      </p>
      {state.kind === 'saving' ? (
        <progress
          className={styles.progress}
          aria-label={text.progress}
          value={state.savedBytes}
          max={areaBytes(state.manifest)}
        />
      ) : null}
      <div className={styles.actions}>
        {state.kind === 'notSaved' || state.kind === 'failed' ? (
          <button
            type="button"
            className={classNames(buttonStyles.button, buttonStyles.primary)}
            onClick={() => void save(state.manifest)}
          >
            {text.save}
          </button>
        ) : null}
        {state.kind === 'saved' ? (
          <button
            type="button"
            className={buttonStyles.button}
            onClick={() => void remove(state.manifest)}
          >
            {text.remove}
          </button>
        ) : null}
        <button
          type="button"
          className={buttonStyles.button}
          aria-pressed={usesArea}
          disabled={!isOnline}
          title={text.useAreaNote}
          onClick={() => {
            setPreferArea(!usesArea)
          }}
        >
          {text.useArea}
        </button>
      </div>
    </section>
  )
}
