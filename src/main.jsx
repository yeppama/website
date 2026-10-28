import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './ui/fallback/ErrorBoundary.jsx'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Rete esterna: qualunque errore nel render arriva qui invece di lasciare
        la pagina nera. Dentro App, la scena 3D ha un boundary suo. */}
    <ErrorBoundary id="app" onRetry={() => window.location.reload()}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
