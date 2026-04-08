import { useState, useMemo } from 'react'
import courses from '../../data/courses'
import { prereqMap } from '../../data/prerequisites'
import CourseCard from '../../components/CourseCard/CourseCard'
import './Catalog.css'

const departments = [...new Set(courses.map(c => c.department))].sort()

function Catalog() {
  const [search, setSearch] = useState('')
  const [activeDept, setActiveDept] = useState(null)

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return courses.filter(c => {
      const matchesSearch = !query ||
        c.courseCode.toLowerCase().includes(query) ||
        c.courseTitle.toLowerCase().includes(query)
      const matchesDept = !activeDept || c.department === activeDept
      return matchesSearch && matchesDept
    })
  }, [search, activeDept])

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

      <p className="catalog-count">
        Showing {filtered.length} of {courses.length} courses
      </p>

      <div className="catalog-grid">
        {filtered.map(course => (
          <CourseCard
            key={course.courseId}
            course={course}
            prereqs={prereqMap.get(course.courseId) || []}
          />
        ))}
      </div>
    </div>
  )
}

export default Catalog
