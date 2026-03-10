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

  it('contains the Geolonia symbol paths', () => {
    const { container } = render(<GeoloniaIcon />)
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(4)
    const polygon = container.querySelector('polygon')
    expect(polygon).not.toBeNull()
  })

  it('uses the correct brand colors', () => {
    const { container } = render(<GeoloniaIcon />)
    const paths = container.querySelectorAll('path')
    const fills = Array.from(paths).map((p) => p.getAttribute('fill'))
    expect(fills).toContain('#EE730D')
    expect(fills).toContain('#EB5C0C')
    expect(fills).toContain('#E84130')
    expect(fills).toContain('#FAC03D')
    const polygon = container.querySelector('polygon')
    expect(polygon!.getAttribute('fill')).toBe('#F39813')
  })

  it('has 24x24 dimensions', () => {
    render(<GeoloniaIcon />)
    const svg = screen.getByRole('img', { name: 'Powered by Geolonia' })
    expect(svg.getAttribute('width')).toBe('24')
    expect(svg.getAttribute('height')).toBe('24')
  })

  it('has the correct viewBox for the symbol', () => {
    render(<GeoloniaIcon />)
    const svg = screen.getByRole('img', { name: 'Powered by Geolonia' })
    expect(svg.getAttribute('viewBox')).toBe('0 0 136.063 136.063')
  })
})
