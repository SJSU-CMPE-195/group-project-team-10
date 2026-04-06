import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RoadmapProvider } from './context/RoadmapContext'

export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <RoadmapProvider>{ui}</RoadmapProvider>
    </MemoryRouter>
  )
}
