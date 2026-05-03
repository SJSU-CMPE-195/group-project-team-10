function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
      <path d="M6.2 6.2A17.3 17.3 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4-.8" />
    </svg>
  )
}

function PasswordField({
  value,
  onChange,
  showPassword,
  onToggle,
  autoComplete = "current-password",
}) {
  return (
    <label>
      Password
      <div className="password-field">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={onChange}
          required
        />

        <button
          type="button"
          className="password-toggle"
          onClick={onToggle}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  )
}

export default PasswordField