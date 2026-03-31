import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CodePanel } from '../CodePanel'

const highlightCodeMock = vi.fn()

vi.mock('../highlight', () => ({
  highlightCode: (...args: unknown[]) => highlightCodeMock(...args),
}))

// jsdom does not implement HTMLDialogElement.showModal / close natively
beforeEach(() => {
  highlightCodeMock.mockResolvedValue(
    '<pre class="shiki github-dark"><code><span>const x = 1</span></code></pre>',
  )

  HTMLDialogElement.prototype.showModal ??= vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close ??= vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
})

const defaultProps = {
  code: 'const x = 1',
  lang: 'typescript' as const,
  title: 'サンプルコード',
  description: 'コピーして使ってください。',
}

describe('CodePanel', () => {
  it('renders the view source button', () => {
    render(<CodePanel {...defaultProps} />)
    expect(screen.getByRole('button', { name: /ソースコードを見る/ })).toBeInTheDocument()
  })

  it('opens the dialog when the button is clicked', () => {
    render(<CodePanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ソースコードを見る/ }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('open')
  })

  it('displays the title', () => {
    render(<CodePanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ソースコードを見る/ }))
    expect(screen.getByText('サンプルコード')).toBeInTheDocument()
  })

  it('displays the description', () => {
    render(<CodePanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ソースコードを見る/ }))
    expect(screen.getByText('コピーして使ってください。')).toBeInTheDocument()
  })

  it('shows highlighted code after Shiki loads', async () => {
    render(<CodePanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ソースコードを見る/ }))
    await waitFor(() => {
      expect(screen.getByText('const x = 1')).toBeInTheDocument()
    })
  })

  it('shows fallback plain code before Shiki loads', () => {
    // Replace mock with a never-resolving promise to keep loading state
    highlightCodeMock.mockReturnValue(new Promise(() => {}))
    render(<CodePanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ソースコードを見る/ }))
    const codeEl = screen.getByRole('dialog', { hidden: true }).querySelector('code')
    expect(codeEl?.textContent).toBe('const x = 1')
  })

  it('keeps fallback visible when Shiki fails', async () => {
    highlightCodeMock.mockRejectedValue(new Error('load failed'))
    render(<CodePanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ソースコードを見る/ }))
    // Wait for the rejected promise to settle
    await waitFor(() => {
      const codeEl = screen.getByRole('dialog', { hidden: true }).querySelector('code')
      expect(codeEl?.textContent).toBe('const x = 1')
    })
  })

  it('has a copy button', () => {
    render(<CodePanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ソースコードを見る/ }))
    expect(screen.getByRole('button', { name: /コピー/ })).toBeInTheDocument()
  })

  it('closes the dialog when the close button is clicked', () => {
    render(<CodePanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ソースコードを見る/ }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('open')
    fireEvent.click(screen.getByRole('button', { name: /閉じる/ }))
    expect(dialog).not.toHaveAttribute('open')
  })
})
