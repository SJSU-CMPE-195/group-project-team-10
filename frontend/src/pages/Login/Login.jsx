import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import "./Login.css";
import PasswordField from "../../components/Auth/PasswordField";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function validateLoginForm() {
    if (!email.trim()) {
      return "Email is required.";
    }

    if (!isValidEmail(email)) {
      return "Please enter a valid email address, like name@example.com.";
    }

    if (!password) {
      return "Password is required.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validationError = validateLoginForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Log in</h1>
        <p className="auth-subtitle">Access your SJSU course planner.</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label>
            Email
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <PasswordField
            value={password}
            showPassword={showPassword}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            onToggle={() => setShowPassword((current) => !current)}
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="auth-footer">
          No account yet? <Link to="/signup">Sign up</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;