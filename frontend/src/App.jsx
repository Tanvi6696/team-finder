import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import { HoodProvider } from './context/HoodContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import UnderTheHood from './components/UnderTheHood'
import RootRedirect from './pages/RootRedirect'
import Login from './pages/Login'
import Home from './pages/Home'
import CampusInsights from './pages/CampusInsights'
import Discover from './pages/Discover'
import InboxPage from './pages/Inbox'
import Teammates from './pages/Teammates'
import Network from './pages/Network'
import SqlExplorer from './pages/SqlExplorer'
import Profile from './pages/Profile'

function AuthenticatedChrome() {
  const { isAuthenticated } = useAuth()
  return (
    <>
      {isAuthenticated ? <UnderTheHood /> : null}
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            '!bg-[#0a101c]/95 !backdrop-blur !text-slate-100 !border !border-white/10',
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HoodProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                {/* Public */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />

                {/* Auth required */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="home" element={<Home />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="discover" element={<Discover />} />
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="teammates" element={<Teammates />} />
                    <Route path="network" element={<Network />} />
                    <Route path="insights" element={<CampusInsights />} />
                    <Route path="sql" element={<SqlExplorer />} />
                    <Route path="*" element={<Navigate to="/home" replace />} />
                  </Route>
                </Route>
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
          <AuthenticatedChrome />
        </HoodProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
