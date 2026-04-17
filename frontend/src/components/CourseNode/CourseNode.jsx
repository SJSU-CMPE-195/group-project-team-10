import { Handle, Position } from '@xyflow/react'
import { useRoadmapDispatch } from '../../context/RoadmapContext'
import './CourseNode.css'

const STATUS_OPTIONS = [
  { value: "planned", label: "planned" },
  { value: "in_progress", label: "in progress" },
  { value: "completed", label: "completed" },
  { value: "failed", label: "failed" },
]

function CourseNode({ data }) {
  const dispatch = useRoadmapDispatch()
  const { courseId, semesterId, courseCode, courseTitle, units, status } = data

  const handleRemove = (e) => {
    e.stopPropagation()
    dispatch({
      type: "REMOVE_COURSE_FROM_SEMESTER",
      semesterId,
      courseId,
    })
  }

  const handleStatusChange = (e) => {
    dispatch({
      type: "SET_COURSE_STATUS",
      courseId,
      status: e.target.value,
    })
  }

  return (
    <div className={`course-node course-node--${status}`}>
      <Handle type="target" position={Position.Top} className="course-handle" />

      <button className="course-node-remove" onClick={handleRemove} title="Remove course">
        ×
      </button>

      <div className="course-node-code">{courseCode}</div>
      <div className="course-node-title">{courseTitle}</div>

      <div className="course-node-footer">
        <span className="course-node-units">{units} units</span>
        <select
          className={`course-node-status course-node-status--${status}`}
          value={status}
          onChange={handleStatusChange}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          aria-label="Course status"
        >
          {status === "blocked" && (
            <option value="blocked" disabled>blocked</option>
          )}
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <Handle type="source" position={Position.Bottom} className="course-handle" />
    </div>
  )
}

export default CourseNode