export async function fetchActiveAnnouncements() {
  const response = await fetch('/api/announcements/active')

  if (!response.ok) {
    throw new Error(`Failed to load announcements (${response.status})`)
  }

  return response.json()
}
