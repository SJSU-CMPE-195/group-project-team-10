import { useEffect, useMemo, useState } from 'react'
import { fetchCatalogCourses, fetchCatalogTerms } from '../../api/catalog'
import CourseCard from '../../components/CourseCard/CourseCard'
import './Catalog.css'

function Catalog() {
  const [courses, setCourses] = useState([])
  const [availableTerms, setAvailableTerms] = useState([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeDept, setActiveDept] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadTerms() {
      try {
        const terms = await fetchCatalogTerms()
        if (cancelled) return
        setAvailableTerms(terms)
        setSelectedTerm(terms[0] || '')
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load catalog terms')
          setLoading(false)
        }
      }
    }

    loadTerms()
    return () => {
      cancelled = true
    }
  }, [])

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
        const nextCourses = await fetchCatalogCourses(selectedTerm)
        if (cancelled) return
        setCourses(nextCourses)
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
        >
          {availableTerms.length === 0 && <option value="">No imported terms</option>}
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

      {loading && <p className="catalog-count">Loading catalog from database...</p>}
      {error && <p className="catalog-count">{error}</p>}

      {!loading && !error && (
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
          />
        ))}
      </div>
    </div>
  )
}

export default Catalog
