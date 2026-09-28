import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AnnouncementBanner from './AnnouncementBanner'

const announcements = [
  { id: 1, title: 'Maintenance', message: 'Down Friday 6-8 PM', severity: 'WARNING' },
  { id: 2, title: 'Outage', message: 'Login is broken', severity: 'CRITICAL' },
  { id: 3, title: 'Welcome', message: 'Fall 2026 schedules are in', severity: 'INFO' },
]

function mockFetch(response) {
  globalThis.fetch = vi.fn(async (url) => {
    if (url !== '/api/announcements/active') throw new Error(`Unexpected fetch: ${url}`)
    return response
  })
}

describe('AnnouncementBanner', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    mockFetch({ ok: true, json: async () => announcements })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('renders every active announcement from the API', async () => {
    render(<AnnouncementBanner />)

    expect(await screen.findByText('Maintenance')).toBeDefined()
    expect(screen.getByText('Down Friday 6-8 PM')).toBeDefined()
    expect(screen.getByText('Outage')).toBeDefined()
    expect(screen.getByText('Welcome')).toBeDefined()
  })

  it('styles each banner by severity', async () => {
    render(<AnnouncementBanner />)

    const warning = (await screen.findByText('Maintenance')).closest('.announcement-banner')
    expect(warning.className).toContain('announcement-banner--warning')
    expect(warning.getAttribute('role')).toBe('status')

    const critical = screen.getByText('Outage').closest('.announcement-banner')
    expect(critical.className).toContain('announcement-banner--critical')
    expect(critical.getAttribute('role')).toBe('alert')
  })

  it('dismisses only the announcement that was closed', async () => {
    render(<AnnouncementBanner />)
    await screen.findByText('Maintenance')

    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss announcement' })[0])

    expect(screen.queryByText('Maintenance')).toBeNull()
    expect(screen.getByText('Outage')).toBeDefined()
    expect(screen.getByText('Welcome')).toBeDefined()
  })

  it('offers Show more only for messages longer than two lines', async () => {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function () {
      return this.textContent === 'Down Friday 6-8 PM' ? 72 : 24
    })
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(48)

    render(<AnnouncementBanner />)
    await screen.findByText('Maintenance')

    const toggles = await screen.findAllByRole('button', { name: 'Show more' })
    expect(toggles).toHaveLength(1)
    const message = screen.getByText('Down Friday 6-8 PM')
    expect(message.className).not.toContain('is-expanded')

    fireEvent.click(toggles[0])
    expect(message.className).toContain('is-expanded')
    const showLess = screen.getByRole('button', { name: 'Show less' })
    expect(showLess.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(showLess)
    expect(message.className).not.toContain('is-expanded')
  })

  it('renders nothing when there are no announcements', async () => {
    mockFetch({ ok: true, json: async () => [] })
    const { container } = render(<AnnouncementBanner />)

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when the request fails', async () => {
    mockFetch({ ok: false, status: 500, json: async () => ({}) })
    const { container } = render(<AnnouncementBanner />)

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })
})
