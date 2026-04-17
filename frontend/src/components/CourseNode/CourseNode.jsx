import { Handle, Position } from '@xyflow/react'
import { useRoadmapDispatch } from '../../context/RoadmapContext'
import { useState } from 'react'
import './CourseNode.css'

const STATUS_OPTIONS = [
  { value: "planned", label: "planned" },
  { value: "in_progress", label: "in progress" },
  { value: "completed", label: "completed" },
  { value: "failed", label: "failed" },
]

function CourseNode({ data }) {
  const dispatch = useRoadmapDispatch()
  const { courseId, semesterId, courseCode, courseTitle, units, status, note = "", hasIssue, issueTypes = [], } = data
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [draftNote, setDraftNote] = useState(note)

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

  const handleSaveNote = (e) => {
      e.stopPropagation()
      dispatch({
        type: "SET_COURSE_NOTE",
        semesterId,
        courseId,
        note: draftNote,
      })
      setIsEditingNote(false)
    }

  const handleCancelNote = (e) => {
      e.stopPropagation()
      setDraftNote(note)
      setIsEditingNote(false)
  }

  return (
    <div className={`course-node course-node--${status}`}>
      <Handle type="target" position={Position.Top} className="course-handle" />

      <button className="course-node-remove" onClick={handleRemove} title="Remove course">
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
          className="course-node-note-btn"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditingNote(v => !v)
          }}
          title="Edit note"
        >
          📝
        </button>
      </div>
      <div className="course-node-title">{courseTitle}</div>

      {note && !isEditingNote && (
          <div className="course-node-note-preview">{note}</div>
      )}

      {isEditingNote && (
          <div
            className="course-node-note-editor"
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Add note..."
            />
            <div className="course-node-note-actions">
                <button type="button" onClick={handleSaveNote}>Save</button>
                <button type="button" onClick={handleCancelNote}>Cancel</button>
            </div>
         </div>
      )}

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