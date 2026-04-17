import { Handle, Position } from '@xyflow/react'
import { useRoadmapDispatch } from '../../context/RoadmapContext'
import './CourseNode.css'

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
        <span className={`course-node-status course-node-status--${status}`}>
          {status}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="course-handle" />
    </div>
  )
}

export default CourseNode