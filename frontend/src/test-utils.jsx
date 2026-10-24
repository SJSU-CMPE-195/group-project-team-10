import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { RoadmapProvider } from './context/RoadmapContext'
import { ScheduleProvider } from './context/ScheduleContext'
import sampleRoadmap from './data/sampleRoadmap'
import prerequisites from './data/prerequisites'
import courses from './data/courses'
import degreeRequirements, { majorInfo } from './data/degreeRequirements'

export function buildTestRoadmapState() {
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

export function renderWithProviders(
  ui,
  { route = '/', roadmapState = buildTestRoadmapState(), variant = 'warning' } = {}
) {
  // data router to match main.jsx, so useBlocker works in tests
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <RoadmapProvider initialState={roadmapState} disableAutoLoad variant={variant}>
            <ScheduleProvider>
              {ui}
            </ScheduleProvider>
          </RoadmapProvider>
        ),
      },
    ],
    { initialEntries: [route] }
  )

  return { ...render(<RouterProvider router={router} />), router }
}
