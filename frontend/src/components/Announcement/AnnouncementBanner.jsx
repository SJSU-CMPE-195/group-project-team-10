import { useEffect, useState } from 'react'
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

  return (
    <div
      className={`announcement-banner announcement-banner--${severity}`}
      role={severity === 'critical' ? 'alert' : 'status'}
    >
      <div className="announcement-content">
        <strong>{announcement.title}</strong>
        <span>{announcement.message}</span>
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
