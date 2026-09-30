import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setApiToken } from '../api'

const AuthContext = createContext(null)
const STORAGE_KEY = 'tf-auth-token'
const STUDENT_KEY = 'tf-auth-student'

export function AuthProvider({ children }) {
  // Token in memory (React state) + mirrored to localStorage
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null)
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STUDENT_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setApiToken(token)
    setReady(true)
  }, [token])

  // After a cold load with a saved token, refresh the student profile (adds department_name)
  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    api
      .getMe()
      .then(async (me) => {
        if (cancelled || !me) return
        // Enrich with department name when possible
        try {
          const full = await api.getStudent(me.student_id)
          if (!cancelled) {
            setUser(full)
            localStorage.setItem(STUDENT_KEY, JSON.stringify(full))
          }
        } catch {
          if (!cancelled) {
            setUser(me)
            localStorage.setItem(STUDENT_KEY, JSON.stringify(me))
          }
        }
      })
      .catch(() => {
        /* 401 handler clears storage */
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const persistSession = useCallback(async (res) => {
    setApiToken(res.token)
    setToken(res.token)
    let student = res.student
    // Prefer full student row (has department_name) for the user menu
    try {
      student = await api.getStudent(res.student.student_id)
    } catch {
      /* keep login payload */
    }
    setUser(student)
    localStorage.setItem(STORAGE_KEY, res.token)
    localStorage.setItem(STUDENT_KEY, JSON.stringify(student))
    return { ...res, student }
  }, [])

  const login = useCallback(
    async (email, password) => {
      const res = await api.login(email, password)
      return persistSession(res)
    },
    [persistSession],
  )

  const register = useCallback(
    async (payload) => {
      const res = await api.register(payload)
      return persistSession(res)
    },
    [persistSession],
  )

  const logout = useCallback(() => {
    setApiToken(null)
    setToken(null)
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STUDENT_KEY)
  }, [])

  const updateUser = useCallback((student) => {
    setUser((current) => {
      const updated = { ...current, ...student }
      localStorage.setItem(STUDENT_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      ready,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      updateUser,
    }),
    [token, user, ready, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
