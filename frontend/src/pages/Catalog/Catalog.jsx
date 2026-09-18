import { useEffect, useMemo, useState } from 'react'
import { fetchCatalogCourses } from '../../api/catalog'
import { fetchSections } from '../../api/sections'
import { useSchedule } from '../../context/useSchedule'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import CourseCard from '../../components/CourseCard/CourseCard'
import './Catalog.css'

const PAGE_SIZE = 25

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
  const [selectedDepts, setSelectedDepts] = useState([])
  const [deptSearch, setDeptSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [sections, setSections] = useState([])

  useEscapeKey(filtersOpen, () => {
    setFiltersOpen(false)
    setDeptSearch('')
  })

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

  const deptQuery = deptSearch.trim().toLowerCase()
  const visibleDepartments = deptQuery
    ? departments.filter(dept => dept.toLowerCase().includes(deptQuery))
    : departments

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    const deptFilter = new Set(selectedDepts)
    return courses.filter(c => {
      const matchesSearch = !query ||
        c.courseCode.toLowerCase().includes(query) ||
        c.courseTitle.toLowerCase().includes(query)
      const matchesDept = deptFilter.size === 0 || deptFilter.has(c.department)
      return matchesSearch && matchesDept
    })
  }, [courses, search, selectedDepts])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const visible = filtered.slice(start, start + PAGE_SIZE)

  function toggleDept(dept) {
    setSelectedDepts(current =>
      current.includes(dept)
        ? current.filter(d => d !== dept)
        : [...current, dept]
    )
    setPage(1)
  }

  function clearFilters() {
    setSelectedDepts([])
    setPage(1)
  }

  function toggleFilters() {
    setFiltersOpen(open => {
      // clears subject search state when reopening
      if (open) setDeptSearch('')
      return !open
    })
  }

  function countMessage() {
    if (filtered.length === 0) return 'No courses match your filters.'
    if (totalPages <= 1) return `Showing ${filtered.length} of ${filtered.length} courses`
    return `Showing ${start + 1}–${start + visible.length} of ${filtered.length} courses`
  }

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
          onChange={e => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <select
          className="catalog-search"
          value={selectedTerm}
          onChange={e => {
            setSelectedTerm(e.target.value)
            setPage(1)
          }}
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
        <div className="catalog-filter-bar">
          <button
            type="button"
            className="catalog-filters-toggle"
            aria-expanded={filtersOpen}
            onClick={toggleFilters}
          >
            Filters{selectedDepts.length > 0 ? ` (${selectedDepts.length})` : ''}
          </button>

          {selectedDepts.length === 0 ? (
            // resting state marker, not a control - there is nothing to clear yet
            <span className="catalog-filter-chip catalog-filter-chip-static active">
              All
            </span>
          ) : (
            selectedDepts.map(dept => (
              <button
                key={dept}
                type="button"
                className="catalog-filter-chip active"
                onClick={() => toggleDept(dept)}
                aria-label={`Remove ${dept} filter`}
              >
                {dept} &times;
              </button>
            ))
          )}

          {selectedDepts.length > 0 && (
            <button
              type="button"
              className="catalog-clear-filters"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="catalog-filter-panel">
            <input
              type="text"
              className="catalog-subject-search"
              placeholder="Search subjects..."
              value={deptSearch}
              onChange={e => setDeptSearch(e.target.value)}
              aria-label="Search subjects"
            />
            {visibleDepartments.length === 0 ? (
              <p className="catalog-subject-empty">No subjects match "{deptSearch.trim()}".</p>
            ) : (
              <div className="catalog-filters">
                {visibleDepartments.map(dept => (
                  <button
                    key={dept}
                    type="button"
                    className={`catalog-filter-chip ${selectedDepts.includes(dept) ? 'active' : ''}`}
                    aria-pressed={selectedDepts.includes(dept)}
                    onClick={() => toggleDept(dept)}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
        {countMessage()}
      </p>
      )}

      <div className="catalog-grid">
        {visible.map(course => (
          <CourseCard
            key={course.courseId}
            course={course}
            prereqs={[]}
            sections={sectionsByCourseCode[course.courseCode] || []}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="catalog-pagination">
          <button
            type="button"
            className="catalog-page-button"
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 1}
          >
            &lsaquo; Prev
          </button>
          <span className="catalog-page-status">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="catalog-page-button"
            onClick={() => setPage(safePage + 1)}
            disabled={safePage === totalPages}
          >
            Next &rsaquo;
          </button>
        </div>
      )}
    </div>
  )
}

export default Catalog
