import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useLocaleStore } from './localeStore'

describe('LanguageSwitcher', () => {
  it('names each language in that language and marks the current one', () => {
    render(<LanguageSwitcher />)

    const group = screen.getByRole('group', { name: 'Language' })
    expect(group).toContainElement(screen.getByRole('button', { name: 'English', pressed: true }))
    expect(screen.getByRole('button', { name: 'Українська', pressed: false })).toHaveAttribute(
      'lang',
      'uk',
    )
  })

  it('switches the interface language', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole('button', { name: 'Українська' }))

    expect(useLocaleStore.getState().locale).toBe('uk')
    expect(screen.getByRole('group', { name: 'Мова' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Українська', pressed: true })).toBeInTheDocument()
  })
})
