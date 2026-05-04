export async function fetchMajors() {
  const response = await fetch('/api/roadmaps/majors')
  if (!response.ok) {
    throw new Error(`Failed to load majors (${response.status})`)
  }
  return response.json()
}

export async function fetchRoadmapByMajor(majorId) {
  const response = await fetch(`/api/roadmaps/majors/${encodeURIComponent(majorId)}`)
  if (!response.ok) {
    throw new Error(`Failed to load roadmap (${response.status})`)
  }
  return response.json()
}
