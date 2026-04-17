import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRoadmap, useRoadmapDispatch } from '../../context/RoadmapContext'
import { validateSemesterPlan } from '../../utils/prerequisiteValidator'
import courses, { courseMap } from '../../data/courses'
import prerequisites from '../../data/prerequisites'
import CourseNode from '../../components/CourseNode/CourseNode'
import ValidationAlert from '../../components/ValidationAlert/ValidationAlert'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import './Roadmap.css'

const NODE_TYPES = { course: CourseNode }

const COLUMN_WIDTH = 230
const ROW_HEIGHT = 130
const HEADER_HEIGHT = 50
const LEFT_PADDING = 40
const TOP_PADDING = 60

const getSemesterHeight = (sem) => {
  const courseCount = sem.courses.length
  return HEADER_HEIGHT + TOP_PADDING + courseCount * ROW_HEIGHT + 40
}

const getSemesterFromX = (x, semesters) => {
  const index = Math.round((x - LEFT_PADDING) / COLUMN_WIDTH)
  return semesters[index]
}

const getInsertIndexFromY = (y) => {
  const offsetY = y - (HEADER_HEIGHT + TOP_PADDING)
  return Math.max(0, Math.round(offsetY / ROW_HEIGHT))
}

const snapToColumn = (x) => {
  const index = Math.round((x - LEFT_PADDING) / COLUMN_WIDTH)
  return LEFT_PADDING + index * COLUMN_WIDTH
}

