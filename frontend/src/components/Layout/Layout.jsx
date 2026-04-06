import { NavLink, Outlet } from 'react-router-dom'
import './Layout.css'

const navLinkClass = ({ isActive }) => isActive ? "nav-link active" : "nav-link"

function Layout() {
  return (
    <div className="layout">
      <nav className="nav-bar">
        <NavLink to="/" className="nav-brand">Course Planner Plus</NavLink>
        <div className="nav-links">
          <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
          <NavLink to="/roadmap" className={navLinkClass}>Roadmap</NavLink>
          <NavLink to="/catalog" className={navLinkClass}>Catalog</NavLink>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
