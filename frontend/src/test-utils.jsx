import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RoadmapProvider } from './context/RoadmapContext'
import sampleRoadmap from './data/sampleRoadmap'
import prerequisites from './data/prerequisites'
import courses from './data/courses'
import degreeRequirements, { majorInfo } from './data/degreeRequirements'

function buildTestRoadmapState() {
  return {
    ...structuredClone(sampleRoadmap),
    majors: [structuredClone(majorInfo)],
    majorInfo: structuredClone(majorInfo),
    courses: structuredClone(courses),
    prerequisites: structuredClone(prerequisites),
    degreeRequirements: structuredClone(degreeRequirements),
    isLoadingRoadmap: false,
    roadmapError: "",
    savedState: structuredClone(sampleRoadmap),
    hasUnsavedChanges: false,
  }
}

export function renderWithProviders(ui, { route = '/', roadmapState = buildTestRoadmapState() } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <RoadmapProvider initialState={roadmapState} disableAutoLoad>{ui}</RoadmapProvider>
    </MemoryRouter>
  )
}
