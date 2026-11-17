import { useMessages } from '../i18n/localeStore'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import { isLargeInset, toggledInsetWidth, type MapPanelView } from './insetWindow'
import styles from './InsetWindow.module.css'

interface InsetActionsProps {
  view: MapPanelView
  width: number
  onResize: (width: number) => void
  onSwap: () => void
}

export function InsetActions({ view, width, onResize, onSwap }: InsetActionsProps) {
  const text = useMessages().map.windows
  const isLarge = isLargeInset(view, width)
  const sizeLabel = isLarge ? text[view].shrink : text[view].enlarge
  const iconButton = classNames(buttonStyles.button, buttonStyles.icon)

  return (
    <span className={styles.actions}>
      <button
        type="button"
        className={iconButton}
        aria-label={sizeLabel}
        title={sizeLabel}
        onClick={() => {
          onResize(toggledInsetWidth(view, width))
        }}
      >
        {isLarge ? '⤡' : '⤢'}
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={text.swap}
        title={text.swap}
        onClick={onSwap}
      >
        ⇄
      </button>
    </span>
  )
}
