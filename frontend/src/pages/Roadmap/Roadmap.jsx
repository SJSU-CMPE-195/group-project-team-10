import {useEffect, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {ReactFlow, Background, Controls, MarkerType,applyEdgeChanges, applyNodeChanges} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {useRoadmap, useRoadmapDispatch} from '../../context/RoadmapContext'
import {validateSemesterPlan} from '../../utils/prerequisiteValidator'
import courses, {courseMap} from '../../data/courses'
import prerequisites from '../../data/prerequisites'
import CourseNode from '../../components/CourseNode/CourseNode'
import ValidationAlert from '../../components/ValidationAlert/ValidationAlert'
import './Roadmap.css'

function SemesterNode({ data }) {
  return (
    <div className="roadmap-semester-label">
      <div className="roadmap-semester-term">{data.label}</div>
      <div className="roadmap-semester-units">{data.units} units</div>
    </div>
  )
}

const NODE_TYPES = { course: CourseNode, semester: SemesterNode }

const SEMESTER_ROW_HEIGHT = 200
const COURSE_WIDTH = 200
const COURSE_CARD_HEIGHT = 96
const COURSE_Y_OFFSET = (SEMESTER_ROW_HEIGHT - COURSE_CARD_HEIGHT) / 2
const HEADER_WIDTH = 140
const LEFT_PADDING = 40
const TOP_PADDING = 40
const COURSE_GAP = 40

const getSemesterWidth = (sem) => {
  const courseCount = sem.courses.length
  return HEADER_WIDTH + LEFT_PADDING + courseCount * COURSE_WIDTH + (courseCount - 1) * COURSE_GAP + 40
}

const getSemesterFromY = (y, semesters) => {
  const index = Math.round((y - TOP_PADDING) / SEMESTER_ROW_HEIGHT)
  return semesters[index]
}

const getInsertIndexFromX = (x) => {
  const offsetX = x - (LEFT_PADDING + HEADER_WIDTH)
  return Math.max(0, Math.round(offsetX / (COURSE_WIDTH + COURSE_GAP)))
}

const snapToRow = (y) => {
  const index = Math.round((y - TOP_PADDING) / SEMESTER_ROW_HEIGHT)
  return TOP_PADDING + index * SEMESTER_ROW_HEIGHT + COURSE_Y_OFFSET
}

const snapToColumn = (x) => {
  const index = Math.max(
  0, Math.round((x - (LEFT_PADDING + HEADER_WIDTH)) / (COURSE_WIDTH + COURSE_GAP))
  )
  return LEFT_PADDING + HEADER_WIDTH + index * (COURSE_WIDTH + COURSE_GAP)
}

function buildNodesAndEdges(semesters, violations) {
  const nodes = []
  const edges = []
  const coursePositions = new Map()

  const violationMap = new Map()

  for (const v of violations) {
    if (!violationMap.has(v.missingPrereqId)) violationMap.set(v.missingPrereqId, [])
    violationMap.get(v.missingPrereqId).push(v.type)
  }

  for (let i = 0; i < semesters.length; i++) {
    const sem = semesters[i]
    const y = TOP_PADDING + i * SEMESTER_ROW_HEIGHT
    const totalUnits = sem.courses.reduce((sum, sc) => {
      const course = courseMap.get(sc.courseId)
      return sum + (course?.units ?? 0)
    }, 0)
    nodes.push({
      id: `sem-${sem.semesterId}`,
      type: 'semester',
      position: { x: 0, y },
      data: { label: sem.term, units: totalUnits },
      style: {
        width: getSemesterWidth(sem),
        height: SEMESTER_ROW_HEIGHT,
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
          x: LEFT_PADDING + HEADER_WIDTH + j * (COURSE_WIDTH + COURSE_GAP),
          y: TOP_PADDING + i * SEMESTER_ROW_HEIGHT + COURSE_Y_OFFSET,
        },
        data: {
          courseId: sc.courseId,
          semesterId: sem.semesterId,
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          units: course.units,
          status: sc.status,
          note: sc.note || "",
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
  const [showAddCourseModal, setShowAddCourseModal] = useState(false)
  const [addSemesterId, setAddSemesterId] = useState("")
  const [addCourseId, setAddCourseId] = useState("")
  const [addCourseStatus, setAddCourseStatus] = useState("planned")
  const [hoverSemesterIndex, setHoverSemesterIndex] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  const { semesters, hasUnsavedChanges } = state
  const violations = useMemo(
    () => validateSemesterPlan(semesters, prerequisites),
    [semesters]
  )

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])

  const decoratedNodes = nodes.map(n => {
    const isCourse = n.id.startsWith('course-')
    const isSelected = isCourse && n.id === selectedNodeId

    const semIndex = semesters.findIndex(
      s => `sem-${s.semesterId}` === n.id
    )

    const isSemesterHovered =
      hoverSemesterIndex === semIndex && n.id.startsWith('sem-')

    return {
      ...n,
      className: [
        isSemesterHovered ? 'semester-column-highlight' : '',
        isSelected ? 'course-node--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')
    }
  })

  const decoratedEdges = edges.map(e => {
  const isConnected =
    e.source === selectedNodeId ||
    e.target === selectedNodeId

    return {
      ...e,
      zIndex: isConnected ? 1000 : 0,
      style: {
        ...e.style,
        strokeWidth: isConnected ? 4 : 2,
        opacity: isConnected ? 1 : 0.3,
      },
    }
  })

  const onNodesChange = (changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }

  const onNodeClick = (_, node) => {
    setSelectedNodeId(prev => (prev === node.id ? null : node.id))
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

    const sem = getSemesterFromY(node.position.y, semesters)
    const index = semesters.findIndex(s => s === sem)
    setHoverSemesterIndex(index)
  }

  const onNodeDragStop = (_, node) => {
    if (!node.id.startsWith('course-')) return

    const courseId = parseInt(node.id.replace('course-', ''))
    const targetSemester = getSemesterFromY(node.position.y || 0, semesters)
    if (!targetSemester) return

    const rawIndex = getInsertIndexFromX(node.position.x || 0)
    const toIndex = Math.min(rawIndex, targetSemester.courses.length)

    if (!targetSemester) return

    const snappedY = snapToRow(node.position.y || 0)
    const snappedX = snapToColumn(node.position.x || 0)

    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id
        ? {
          ...n,
          position: {
            x: snappedX,
            y: snappedY,
          },
        }
      : n
      )
    )

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
          edges={decoratedEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedNodeId(null)}
          onEdgesChange={onEdgesChange}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeDragStart={() => setSelectedNodeId(null)}
          fitView
          nodesDraggable={true}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          selectionOnDrag={false}
          nodesSelectable={false}
          elementsSelectable={false}
          selectNodesOnDrag={false}
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
