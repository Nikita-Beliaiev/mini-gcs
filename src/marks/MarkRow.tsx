import { useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react'
import { flushSync } from 'react-dom'
import { formatMgrs } from '../geo/mgrs'
import { useMessages } from '../i18n/localeStore'
import { useMapPointsStore } from '../map/mapPointsStore'
import { downloadTextFile } from '../replay/download'
import { formatCoordinates, formatUtcTime } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import fieldStyles from '../ui/field.module.css'
import { cotFileName, markToCot } from './cotMarks'
import { cleanMarkName, MAX_MARK_NAME_LENGTH, type Mark } from './mark'
import { useMarksStore } from './marksStore'
import styles from './MarksPanel.module.css'
import { SymbolIcon } from './SymbolIcon'

interface MarkRowProps {
  mark: Mark
  onRemove: (mark: Mark) => void
}

export function MarkRow({ mark, onRemove }: MarkRowProps) {
  const text = useMessages().marks
  const rename = useMarksStore((state) => state.rename)
  const showOnMap = useMapPointsStore((state) => state.showOnMap)
  const [newName, setNewName] = useState<string | null>(null)
  const renameButton = useRef<HTMLButtonElement>(null)
  const iconButton = classNames(buttonStyles.button, buttonStyles.icon)

  function closeRename(): void {
    flushSync(() => {
      setNewName(null)
    })
    renameButton.current?.focus()
  }

  function handleRename(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (newName !== null && cleanMarkName(newName)) {
      rename(mark.id, newName)
      closeRename()
    }
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLFormElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      closeRename()
    }
  }

  return (
    <li className={styles.mark}>
      <SymbolIcon symbol={mark} />
      {newName === null ? (
        <>
          <span className={styles.markText}>
            <span className={styles.markName}>{mark.name}</span>
            <span className={styles.markDetails}>{text.symbol(mark)}</span>
            <span className={styles.markDetails}>
              <span>{formatMgrs(mark) ?? formatCoordinates(mark)}</span>{' '}
              <span>{formatUtcTime(mark.createdAt)}</span>
            </span>
          </span>
          <span className={styles.markActions}>
            <button
              type="button"
              className={iconButton}
              aria-label={text.show(mark.name)}
              title={text.show(mark.name)}
              onClick={() => {
                showOnMap({ lat: mark.lat, lon: mark.lon })
              }}
            >
              ⌖
            </button>
            <button
              ref={renameButton}
              type="button"
              className={iconButton}
              aria-label={text.rename(mark.name)}
              title={text.rename(mark.name)}
              onClick={() => {
                setNewName(mark.name)
              }}
            >
              ✎
            </button>
            <button
              type="button"
              className={iconButton}
              aria-label={text.downloadCot(mark.name)}
              title={text.downloadCot(mark.name)}
              onClick={() => {
                downloadTextFile(markToCot(mark, new Date()), cotFileName(mark), 'application/xml')
              }}
            >
              CoT
            </button>
            <button
              type="button"
              className={iconButton}
              aria-label={text.remove(mark.name)}
              title={text.remove(mark.name)}
              onClick={() => {
                onRemove(mark)
              }}
            >
              ✕
            </button>
          </span>
        </>
      ) : (
        <form
          className={styles.rename}
          aria-label={text.rename(mark.name)}
          onSubmit={handleRename}
          onKeyDown={handleRenameKeyDown}
        >
          <input
            className={fieldStyles.input}
            aria-label={text.newName}
            value={newName}
            maxLength={MAX_MARK_NAME_LENGTH}
            autoFocus
            onChange={(event) => {
              setNewName(event.currentTarget.value)
            }}
          />
          <span className={styles.renameActions}>
            <button
              type="submit"
              className={classNames(buttonStyles.button, buttonStyles.primary)}
              disabled={!cleanMarkName(newName)}
            >
              {text.saveName}
            </button>
            <button type="button" className={buttonStyles.button} onClick={closeRename}>
              {text.cancel}
            </button>
          </span>
        </form>
      )}
    </li>
  )
}
