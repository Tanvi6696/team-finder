import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api'

const StudentContext = createContext(null)

export function StudentProvider({ children }) {
  // Default student is id 1 (Ananya) per project rules
  const [studentId, setStudentId] = useState(1)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .getStudents()
      .then((rows) => {
        if (!cancelled) setStudents(rows)
      })
      .catch(() => {
        if (!cancelled) setStudents([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currentStudent = useMemo(
    () => students.find((s) => s.student_id === studentId) || null,
    [students, studentId],
  )

  const value = {
    studentId,
    setStudentId,
    students,
    currentStudent,
    loading,
  }

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}

export function useStudent() {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error('useStudent must be used inside StudentProvider')
  return ctx
}
