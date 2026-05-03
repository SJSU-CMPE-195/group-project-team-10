export async function fetchCatalogTerms() {
  const response = await fetch('/api/catalog/terms')
  if (!response.ok) {
    throw new Error(`Failed to load catalog terms (${response.status})`)
  }
  return response.json()
}

export async function fetchCatalogCourses(term) {
  const search = term ? `?term=${encodeURIComponent(term)}` : ''
  const response = await fetch(`/api/catalog/courses${search}`)
  if (!response.ok) {
    throw new Error(`Failed to load catalog courses (${response.status})`)
  }
  return response.json()
}
