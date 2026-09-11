import { useEffect, useMemo, useState } from 'react'
import { fetchCatalogCourses } from '../../api/catalog'
import { fetchSections } from '../../api/sections'
import { useSchedule } from '../../context/useSchedule'
import CourseCard from '../../components/CourseCard/CourseCard'
import './Catalog.css'

function Catalog() {
  // sharing term with schedule page so its only chosen once
  const {
    activeTerm: selectedTerm,
    setActiveTerm: setSelectedTerm,
    availableTerms,
    termsLoaded,
  } = useSchedule()

  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeDept, setActiveDept] = useState(null)
  const [sections, setSections] = useState([])

  useEffect(() => {
    if (!selectedTerm) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadCourses() {
      setLoading(true)
      setError('')

      try {
        const [nextCourses, nextSections] = await Promise.all([
          fetchCatalogCourses(selectedTerm),
          fetchSections(selectedTerm),
        ])
        if (cancelled) return
        setCourses(nextCourses)
        setSections(nextSections)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load catalog courses')
          setCourses([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadCourses()
    return () => {
      cancelled = true
    }
  }, [selectedTerm])

  const departments = useMemo(
    () => [...new Set(courses.map(c => c.department))].sort(),
    [courses]
  )

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return courses.filter(c => {
      const matchesSearch = !query ||
        c.courseCode.toLowerCase().includes(query) ||
        c.courseTitle.toLowerCase().includes(query)
      const matchesDept = !activeDept || c.department === activeDept
      return matchesSearch && matchesDept
    })
  }, [courses, search, activeDept])

  const sectionsByCourseCode = useMemo(() => {
    return sections.reduce((map, section) => {
      const key = section.courseCode
      if (!map[key]) map[key] = []
      map[key].push(section)
      return map
    }, {})
  }, [sections])

  return (
    <div className="catalog-page">
      <h2>Course Catalog</h2>

      <div className="catalog-controls">
        <input
          type="text"
          className="catalog-search"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="catalog-search"
          value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)}
          disabled={availableTerms.length === 0}
          aria-label="Semester"
        >
          {availableTerms.length === 0 ? (
            <option value="">No imported terms</option>
          ) : (
            <option value="">Select a semester...</option>
          )}
          {availableTerms.map(term => (
            <option key={term} value={term}>
              {term}
            </option>
          ))}
        </select>
        <div className="catalog-filters">
          <button
            className={`catalog-filter-chip ${activeDept === null ? 'active' : ''}`}
            onClick={() => setActiveDept(null)}
          >
            All
          </button>
          {departments.map(dept => (
            <button
              key={dept}
              className={`catalog-filter-chip ${activeDept === dept ? 'active' : ''}`}
              onClick={() => setActiveDept(activeDept === dept ? null : dept)}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {!selectedTerm && termsLoaded && (
        <p className="catalog-prompt">
          {availableTerms.length === 0
            ? 'No terms have been imported yet.'
            : 'Choose a semester to browse courses.'}
        </p>
      )}

      {loading && <p className="catalog-count">Loading catalog from database...</p>}
      {error && <p className="catalog-count">{error}</p>}

      {selectedTerm && !loading && !error && (
      <p className="catalog-count">
        Showing {filtered.length} of {courses.length} courses
      </p>
      )}

      <div className="catalog-grid">
        {filtered.map(course => (
          <CourseCard
            key={course.courseId}
            course={course}
            prereqs={[]}
            sections={sectionsByCourseCode[course.courseCode] || []}
          />
        ))}
      </div>
    </div>
  )
}

export default Catalog
