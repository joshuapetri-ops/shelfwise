import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BooksProvider } from './hooks/useBooks'
import { CriteriaProvider } from './hooks/useCriteria'
import { SettingsProvider } from './hooks/useSettings'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SettingsProvider>
          <CriteriaProvider>
            <BooksProvider>
              <App />
            </BooksProvider>
          </CriteriaProvider>
        </SettingsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
