import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GeoloniaIcon } from '../GeoloniaIcon'

describe('GeoloniaIcon', () => {
  it('renders an SVG with aria-label', () => {
    render(<GeoloniaIcon />)
    const svg = screen.getByRole('img', { name: 'Powered by Geolonia' })
    expect(svg).not.toBeNull()
    expect(svg.tagName.toLowerCase()).toBe('svg')
  })

  it('contains the "G" text element', () => {
    const { container } = render(<GeoloniaIcon />)
    const text = container.querySelector('text')
    expect(text).not.toBeNull()
    expect(text!.textContent).toBe('G')
  })

  it('has 24x24 dimensions', () => {
    render(<GeoloniaIcon />)
    const svg = screen.getByRole('img', { name: 'Powered by Geolonia' })
    expect(svg.getAttribute('width')).toBe('24')
    expect(svg.getAttribute('height')).toBe('24')
  })
})
