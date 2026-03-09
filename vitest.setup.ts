import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  // Mock Embed script tag
  const script = document.createElement('script')
  script.src = 'https://cdn.geolonia.com/v1/embed?geolonia-api-key=YOUR-API-KEY'
  script.setAttribute('data-testid', 'geolonia-embed')
  document.head.appendChild(script)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).geolonia = { Map: vi.fn(), registerPlugin: vi.fn() }
})

afterEach(() => {
  cleanup()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).geolonia

  // Remove mock Embed script tags
  const scripts = document.querySelectorAll('script[data-testid="geolonia-embed"]')
  scripts.forEach((s) => s.remove())
})
