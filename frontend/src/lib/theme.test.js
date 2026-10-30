import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { getStoredTheme, storeTheme, THEME_KEY } from './theme'
import { useTheme } from '../hooks/useTheme'

function mockSystemDark(matches) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
}

describe('theme', () => {
  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    vi.unstubAllGlobals()
  })

  it('defaults to system and ignores unknown values', () => {
    expect(getStoredTheme()).toBe('system')
    localStorage.setItem(THEME_KEY, 'purple')
    expect(getStoredTheme()).toBe('system')
  })

  it('stores the chosen theme', () => {
    storeTheme('dark')
    expect(getStoredTheme()).toBe('dark')

    storeTheme('system')
    expect(getStoredTheme()).toBe('system')
  })

  it('follows the OS setting when set to system', () => {
    mockSystemDark(true)
    renderHook(() => useTheme())
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('a forced theme wins over the OS setting and is saved', () => {
    mockSystemDark(true)
    const { result } = renderHook(() => useTheme())

    act(() => result.current[1]('light'))

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
  })
})
