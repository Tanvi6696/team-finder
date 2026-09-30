/**
 * Thin API helper — Vite /api proxy → Flask.
 * Stores Bearer token in memory (setApiToken) + AuthContext also mirrors to localStorage.
 * On any 401 (except login/register), clears auth and sends the browser to /login.
 */

let authToken = null

const TOKEN_KEY = 'tf-auth-token'
const STUDENT_KEY = 'tf-auth-student'

export function setApiToken(token) {
  authToken = token || null
}

export function getApiToken() {
  return authToken
}

/** Tell mounted pages to refresh data that depends on this student's profile. */
export function invalidateProfileData() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('profile-data-invalidated'))
  }
}

function clearStoredAuth() {
  authToken = null
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STUDENT_KEY)
  } catch {
    /* ignore */
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    // Login/register 401s are expected (wrong password) — do not bounce the page
    const isAuthAttempt =
      path.startsWith('/auth/login') || path.startsWith('/auth/register')

    if (res.status === 401 && !isAuthAttempt) {
      clearStoredAuth()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }

    const message = data?.error || `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export const api = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (body) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: () => request('/auth/me'),

  getMeDashboard: () => request('/me/dashboard'),
  getMyProfile: () => request('/me/profile'),
  updateMyProfile: (body) =>
    request('/me/profile', { method: 'PUT', body: JSON.stringify(body) }),
  addMySkill: (body) =>
    request('/me/skills', { method: 'POST', body: JSON.stringify(body) }),
  updateMySkill: (skillId, body) =>
    request(`/me/skills/${skillId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMySkill: (skillId) => request(`/me/skills/${skillId}`, { method: 'DELETE' }),
  changeMyPassword: (body) =>
    request('/me/password', { method: 'PUT', body: JSON.stringify(body) }),

  getStudents: (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v)
    })
    const qs = q.toString()
    return request(`/students${qs ? `?${qs}` : ''}`)
  },
  getStudent: (id) => request(`/students/${id}`),
  getProjects: () => request('/projects'),
  getProject: (projectId) => request(`/projects/${projectId}`),
  createProject: (body) =>
    request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProjectStatus: (projectId, projectStatus) =>
    request(`/projects/${projectId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ project_status: projectStatus }),
    }),
  createJoinRequest: (body) =>
    request('/join-requests', { method: 'POST', body: JSON.stringify(body) }),
  getJoinRequests: (type) =>
    request(`/join-requests?type=${encodeURIComponent(type)}`),
  acceptJoinRequest: (requestId) =>
    request(`/join-requests/${requestId}/accept`, { method: 'POST' }),
  rejectJoinRequest: (requestId) =>
    request(`/join-requests/${requestId}/reject`, { method: 'POST' }),
  getStats: () => request('/stats'),
  getDepartments: () => request('/departments'),
  getSkills: () => request('/skills'),
  getConnections: () => request('/connections'),
  dreamTeam: (projectId, size = 3) =>
    request(`/projects/${projectId}/dream-team?size=${encodeURIComponent(size)}`, {
      method: 'POST',
    }),
  recruitSuggestions: (projectId) =>
    request(`/projects/${projectId}/recruit-suggestions`),
}
