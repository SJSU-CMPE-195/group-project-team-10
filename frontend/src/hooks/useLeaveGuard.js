import { useBlocker } from 'react-router-dom'

// blocks navigation while `when` is true, paired with returned
// blocker with LeaveConfirmModal. requires data router set up in main.jsx
export function useLeaveGuard(when) {
  return useBlocker(({ currentLocation, nextLocation }) =>
    when && currentLocation.pathname !== nextLocation.pathname
  )
}
