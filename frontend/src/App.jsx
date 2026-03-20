import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [message, setMessage] = useState("Loading...")

  useEffect(() => {
  fetch("http://localhost:8080/api/health")
  .then(res => res.json())
  .then(data => console.log("Backend says:", data, setMessage(JSON.stringify(data))))
  .catch(err => console.error("Error:", err), setMessage("Error connecting to backend"))
    })


return (
  <div>
    <h1>Backend Test Via CORS</h1>
    <p>{message}</p>
  </div>
)
}

export default App
