// Color theme preference: 'system' follows the OS setting, 'light' and 'dark'
// force one.
export const THEME_KEY = 'coursePlanner.theme'

export const THEMES = ['system', 'light', 'dark']

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return THEMES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function storeTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // storage blocked so the choice only lasts this visit
  }
}

export function systemDarkQuery() {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
}
