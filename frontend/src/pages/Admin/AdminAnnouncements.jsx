import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import {
  createAnnouncement,
  deactivateAnnouncement,
  deleteAnnouncement,
  fetchAllAnnouncements,
} from '../../lib/authApi'
import { AnnouncementItem } from '../../components/Announcement/AnnouncementBanner'
import './AdminAnnouncements.css'

const TITLE_MAX = 120
const MESSAGE_MAX = 1000
const SEVERITIES = ['INFO', 'WARNING', 'CRITICAL']
const EMPTY_FORM = { title: '', message: '', severity: 'INFO', expiresAt: '', sendEmail: true }

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—'
}

function announcementStatus(announcement) {
  if (!announcement.active) return 'Inactive'
  if (announcement.expiresAt && new Date(announcement.expiresAt) <= new Date()) return 'Expired'
  return 'Active'
}

// page title and subtitle sit above the cards
function PageHeader({ title, subtitle }) {
  return (
    <header>
      <h1>{title}</h1>
      {subtitle && <p className="admin-subtitle">{subtitle}</p>}
    </header>
  )
}

function PageNotice({ title, children }) {
  return (
    <section className="admin-page">
      {title && <PageHeader title={title} />}
      <div className="admin-card">{children}</div>
    </section>
  )
}

function AnnouncementRow({ announcement, onDeactivate, onDelete }) {
  const status = announcementStatus(announcement)

  return (
    <li className="admin-list-item">
      <div className="admin-list-main">
        <div className="admin-list-title">
          <strong>{announcement.title}</strong>
          <span className={`admin-badge admin-badge--${status.toLowerCase()}`}>{status}</span>
          <span className={`admin-badge admin-badge--${announcement.severity.toLowerCase()}`}>
            {announcement.severity}
          </span>
        </div>
        <p>{announcement.message}</p>
        <small className="admin-muted">
          By {announcement.createdByName || 'unknown'} · {formatDate(announcement.createdAt)}
          {announcement.expiresAt && ` · until ${formatDate(announcement.expiresAt)}`}
        </small>
      </div>

      <div className="admin-list-actions">
        {status === 'Active' && (
          <button type="button" className="admin-button admin-button--secondary" onClick={onDeactivate}>
            Deactivate
          </button>
        )}
        <button type="button" className="admin-button admin-button--danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  )
}

function AdminAnnouncements() {
  const { user, authLoading } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  // { kind: 'error' | 'success', text }
  const [feedback, setFeedback] = useState(null)

  const [announcements, setAnnouncements] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false

    fetchAllAnnouncements()
      .then((data) => {
        if (cancelled) return
        setAnnouncements(data)
        setListError('')
      })
      .catch((error) => {
        if (!cancelled) setListError(error.message)
      })
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAdmin, refreshKey])

  if (authLoading) {
    return (
      <PageNotice>
        <p className="admin-muted">Loading…</p>
      </PageNotice>
    )
  }

  if (!user) {
    return (
      <PageNotice title="Announcements">
        <p className="admin-muted">Log in with an admin account to manage announcements.</p>
        <Link to="/login" className="admin-button">Log in</Link>
      </PageNotice>
    )
  }

  if (!isAdmin) {
    return (
      <PageNotice title="Admins only">
        <p className="admin-muted">Your account doesn&apos;t have access to this page.</p>
      </PageNotice>
    )
  }

  function updateField(event) {
    const { name, type, value, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setFeedback(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback(null)

    try {
      // TODO: send form.sendEmail once email delivery exists; the checkbox is visual only for now
      await createAnnouncement({
        title: form.title,
        message: form.message,
        severity: form.severity,
        // datetime local uses admin local time while API uses an ISO instant
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      })
      setForm(EMPTY_FORM)
      setFeedback({ kind: 'success', text: 'Announcement sent. It appears in the banner on the next page load.' })
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setFeedback({ kind: 'error', text: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  async function runAction(action) {
    setListError('')
    try {
      await action()
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setListError(error.message)
    }
  }

  function handleDelete(announcement) {
    if (!window.confirm(`Delete "${announcement.title}"? This cannot be undone.`)) return
    runAction(() => deleteAnnouncement(announcement.id))
  }

  const hasPreview = form.title.trim() || form.message.trim()

  return (
    <section className="admin-page">
      <PageHeader
        title="Announcements"
        subtitle="Published announcements show as a dismissible banner on every page."
      />

      <div className="admin-card">
        <h2>New announcement</h2>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>Title</span>
            <input
              name="title"
              value={form.title}
              onChange={updateField}
              maxLength={TITLE_MAX}
              required
            />
          </label>

          <div className="admin-field">
            <label htmlFor="announcement-message">Message</label>
            <textarea
              id="announcement-message"
              name="message"
              value={form.message}
              onChange={updateField}
              maxLength={MESSAGE_MAX}
              rows={4}
              aria-describedby="announcement-message-count"
              required
            />
            <small id="announcement-message-count" className="admin-muted">
              {form.message.length}/{MESSAGE_MAX}
            </small>
          </div>

          <div className="admin-form-row">
            <label className="admin-field">
              <span>Severity</span>
              <select name="severity" value={form.severity} onChange={updateField}>
                {SEVERITIES.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity.charAt(0) + severity.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Show until (optional)</span>
              <input
                type="datetime-local"
                name="expiresAt"
                value={form.expiresAt}
                onChange={updateField}
              />
            </label>
          </div>

          <label>
            <input type="checkbox" name="sendEmail" checked={form.sendEmail} onChange={updateField} />
            Also send as an email
          </label>

          {hasPreview && (
            <div className="admin-preview">
              <span className="admin-muted">Preview</span>
              <AnnouncementItem announcement={form} />
            </div>
          )}

          {feedback && (
            <p className={`admin-${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
              {feedback.text}
            </p>
          )}

          <button type="submit" className="admin-button" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send announcement'}
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2>All announcements</h2>
        {listError && <p className="admin-error" role="alert">{listError}</p>}

        {listLoading && <p className="admin-muted">Loading announcements…</p>}
        {!listLoading && announcements.length === 0 && <p className="admin-muted">No announcements yet.</p>}
        {announcements.length > 0 && (
          <ul className="admin-list">
            {announcements.map((announcement) => (
              <AnnouncementRow
                key={announcement.id}
                announcement={announcement}
                onDeactivate={() => runAction(() => deactivateAnnouncement(announcement.id))}
                onDelete={() => handleDelete(announcement)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default AdminAnnouncements
