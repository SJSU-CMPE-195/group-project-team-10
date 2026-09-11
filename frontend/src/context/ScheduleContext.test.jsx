import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScheduleProvider } from './ScheduleContext'
import { useSchedule } from './useSchedule'

function Probe() {
  const { activeTerm, availableTerms, selectedSections } = useSchedule()
  return (
    <div>
      <span data-testid="active">{activeTerm}</span>
      <span data-testid="available">{availableTerms.join('|')}</span>
      <span data-testid="count">{selectedSections.length}</span>
    </div>
  )
}

function renderProbe() {
  return render(
    <ScheduleProvider>
      <Probe />
    </ScheduleProvider>
  )
}

describe('ScheduleContext terms', () => {
  beforeEach(() => {
    localStorage.clear()
    globalThis.fetch = vi.fn(url => {
      if (url === '/api/catalog/terms') {
        return Promise.resolve({ ok: true, json: async () => ['Spring 2026'] })
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
    })
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('takes its terms from the catalog api, not a hardcoded list', async () => {
    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('available').textContent).toBe('Spring 2026')
    })

    // the old hardcoded lowercase terms could never match a real section
    expect(screen.getByTestId('available').textContent).not.toContain('spring 2026')
    expect(screen.getByTestId('available').textContent).not.toContain('fall 2026')
  })

  it('defaults to a real term once the api responds', async () => {
    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('active').textContent).toBe('Spring 2026')
    })
  })

  it('heals a stale saved term instead of stranding an empty schedule', async () => {
    localStorage.setItem('coursePlanner.activeScheduleTerm', 'spring 2026')

    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('active').textContent).toBe('Spring 2026')
    })
    expect(localStorage.getItem('coursePlanner.activeScheduleTerm')).toBe('Spring 2026')
  })

  it('keeps a saved term that still has sections', async () => {
    localStorage.setItem('coursePlanner.schedulesByTerm', JSON.stringify({
      'Fall 2026': [{ id: 1, courseCode: 'CMPE 195B', term: 'Fall 2026' }],
    }))
    localStorage.setItem('coursePlanner.activeScheduleTerm', 'Fall 2026')

    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('available').textContent).toContain('Spring 2026')
    })
    expect(screen.getByTestId('active').textContent).toBe('Fall 2026')
    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('survives the terms request failing', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('network down')))

    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('0')
    })
    expect(screen.getByTestId('active').textContent).toBe('')
  })
})
