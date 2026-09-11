import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from "../../context/useAuth";
import './Layout.css'

const navLinkClass = ({ isActive }) => isActive ? "nav-link active" : "nav-link"

const loginLinkClass = ({ isActive }) =>
  isActive ? "nav-link login-button active" : "nav-link login-button"

function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  // any link or button inside the drawer dismisses it
  function handleDrawerClick(event) {
    if (event.target.closest('a, button')) setMenuOpen(false)
  }

  async function handleConfirmLogout() {
    await logout()
    setShowLogoutConfirm(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="layout">
      <nav className="nav-bar">
        <NavLink to="/" className="nav-brand">Course Planner Plus</NavLink>

        <button
          type="button"
          className="nav-toggle"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="nav-drawer"
          onClick={() => setMenuOpen(open => !open)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>

        {/* one set of links, css turns this into a drawer */}
        <div
          className="nav-drawer"
          id="nav-drawer"
          data-open={menuOpen}
          onClick={handleDrawerClick}
        >
          <div className="nav-links">
            <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
            <NavLink to="/roadmap" className={navLinkClass}>Roadmap</NavLink>
            <NavLink to="/catalog" className={navLinkClass}>Catalog</NavLink>
            <NavLink to="/schedule" className={navLinkClass}>Schedule</NavLink>
          </div>

          <div className="nav-auth">
            {!user ? (
              <NavLink to="/login" className={loginLinkClass}>Login</NavLink>
            ) : (
              <>
                <Link to="/profile" className="nav-user profile-nav-link">
                  {user.fullName || user.name || user.email}
                </Link>

                <button
                  type="button"
                  className="logout-button"
                  onClick={() => setShowLogoutConfirm(true)}
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      {showLogoutConfirm && (
        <div className="modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <section
            className="logout-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Log out?</h2>
            <p>You will be signed out of your Course Planner Plus account.</p>

            <div className="logout-modal-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-logout-button"
                onClick={handleConfirmLogout}
              >
                Log out
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default Layout
