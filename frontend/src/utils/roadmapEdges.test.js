import { describe, it, expect } from 'vitest'
import { getConnectedNodeIds, getVisibleEdges } from './roadmapEdges'

// course-1 -> course-2 -> course-3, plus an unrelated course-4 -> course-5 coreq
const edges = [
  { id: 'e12', source: 'course-1', target: 'course-2', style: { stroke: 'red', strokeWidth: 2 } },
  { id: 'e23', source: 'course-2', target: 'course-3', style: { stroke: 'red', strokeWidth: 2 } },
  { id: 'e45', source: 'course-4', target: 'course-5', label: 'coreq', style: { stroke: 'red', strokeWidth: 2 } },
]

describe('getVisibleEdges', () => {
  it('shows every arrow when nothing is selected and arrows are on', () => {
    expect(getVisibleEdges(edges, null, true)).toBe(edges)
  })

  it('shows no arrows when nothing is selected and arrows are off', () => {
    expect(getVisibleEdges(edges, null, false)).toEqual([])
  })

  it('bolds the selected course arrows and fades the rest when arrows are on', () => {
    const visible = getVisibleEdges(edges, 'course-2', true)
    const byId = Object.fromEntries(visible.map(e => [e.id, e]))

    expect(visible).toHaveLength(3)
    expect(byId.e12.style).toEqual({ stroke: 'red', strokeWidth: 3 })
    expect(byId.e23.style).toEqual({ stroke: 'red', strokeWidth: 3 })
    expect(byId.e45.style.opacity).toBe(0.15)
    expect(byId.e45.label).toBeUndefined()
  })

  it('shows only the selected course arrows when arrows are off', () => {
    const visible = getVisibleEdges(edges, 'course-5', false)
    expect(visible.map(e => e.id)).toEqual(['e45'])
    expect(visible[0].label).toBe('coreq')
  })
})

describe('getConnectedNodeIds', () => {
  it('returns the selected course and its direct prerequisites and dependents', () => {
    expect([...getConnectedNodeIds(edges, 'course-2')].sort()).toEqual(['course-1', 'course-2', 'course-3'])
  })

  it('returns nothing when no course is selected', () => {
    expect(getConnectedNodeIds(edges, null).size).toBe(0)
  })
})
