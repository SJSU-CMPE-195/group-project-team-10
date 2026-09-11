import { useEffect } from 'react'

// Dismiss-on-Escape for anything that opens over the page: the mobile nav
// drawer, the catalog filter panel. Does nothing while `active` is false, so
// no listener is attached for a panel that is already closed.
export function useEscapeKey(active, onEscape) {
  useEffect(() => {
    if (!active) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') onEscape()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, onEscape])
}
