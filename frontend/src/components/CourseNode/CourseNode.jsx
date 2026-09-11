import { Handle, Position } from '@xyflow/react'
import { useRoadmapDispatch } from '../../context/RoadmapContext'
import { useState } from 'react'
import CourseNoteModal from './CourseNoteModal'
import './CourseNode.css'

const STATUS_OPTIONS = [
  { value: "planned", label: "planned" },
  { value: "in_progress", label: "in progress" },
  { value: "completed", label: "completed" },
  { value: "failed", label: "failed" },
]

function CourseNode({ data, selected }) {
  const dispatch = useRoadmapDispatch()
  const {
    courseId,
    semesterId,
    courseCode,
    courseTitle,
    units,
    status,
    note = "",
    hasIssue,
    issueTypes = [],
    requirementNames = [],
  } = data
  const [showNoteModal, setShowNoteModal] = useState(false)

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

  const openNoteModal = (e) => {
      e.stopPropagation()
      setShowNoteModal(true)
  }

  const handleSaveNote = (nextNote) => {
      dispatch({
        type: "SET_COURSE_NOTE",
        semesterId,
        courseId,
        note: nextNote,
      })
      setShowNoteModal(false)
  }

  const showWarning = hasIssue && status !== 'failed' && status !== 'blocked'

  return (
      <div className={`course-node course-node--${status}${showWarning ? ' course-node--warning' : ''} ${selected ? 'course-node--selected' : ''}`}>      <Handle type="target" position={Position.Top} className="course-handle" />

      <button className="course-node-remove nodrag" onClick={handleRemove} title="Remove course">
        ×
      </button>

      {hasIssue && (
        <div className="course-node-warning" title={issueTypes.join(', ')}>
          {issueTypes.includes('coreq') ? 'COREQ' : 'PREREQ'}
        </div>
      )}

      <div className="course-node-header">
        <div className="course-node-code">{courseCode}</div>

        <button
          type="button"
          className="course-node-note-btn nodrag"
          onClick={openNoteModal}
          title="Edit note"
        >
          📝
        </button>
      </div>
      <div className="course-node-title">{courseTitle}</div>

      {requirementNames.length > 0 && (
        <div className="course-node-requirements">
          {requirementNames.slice(0, 2).map(name => (
            <span key={name}>{name}</span>
          ))}
        </div>
      )}

      {note && (
          <div className="course-node-note-row">
              <button
                 type="button"
                 className="course-node-note-preview nodrag"
                 onClick={openNoteModal}
                 title={note}
              >
                 {note}
              </button>
              <button
                  type="button"
                  className="course-node-more-btn nodrag"
                  onClick={openNoteModal}
              >
                  More
              </button>
          </div>
      )}

      <div className="course-node-footer">
        <span className="course-node-units">{units} units</span>
        <select
          className={`course-node-status course-node-status--${status} nodrag`}
          value={status}
          onChange={handleStatusChange}
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

      {showNoteModal && (
        <CourseNoteModal
          courseCode={courseCode}
          note={note}
          onSave={handleSaveNote}
          onClose={() => setShowNoteModal(false)}
        />
      )}

      <Handle type="source" position={Position.Bottom} className="course-handle" />
    </div>
  )
}

export default CourseNode
