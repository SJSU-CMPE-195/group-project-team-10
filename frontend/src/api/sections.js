export async function fetchSections(term) {
  const search = term ? `?term=${encodeURIComponent(term)}` : ''
  const response = await fetch(`/api/sections${search}`)

  if (!response.ok) {
    throw new Error(`Failed to load sections (${response.status})`)
  }

  return response.json()
}