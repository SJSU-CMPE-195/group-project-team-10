import { requestWithCsrf } from '../lib/authApi'

export async function fetchMajors() {
  const response = await fetch('/api/roadmaps/majors')
  if (!response.ok) {
    throw new Error(`Failed to load majors (${response.status})`)
  }
  return response.json()
}

export async function fetchAccountRoadmap() {
  const response = await fetch('/api/roadmaps/me', { credentials: 'include' })
  if (response.status === 404) return null
  if (!response.ok) {
    const error = new Error(`Failed to load saved roadmap (${response.status})`)
    error.status = response.status
    throw error
  }
  return response.json()
}

export async function saveAccountRoadmap(roadmap) {
  return requestWithCsrf('/api/roadmaps/me', {
    method: 'PUT',
    body: JSON.stringify(roadmap),
    authErrorMessage: 'Sign in again to save your roadmap to your account.',
  })
}

export async function fetchRoadmapByMajor(majorId) {
  const response = await fetch(`/api/roadmaps/majors/${encodeURIComponent(majorId)}`)
  if (!response.ok) {
    throw new Error(`Failed to load roadmap (${response.status})`)
  }
  return response.json()
}
