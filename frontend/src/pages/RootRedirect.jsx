import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Intro entry at "/":
 *   signed out → /login
 *   signed in  → /home
 */
export default function RootRedirect() {
  const { isAuthenticated, ready } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04060c] text-sm text-slate-400">
        Loading…
      </div>
    )
  }

  return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />
}
