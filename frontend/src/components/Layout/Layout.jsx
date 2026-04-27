import { useState } from 'react'
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

  async function handleConfirmLogout() {
    await logout()
    setShowLogoutConfirm(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="layout">
      <nav className="nav-bar">
        <NavLink to="/" className="nav-brand">Course Planner Plus</NavLink>

        <div className="nav-links">
          <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
          <NavLink to="/roadmap" className={navLinkClass}>Roadmap</NavLink>
          <NavLink to="/catalog" className={navLinkClass}>Catalog</NavLink>
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
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      {showLogoutConfirm && (
        <div className="modal-backdrop">
          <section className="logout-modal" role="dialog" aria-modal="true">
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