import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import { BooksProvider } from './hooks/useBooks'
import { ChallengesProvider } from './hooks/useChallenges'
import { CriteriaProvider } from './hooks/useCriteria'
import { SettingsProvider } from './hooks/useSettings'
import './index.css'
import App from './App.jsx'

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
                  <App />
                </ChallengesProvider>
              </BooksProvider>
            </CriteriaProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
