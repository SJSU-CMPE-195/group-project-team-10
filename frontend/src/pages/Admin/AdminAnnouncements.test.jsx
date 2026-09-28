import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AdminAnnouncements from './AdminAnnouncements'
import * as authApi from '../../lib/authApi'

const auth = vi.hoisted(() => ({ user: null, authLoading: false }))

vi.mock('../../context/useAuth', () => ({
  useAuth: () => auth,
}))

vi.mock('../../lib/authApi', () => ({
  fetchAllAnnouncements: vi.fn(),
  createAnnouncement: vi.fn(),
  deactivateAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
}))

const admin = { id: 1, fullName: 'Ada Admin', email: 'admin@sjsu.edu', role: 'ADMIN' }

const existing = [
  {
    id: 7,
    title: 'Maintenance',
    message: 'Down Friday',
    severity: 'WARNING',
    active: true,
    createdAt: '2026-09-20T18:00:00Z',
    expiresAt: null,
    createdByName: 'Ada Admin',
  },
  {
    id: 6,
    title: 'Old news',
    message: 'Already over',
    severity: 'INFO',
    active: false,
    createdAt: '2026-09-01T18:00:00Z',
    expiresAt: null,
    createdByName: 'Ada Admin',
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAnnouncements />
    </MemoryRouter>,
  )
}

describe('AdminAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = admin
    auth.authLoading = false
    authApi.fetchAllAnnouncements.mockResolvedValue(existing)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks signed-out visitors to log in', () => {
    auth.user = null
    renderPage()

    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login')
    expect(authApi.fetchAllAnnouncements).not.toHaveBeenCalled()
  })

  it('blocks users who are not admins', () => {
    auth.user = { ...admin, role: 'USER' }
    renderPage()

    expect(screen.getByText('Admins only')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Send announcement' })).toBeNull()
    expect(authApi.fetchAllAnnouncements).not.toHaveBeenCalled()
  })

  it('lists existing announcements with their status', async () => {
    renderPage()

    expect(await screen.findByText('Maintenance')).toBeDefined()
    expect(screen.getByText('Old news')).toBeDefined()
    expect(screen.getByText('Active')).toBeDefined()
    expect(screen.getByText('Inactive')).toBeDefined()
    // only the active one can be deactivated
    expect(screen.getAllByRole('button', { name: 'Deactivate' })).toHaveLength(1)
  })

  it('sends a new announcement and refreshes the list', async () => {
    authApi.createAnnouncement.mockResolvedValue({ id: 8 })
    renderPage()
    await screen.findByText('Maintenance')

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Registration opens' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Monday at 8 AM' } })
    fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'CRITICAL' } })

    // the preview uses the real banner markup
    expect(screen.getByText('Registration opens').closest('.announcement-banner').className)
      .toContain('announcement-banner--critical')

    fireEvent.click(screen.getByRole('button', { name: 'Send announcement' }))

    await waitFor(() => expect(authApi.createAnnouncement).toHaveBeenCalledWith({
      title: 'Registration opens',
      message: 'Monday at 8 AM',
      severity: 'CRITICAL',
      expiresAt: null,
    }))
    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByLabelText('Title').value).toBe('')
    await waitFor(() => expect(authApi.fetchAllAnnouncements).toHaveBeenCalledTimes(2))
  })

  it('has an email checkbox that is on by default and resets after sending', async () => {
    authApi.createAnnouncement.mockResolvedValue({ id: 8 })
    renderPage()
    await screen.findByText('Maintenance')

    const emailBox = screen.getByLabelText('Also send as an email')
    expect(emailBox.checked).toBe(true)

    fireEvent.click(emailBox)
    expect(emailBox.checked).toBe(false)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Hi' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'There' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send announcement' }))

    await waitFor(() => expect(authApi.createAnnouncement).toHaveBeenCalled())
    // visual only for now: the choice is not sent to the API
    expect(authApi.createAnnouncement.mock.calls[0][0]).not.toHaveProperty('sendEmail')
    await waitFor(() => expect(screen.getByLabelText('Also send as an email').checked).toBe(true))
  })

  it('shows the server error when sending fails', async () => {
    authApi.createAnnouncement.mockRejectedValue(new Error('Expiry must be in the future'))
    renderPage()
    await screen.findByText('Maintenance')

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Hi' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'There' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send announcement' }))

    expect(await screen.findByText('Expiry must be in the future')).toBeDefined()
    expect(screen.getByLabelText('Title').value).toBe('Hi')
  })

  it('deactivates and deletes announcements', async () => {
    authApi.deactivateAnnouncement.mockResolvedValue({})
    authApi.deleteAnnouncement.mockResolvedValue(null)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await screen.findByText('Maintenance')

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(authApi.deactivateAnnouncement).toHaveBeenCalledWith(7))

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1])
    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(authApi.deleteAnnouncement).toHaveBeenCalledWith(6))
  })
})
