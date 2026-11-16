import { useState, type KeyboardEvent, type SubmitEvent } from 'react'
import type { LatLon } from '../geo/geo'
import { useMessages } from '../i18n/localeStore'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import fieldStyles from '../ui/field.module.css'
import {
  AFFILIATIONS,
  affiliationSchema,
  cleanMarkName,
  MARK_KINDS,
  markKindSchema,
  MAX_MARK_NAME_LENGTH,
  type Affiliation,
  type Mark,
  type MarkKind,
} from './mark'
import styles from './MarkForm.module.css'
import { useMarksStore } from './marksStore'
import { SymbolIcon } from './SymbolIcon'

interface MarkFormProps {
  point: LatLon
  onClose: (added: Mark | null) => void
}

export function MarkForm({ point, onClose }: MarkFormProps) {
  const text = useMessages().marks
  const addMark = useMarksStore((state) => state.add)
  const [name, setName] = useState(() =>
    text.defaultName(useMarksStore.getState().marks.length + 1),
  )
  const [affiliation, setAffiliation] = useState<Affiliation>('unknown')
  const [kind, setKind] = useState<MarkKind>('ground')
  const canSave = cleanMarkName(name) !== ''

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (canSave) {
      onClose(addMark({ lat: point.lat, lon: point.lon, name, affiliation, kind }))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose(null)
    }
  }

  return (
    <form
      className={styles.form}
      aria-label={text.form}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <label className={fieldStyles.field}>
        {text.name}
        <input
          className={fieldStyles.input}
          value={name}
          maxLength={MAX_MARK_NAME_LENGTH}
          autoFocus
          onChange={(event) => {
            setName(event.currentTarget.value)
          }}
        />
      </label>
      <div className={styles.symbol}>
        <label className={fieldStyles.field}>
          {text.affiliation}
          <select
            className={fieldStyles.input}
            value={affiliation}
            onChange={(event) => {
              const parsed = affiliationSchema.safeParse(event.currentTarget.value)
              if (parsed.success) {
                setAffiliation(parsed.data)
              }
            }}
          >
            {AFFILIATIONS.map((option) => (
              <option key={option} value={option}>
                {text.affiliations[option]}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldStyles.field}>
          {text.kind}
          <select
            className={fieldStyles.input}
            value={kind}
            onChange={(event) => {
              const parsed = markKindSchema.safeParse(event.currentTarget.value)
              if (parsed.success) {
                setKind(parsed.data)
              }
            }}
          >
            {MARK_KINDS.map((option) => (
              <option key={option} value={option}>
                {text.kinds[option]}
              </option>
            ))}
          </select>
        </label>
        <SymbolIcon symbol={{ affiliation, kind }} />
      </div>
      <div className={styles.actions}>
        <button
          type="submit"
          className={classNames(buttonStyles.button, buttonStyles.primary)}
          disabled={!canSave}
        >
          {text.save}
        </button>
        <button
          type="button"
          className={buttonStyles.button}
          onClick={() => {
            onClose(null)
          }}
        >
          {text.cancel}
        </button>
      </div>
    </form>
  )
}
