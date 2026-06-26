import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorDebug from './components/ErrorDebug.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorDebug>
      <App />
    </ErrorDebug>
  </StrictMode>,
)
