import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useLocaleStore } from './localeStore'

describe('LanguageSwitcher', () => {
  it('names each language in that language and marks the current one', () => {
    render(<LanguageSwitcher />)

    const group = screen.getByRole('group', { name: 'Language' })
    expect(group).toContainElement(
      screen.getByRole('button', { name: 'EN', description: 'English', pressed: true }),
    )
    const ukrainian = screen.getByRole('button', { name: 'УКР', description: 'Українська' })
    expect(ukrainian).toHaveAttribute('aria-pressed', 'false')
    expect(ukrainian).toHaveAttribute('lang', 'uk')
  })

  it('switches the interface language', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole('button', { name: 'УКР' }))

    expect(useLocaleStore.getState().locale).toBe('uk')
    expect(screen.getByRole('group', { name: 'Мова' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'УКР', pressed: true })).toBeInTheDocument()
  })
})
