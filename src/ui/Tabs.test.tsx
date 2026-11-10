import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const ITEMS = [
  { id: 'first', label: 'First', content: <p>First content</p> },
  { id: 'second', label: 'Second', content: <p>Second content</p> },
  { id: 'third', label: 'Third', content: <p>Third content</p> },
]

function renderTabs(onChange = vi.fn()) {
  render(<Tabs label="Example" items={ITEMS} onChange={onChange} />)
  return { onChange }
}

describe('Tabs', () => {
  it('shows the first tab by default', () => {
    renderTabs()

    expect(screen.getByRole('tablist', { name: 'Example' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'First' })).toHaveTextContent('First content')
    expect(screen.queryByText('Second content')).not.toBeInTheDocument()
  })

  it('switches tabs on click and reports the change', async () => {
    const { onChange } = renderTabs()

    await userEvent.click(screen.getByRole('tab', { name: 'Second' }))

    expect(screen.getByRole('tabpanel', { name: 'Second' })).toHaveTextContent('Second content')
    expect(onChange).toHaveBeenCalledWith('second')
  })

  it('moves between tabs with the arrow, Home and End keys', async () => {
    const user = userEvent.setup()
    renderTabs()
    await user.click(screen.getByRole('tab', { name: 'First' }))

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Third' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'First' })).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Third' })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps only the selected tab in the tab order', () => {
    renderTabs()

    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('tabindex', '-1')
  })
})
