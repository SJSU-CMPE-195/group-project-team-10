import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRoadmapVariant, VARIANT_KEY } from './experiment'

describe('getRoadmapVariant', () => {
  afterEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  })

  it('assigns a random variant and keeps it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)

    expect(getRoadmapVariant()).toBe('autosave')
    expect(localStorage.getItem(VARIANT_KEY)).toBe('autosave')

    Math.random.mockReturnValue(0.1)
    expect(getRoadmapVariant()).toBe('autosave')
  })

  it('uses the stored variant', () => {
    localStorage.setItem(VARIANT_KEY, 'warning')
    expect(getRoadmapVariant()).toBe('warning')
  })

  it('lets the url override and store the variant', () => {
    localStorage.setItem(VARIANT_KEY, 'warning')
    window.history.replaceState(null, '', '/?variant=autosave')

    expect(getRoadmapVariant()).toBe('autosave')
    expect(localStorage.getItem(VARIANT_KEY)).toBe('autosave')
  })

  it('ignores unknown values', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    localStorage.setItem(VARIANT_KEY, 'bogus')
    window.history.replaceState(null, '', '/?variant=bogus')

    expect(getRoadmapVariant()).toBe('warning')
  })
})
