import { useState } from 'react'
import { createPortal } from 'react-dom'
import './CourseNoteModal.css'

function CourseNoteModal({ courseCode, note = "", onSave, onClose }) {
  const [draftNote, setDraftNote] = useState(note)

  return createPortal(
    <div className="course-note-modal-backdrop" onClick={onClose}>
      <div className="course-note-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{courseCode} note</h3>

        <textarea
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          placeholder="Add note..."
          aria-label={`Note for ${courseCode}`}
        />

        <div className="course-note-modal-actions">
          <button
            type="button"
            className="course-note-modal-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="course-note-modal-btn course-note-modal-btn-primary"
            onClick={() => onSave(draftNote)}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default CourseNoteModal
