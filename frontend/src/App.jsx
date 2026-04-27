import { Routes, Route } from 'react-router-dom'
import { RoadmapProvider } from './context/RoadmapContext'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import Roadmap from './pages/Roadmap/Roadmap'
import Catalog from './pages/Catalog/Catalog'
import Login from './pages/Login/Login'
import Signup from './pages/Signup/Signup'
import Profile from "./pages/Profile/Profile";
import './App.css'

function App() {
  return (
    <RoadmapProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </RoadmapProvider>
  )
}

export default App