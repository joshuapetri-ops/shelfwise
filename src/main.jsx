import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import { BooksProvider } from './hooks/useBooks'
import { ChallengesProvider } from './hooks/useChallenges'
import { CriteriaProvider } from './hooks/useCriteria'
import { FollowProvider } from './hooks/useFollow'
import { LikesProvider } from './hooks/useLikes'
import { NotificationsProvider } from './hooks/useNotifications'
import { SettingsProvider } from './hooks/useSettings'
import { ToastProvider } from './components/Toast'
import './index.css'
import App from './App.jsx'

// Redirect to canonical origin so OAuth client_id always matches
const CANONICAL_HOST = 'www.shelfwise.xyz'
if (
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1' &&
  window.location.host !== CANONICAL_HOST
) {
  window.location.replace(`https://${CANONICAL_HOST}${window.location.pathname}${window.location.search}${window.location.hash}`)
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <CriteriaProvider>
              <BooksProvider>
                <ChallengesProvider>
                  <FollowProvider>
                    <LikesProvider>
                      <NotificationsProvider>
                        <ToastProvider>
                          <App />
                        </ToastProvider>
                      </NotificationsProvider>
                    </LikesProvider>
                  </FollowProvider>
                </ChallengesProvider>
              </BooksProvider>
            </CriteriaProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
