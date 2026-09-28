import { useEffect, useId, useRef, useState } from 'react'
import { fetchActiveAnnouncements } from '../../api/announcements'
import './AnnouncementBanner.css'

function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([])
  const [dismissedIds, setDismissedIds] = useState(() => new Set())

  useEffect(() => {
    let cancelled = false

    fetchActiveAnnouncements()
      .then((data) => {
        if (!cancelled) setAnnouncements(data)
      })
      .catch(() => {
        // show nothing if announcement cant load
      })

    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = (id) => {
    setDismissedIds((prev) => new Set(prev).add(id))
  }

  const visible = announcements.filter((announcement) => !dismissedIds.has(announcement.id))

  if (visible.length === 0) {
    return null
  }

  return (
    <div className="announcement-list">
      {visible.map((announcement) => (
        <AnnouncementItem
          key={announcement.id}
          announcement={announcement}
          onDismiss={() => dismiss(announcement.id)}
        />
      ))}
    </div>
  )
}

// also used by admin page to preview an announcement before sending it
export function AnnouncementItem({ announcement, onDismiss }) {
  const severity = (announcement.severity || 'INFO').toLowerCase()
  const messageId = useId()
  const messageRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  // "Show more" when text is cut off
  useEffect(() => {
    const element = messageRef.current
    if (!element || expanded) return

    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [announcement.message, expanded])

  return (
    <div
      className={`announcement-banner announcement-banner--${severity}`}
      role={severity === 'critical' ? 'alert' : 'status'}
    >
      <div className="announcement-content">
        <strong>{announcement.title}</strong>
        <div className="announcement-body">
          <p
            ref={messageRef}
            id={messageId}
            className={`announcement-message${expanded ? ' is-expanded' : ''}`}
          >
            {announcement.message}
          </p>
          {overflowing && (
            <button
              type="button"
              className="announcement-toggle"
              aria-expanded={expanded}
              aria-controls={messageId}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          className="announcement-close"
          onClick={onDismiss}
          aria-label="Dismiss announcement"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default AnnouncementBanner
