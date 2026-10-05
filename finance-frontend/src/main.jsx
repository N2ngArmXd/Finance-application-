import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorDebug from './components/ErrorDebug.jsx'
import { installAuthFetch } from './utils/auth.js'

// ดัก 401 จากทุก API (session หมดอายุ) ก่อนแอปเริ่มยิง request
installAuthFetch()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorDebug>
      <App />
    </ErrorDebug>
  </StrictMode>,
)
