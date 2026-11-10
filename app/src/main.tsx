import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { account } from './sync'

// Installs the offline cache and keeps it up to date in the background.
registerSW({ immediate: true })

// Restores a saved sign-in, if there is one, and starts syncing.
void account.start()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
