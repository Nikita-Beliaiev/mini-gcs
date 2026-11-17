import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import { useAppUpdateStore } from './appUpdate'
import { UpdatePrompt } from './UpdatePrompt'

describe('UpdatePrompt', () => {
  it('stays hidden until a new version is ready', () => {
    render(<UpdatePrompt />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('offers to reload into a new version', async () => {
    const applyUpdate = vi.fn()
    useAppUpdateStore.setState({ updateReady: true, applyUpdate })
    render(<UpdatePrompt />)

    expect(screen.getByRole('status')).toHaveTextContent('A new version of the station is ready.')
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(applyUpdate).toHaveBeenCalledOnce()
  })

  it('speaks Ukrainian', () => {
    useLocaleStore.getState().setLocale('uk')
    useAppUpdateStore.setState({ updateReady: true })
    render(<UpdatePrompt />)

    expect(screen.getByRole('button', { name: 'Перезавантажити' })).toBeInTheDocument()
  })
})
