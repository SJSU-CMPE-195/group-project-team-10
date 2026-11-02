import { useEffect, useState } from 'react'
import { getStoredTheme, storeTheme, systemDarkQuery } from '../lib/theme'

function setResolvedTheme(resolved) {
  document.documentElement.dataset.theme = resolved
}

// Current theme preference and a setter that saves it. While the preference
// is 'system', OS theme changes are picked up.
export function useTheme() {
  const [theme, setThemeState] = useState(getStoredTheme)

  useEffect(() => {
    if (theme !== 'system') {
      setResolvedTheme(theme)
      return
    }

    const query = systemDarkQuery()
    setResolvedTheme(query?.matches ? 'dark' : 'light')
    if (!query) return

    const handleChange = (event) => setResolvedTheme(event.matches ? 'dark' : 'light')
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [theme])

  function setTheme(next) {
    storeTheme(next)
    setThemeState(next)
  }

  return [theme, setTheme]
}
