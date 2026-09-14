import { useState } from 'react'
import './AnnouncementBanner.css'

function AnnouncementBanner() {
  const [visible, setVisible] = useState(true)

  const announcement = {
    title: 'System Announcement',
    message:
      'Course Planner Plus will be undergoing maintenance this Friday from 6 PM to 8 PM.',
  }

  if (!visible) {
    return null
  }

  return (
    <div className="announcement-banner">
      <div className="announcement-content">
        <strong>{announcement.title}</strong>
        <span>{announcement.message}</span>
      </div>

      <button
        className="announcement-close"
        onClick={() => setVisible(false)}
        aria-label="Dismiss announcement"
      >
        ×
      </button>
    </div>
  )
}

export default AnnouncementBanner