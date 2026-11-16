import { useId, useState, type ChangeEvent } from 'react'
import { useMessages } from '../i18n/localeStore'
import { downloadTextFile } from '../replay/download'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import fileInputStyles from '../ui/fileInput.module.css'
import panelStyles from '../ui/panel.module.css'
import { marksFileName, serializeMarksGeoJson } from './geoJsonMarks'
import { MAX_MARKS, mergeMarks, type Mark } from './mark'
import { describeMarksFileError } from './markFileErrorText'
import { MARKS_FILE_ACCEPT, readMarksFile } from './markFiles'
import { MarkRow } from './MarkRow'
import styles from './MarksPanel.module.css'
import { useMarksStore } from './marksStore'

interface Status {
  message: string
  isError: boolean
}

export function MarksPanel() {
  const messages = useMessages()
  const text = messages.marks
  const titleId = useId()
  const marks = useMarksStore((state) => state.marks)
  const removeMark = useMarksStore((state) => state.remove)
  const importMarks = useMarksStore((state) => state.importMarks)
  const [status, setStatus] = useState<Status | null>(null)

  function remove(mark: Mark): void {
    removeMark(mark.id)
    setStatus({ message: text.removed(mark.name), isError: false })
  }

  function downloadGeoJson(): void {
    downloadTextFile(
      serializeMarksGeoJson(marks),
      marksFileName(new Date()),
      'application/geo+json',
    )
  }

  async function importFile(file: File): Promise<void> {
    const result = await readMarksFile(file, {
      now: new Date(),
      createId: () => crypto.randomUUID(),
      untitled: text.untitled,
    })
    if (!result.ok) {
      const error = describeMarksFileError(result.error, messages)
      setStatus({ message: text.fileError(file.name, error), isError: true })
      return
    }
    if (mergeMarks(useMarksStore.getState().marks, result.marks).length > MAX_MARKS) {
      setStatus({ message: text.fileError(file.name, text.full(MAX_MARKS)), isError: true })
      return
    }
    importMarks(result.marks)
    setStatus({ message: text.imported(result.marks.length, result.skipped), isError: false })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) {
      void importFile(file)
    }
  }

  return (
    <section className={classNames(panelStyles.panel, styles.marks)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        {text.title}
      </h2>
      <p className={styles.note}>{text.note}</p>
      {marks.length === 0 ? (
        <p className={styles.note}>{text.empty}</p>
      ) : (
        <ul className={styles.list}>
          {marks.map((mark) => (
            <MarkRow key={mark.id} mark={mark} onRemove={remove} />
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={marks.length === 0}
          onClick={downloadGeoJson}
        >
          {text.downloadGeoJson}
        </button>
      </div>
      <label className={fileInputStyles.picker}>
        {text.import}
        <input
          type="file"
          accept={MARKS_FILE_ACCEPT}
          className={fileInputStyles.input}
          onChange={handleFileChange}
        />
      </label>
      <p className={styles.note}>{text.formats}</p>
      <p className={styles.status} data-error={status?.isError ?? false} aria-live="polite">
        {status?.message}
      </p>
    </section>
  )
}
