import { createPortal } from 'react-dom'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import './LeaveConfirmModal.css'

// dialog for a blocked navigation from useLeaveGuard. renders only while the
// blocker is blocked; Stay, Escape and the backdrop all reset it. `actions` are
// the page's own leave options, each expected to call blocker.proceed()
function LeaveConfirmModal({ blocker, title, message, actions }) {
  const blocked = blocker.state === 'blocked'
  useEscapeKey(blocked, () => blocker.reset())

  if (!blocked) return null

  const allActions = [{ label: 'Stay', onClick: () => blocker.reset() }, ...actions]

  return createPortal(
    <div className="leave-modal-backdrop" onClick={() => blocker.reset()}>
      <section
        className="leave-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="leave-modal-title">{title}</h2>
        <div className="leave-modal-message">{message}</div>

        <div className="leave-modal-actions">
          {allActions.map(action => (
            <button
              key={action.label}
              type="button"
              className={`leave-modal-btn ${action.variant === 'primary' ? 'primary' : ''}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>,
    document.body
  )
}

export default LeaveConfirmModal