function buildNodesAndEdges(semesters, violations) {
  const nodes = []
  const edges = []
  const coursePositions = new Map()

  const violationMap = new Map()

  for (const v of violations) {
    if (!violationMap.has(v.courseId)) violationMap.set(v.courseId, [])
    violationMap.get(v.courseId).push(v.type)
  }

  for (let i = 0; i < semesters.length; i++) {
    const sem = semesters[i]
    const x = LEFT_PADDING + i * COLUMN_WIDTH
    nodes.push({
      id: `sem-${sem.semesterId}`,
      type: 'default',
      position: { x, y: 0 },
      data: { label: sem.term },
      style: {
        width: COLUMN_WIDTH,
        height: getSemesterHeight(sem),

        background: 'transparent',
        border: 'none',

        fontSize: '14px',
        fontWeight: 600,
        textAlign: 'center',
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

      const issueTypes = violationMap.get(sc.courseId) || []

      nodes.push({
        id: nodeId,
        type: 'course',
        position: {
          x: LEFT_PADDING + i * COLUMN_WIDTH,
          y: HEADER_HEIGHT + TOP_PADDING + j * ROW_HEIGHT
        },
        data: {
          courseId: sc.courseId,
          semesterId: sem.semesterId,
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          units: course.units,
          status: sc.status,
          hasIssue: issueTypes.length > 0,
          issueTypes,
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
  const [showAddCourseModal, setShowAddCourseModal] = useState(false)
  const [addSemesterId, setAddSemesterId] = useState("")
  const [addCourseId, setAddCourseId] = useState("")
  const [addCourseStatus, setAddCourseStatus] = useState("planned")
  const [hoverSemesterIndex, setHoverSemesterIndex] = useState(null)

  const { semesters, hasUnsavedChanges } = state
  const violations = useMemo(
    () => validateSemesterPlan(semesters, prerequisites),
    [semesters]
  )

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])

  const decoratedNodes = nodes.map(n => {
    if (!n.id.startsWith('sem-')) return n

    const semIndex = semesters.findIndex(s => `sem-${s.semesterId}` === n.id)

    return {
      ...n,
      className: hoverSemesterIndex === semIndex ? 'semester-column-highlight' : ''
    }
  })

  const onNodesChange = (changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildNodesAndEdges(semesters, violations)
    setNodes(newNodes)
    setEdges(newEdges)
  }, [semesters, violations])
  /* eslint-enable react-hooks/set-state-in-effect */

  const onEdgesChange = (changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
  }

  const onNodeDrag = (_, node) => {
    if (!node.id.startsWith('course-')) return

    const sem = getSemesterFromX(node.position.x, semesters)
    const index = semesters.findIndex(s => s === sem)
    setHoverSemesterIndex(index)
  }

  const onNodeDragStop = (_, node) => {
    if (!node.id.startsWith('course-')) return
    
    const courseId = parseInt(node.id.replace('course-', ''))
    const targetSemester = getSemesterFromX(node.position.x || 0, semesters)
    const toIndex = getInsertIndexFromY(node.position.y || 0)

    if (!targetSemester) return

    const snappedX = snapToColumn(node.position.x || 0)
    node.position.x = snappedX
    
    dispatch({
      type: 'MOVE_COURSE',
      courseId,
      toSemesterId: targetSemester.semesterId,
      toIndex
    })

    setHoverSemesterIndex(null)
  }
  
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

  const openAddCourseModal = () => {
    setShowAddCourseModal(true)
  }

  const closeAddCourseModal = () => {
    setShowAddCourseModal(false)
    setAddSemesterId("")
    setAddCourseId("")
    setAddCourseStatus("planned")
  }

  const handleDiscardChanges = () => {
    dispatch({ type: "DISCARD_CHANGES" })
  }

  const handleAddCourse = () => {
    const semesterId = parseInt(addSemesterId)
    const courseId = parseInt(addCourseId)
    if (!semesterId || !courseId) return

    dispatch({
      type: "ADD_COURSE_TO_SEMESTER",
      semesterId,
      courseId,
      status: addCourseStatus,
    })

    closeAddCourseModal()
  }

  const failableCourses = semesters
    .flatMap(s => s.courses)
    .filter(c => c.status === "completed" || c.status === "in_progress")
    .map(c => {
      const course = courseMap.get(c.courseId)
      return course ? { courseId: c.courseId, label: course.courseCode } : null
    })
    .filter(Boolean)
  const existingCourseIds = new Set(
    semesters.flatMap(s => s.courses.map(c => c.courseId))
  )

  const addableCourses = courses.filter(course => !existingCourseIds.has(course.courseId))

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

          <button onClick={openAddCourseModal} className="roadmap-btn">
            Add Course
          </button>

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

          <button
            onClick={handleDiscardChanges}
            disabled={!hasUnsavedChanges}
            className="roadmap-btn"
          >
            Cancel Changes
          </button>
        </div>
      </div>

      {showAddCourseModal && (
        <div className="roadmap-modal-backdrop" onClick={closeAddCourseModal}>
          <div className="roadmap-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Course</h3>

            <div className="roadmap-modal-field">
              <label>Semester</label>
              <select
                value={addSemesterId}
                onChange={e => setAddSemesterId(e.target.value)}
                className="roadmap-select"
              >
                <option value="">Select semester...</option>
                {semesters.map(sem => (
                  <option key={sem.semesterId} value={sem.semesterId}>
                    {sem.term}
                  </option>
                ))}
              </select>
            </div>

            <div className="roadmap-modal-field">
              <label>Course</label>
              <select
                value={addCourseId}
                onChange={e => setAddCourseId(e.target.value)}
                className="roadmap-select"
              >
                <option value="">Select course...</option>
                {addableCourses.map(course => (
                  <option key={course.courseId} value={course.courseId}>
                    {course.courseCode} — {course.courseTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="roadmap-modal-field">
              <label>Status</label>
              <select
                value={addCourseStatus}
                onChange={e => setAddCourseStatus(e.target.value)}
                className="roadmap-select"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="roadmap-modal-actions">
              <button onClick={closeAddCourseModal} className="roadmap-btn">
                Cancel
              </button>
              <button
                onClick={handleAddCourse}
                disabled={!addSemesterId || !addCourseId}
                className="roadmap-btn primary"
              >
                Add Course
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="roadmap-flow-container">
        <ReactFlow
          nodes={decoratedNodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDrag={onNodeDrag}
          onNodeDragStop = {onNodeDragStop}
          fitView
          nodesDraggable={true}
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
