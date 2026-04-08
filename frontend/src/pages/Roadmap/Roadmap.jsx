import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRoadmap, useRoadmapDispatch } from '../../context/RoadmapContext'
import { validateSemesterPlan } from '../../utils/prerequisiteValidator'
import { courseMap } from '../../data/courses'
import prerequisites from '../../data/prerequisites'
import CourseNode from '../../components/CourseNode/CourseNode'
import ValidationAlert from '../../components/ValidationAlert/ValidationAlert'
import './Roadmap.css'

const NODE_TYPES = { course: CourseNode }

const COLUMN_WIDTH = 230
const ROW_HEIGHT = 130
const HEADER_HEIGHT = 50
const LEFT_PADDING = 40
const TOP_PADDING = 60

function buildNodesAndEdges(semesters) {
  const nodes = []
  const edges = []
  const coursePositions = new Map()

  for (let i = 0; i < semesters.length; i++) {
    const sem = semesters[i]
    const x = LEFT_PADDING + i * COLUMN_WIDTH

    nodes.push({
      id: `sem-${sem.semesterId}`,
      type: 'default',
      position: { x, y: 0 },
      data: { label: sem.term },
      style: {
        background: 'transparent',
        border: 'none',
        fontSize: '14px',
        fontWeight: 600,
        width: 180,
        textAlign: 'center',
        pointerEvents: 'none',
      },
      draggable: false,
      selectable: false,
      connectable: false,
    })

    for (let j = 0; j < sem.courses.length; j++) {
      const sc = sem.courses[j]
      const course = courseMap.get(sc.courseId)
      if (!course) continue

      const nodeId = `course-${sc.courseId}`
      coursePositions.set(sc.courseId, nodeId)

      nodes.push({
        id: nodeId,
        type: 'course',
        position: { x, y: HEADER_HEIGHT + TOP_PADDING + j * ROW_HEIGHT },
        data: {
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          units: course.units,
          status: sc.status,
        },
      })
    }
  }

  const statusById = new Map()
  for (const sem of semesters) {
    for (const c of sem.courses) {
      statusById.set(c.courseId, c.status)
    }
  }

  for (const prereq of prerequisites) {
    const sourceId = coursePositions.get(prereq.prereqCourseId)
    const targetId = coursePositions.get(prereq.courseId)
    if (!sourceId || !targetId) continue

    const satisfied = statusById.get(prereq.prereqCourseId) === "completed"
    const targetStatus = statusById.get(prereq.courseId)
    const isBlocked = targetStatus === "blocked" || targetStatus === "failed"

    let strokeColor = 'var(--edge-default)'
    if (isBlocked) strokeColor = 'var(--edge-violated)'
    else if (satisfied) strokeColor = 'var(--edge-satisfied)'

    edges.push({
      id: `edge-${prereq.prereqCourseId}-${prereq.courseId}`,
      source: sourceId,
      target: targetId,
      type: 'default',
      animated: isBlocked,
      style: { stroke: strokeColor, strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
        width: 16,
        height: 16,
      },
      label: prereq.prereqType === "coreq" ? "coreq" : undefined,
      labelStyle: { fontSize: 10, fill: 'var(--text)' },
    })
  }

  return { nodes, edges }
}

function Roadmap() {
  const state = useRoadmap()
  const dispatch = useRoadmapDispatch()
  const navigate = useNavigate()
  const [failCourseId, setFailCourseId] = useState("")

  const { semesters, hasUnsavedChanges } = state
  const violations = validateSemesterPlan(semesters, prerequisites)

  const { nodes, edges } = useMemo(() => buildNodesAndEdges(semesters), [semesters])

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const choice = window.confirm("You have unsaved changes. Press OK to discard, or Cancel to stay.")
      if (choice) {
        dispatch({ type: "DISCARD_CHANGES" })
        navigate("/")
      }
    } else {
      navigate("/")
    }
  }

  const handleSave = () => {
    dispatch({ type: "SAVE_CHANGES" })
  }

  const handleMarkFailed = () => {
    const id = parseInt(failCourseId)
    if (!id) return
    dispatch({ type: "MARK_COURSE_FAILED", courseId: id })
    setFailCourseId("")
  }

  const handleAddGap = () => {
    if (semesters.length === 0) return
    const lastId = semesters[semesters.length - 1].semesterId
    dispatch({ type: "ADD_GAP_SEMESTER", afterSemesterId: lastId })
  }

  const failableCourses = semesters
    .flatMap(s => s.courses)
    .filter(c => c.status === "completed" || c.status === "in_progress")
    .map(c => {
      const course = courseMap.get(c.courseId)
      return course ? { courseId: c.courseId, label: course.courseCode } : null
    })
    .filter(Boolean)

  return (
    <div className="roadmap-page">
      <div className="roadmap-toolbar">
        <button className="roadmap-back-btn" onClick={handleBack}>
          &larr; Back
        </button>

        <h2>Roadmap</h2>

        <div className="roadmap-toolbar-actions">
          <div className="roadmap-fail-group">
            <select
              value={failCourseId}
              onChange={e => setFailCourseId(e.target.value)}
              className="roadmap-select"
            >
              <option value="">Mark as Failed...</option>
              {failableCourses.map(c => (
                <option key={c.courseId} value={c.courseId}>{c.label}</option>
              ))}
            </select>
            <button
              onClick={handleMarkFailed}
              disabled={!failCourseId}
              className="roadmap-btn danger"
            >
              Fail
            </button>
          </div>

          <button onClick={handleAddGap} className="roadmap-btn">
            Add Gap Semester
          </button>

          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={`roadmap-btn primary ${hasUnsavedChanges ? '' : 'disabled'}`}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="roadmap-flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          fitView
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>

      {violations.length > 0 && (
        <div className="roadmap-validation">
          <ValidationAlert violations={violations} />
        </div>
      )}
    </div>
  )
}

export default Roadmap
