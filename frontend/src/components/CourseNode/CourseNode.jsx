import { Handle, Position } from '@xyflow/react'
import './CourseNode.css'

function CourseNode({ data }) {
  const { courseCode, courseTitle, units, status } = data

  return (
    <div className={`course-node course-node--${status}`}>
      <Handle type="target" position={Position.Left} className="course-handle" />
      <div className="course-node-code">{courseCode}</div>
      <div className="course-node-title">{courseTitle}</div>
      <div className="course-node-footer">
        <span className="course-node-units">{units} units</span>
        <span className={`course-node-status course-node-status--${status}`}>{status}</span>
      </div>
      <Handle type="source" position={Position.Right} className="course-handle" />
    </div>
  )
}

export default CourseNode
