import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import styles from './Tabs.module.css'

export interface TabItem {
  id: string
  label: string
  content: ReactNode
}

interface TabsProps {
  label: string
  items: readonly TabItem[]
  onChange?: (id: string) => void
}

function nextIndexForKey(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count
    case 'ArrowLeft':
      return (index - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

export function Tabs({ label, items, onChange }: TabsProps) {
  const baseId = useId()
  const [selectedId, setSelectedId] = useState(items[0]?.id)
  const tabElements = useRef(new Map<string, HTMLButtonElement>())

  function select(id: string): void {
    setSelectedId(id)
    onChange?.(id)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const nextIndex = nextIndexForKey(event.key, index, items.length)
    const next = nextIndex === null ? undefined : items[nextIndex]
    if (!next) {
      return
    }
    event.preventDefault()
    select(next.id)
    tabElements.current.get(next.id)?.focus()
  }

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label={label} className={styles.tablist}>
        {items.map((item, index) => {
          const isSelected = item.id === selectedId
          return (
            <button
              key={item.id}
              ref={(element) => {
                if (element) {
                  tabElements.current.set(item.id, element)
                }
                return () => {
                  tabElements.current.delete(item.id)
                }
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isSelected ? 0 : -1}
              className={styles.tab}
              onClick={() => {
                select(item.id)
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, index)
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {items.map((item) =>
        item.id === selectedId ? (
          <div
            key={item.id}
            role="tabpanel"
            id={`${baseId}-panel-${item.id}`}
            aria-labelledby={`${baseId}-tab-${item.id}`}
          >
            {item.content}
          </div>
        ) : null,
      )}
    </div>
  )
}
