import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Profile.css";

function Profile() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <section className="profile-page">
        <div className="profile-card">
          <p>Loading profile...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="profile-page">
        <div className="profile-card">
          <h1>Profile</h1>
          <p className="profile-muted">
            Log in to view your profile and saved planner details.
          </p>
          <Link to="/login" className="profile-login-link">
            Log in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {(user.fullName || user.name || user.email || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <h1>{user.fullName || user.name || "Student Profile"}</h1>
            <p className="profile-muted">{user.email}</p>
          </div>
        </div>

        <div className="profile-details">
          <div className="profile-row">
            <span>Name</span>
            <strong>{user.fullName || user.name || "Not set"}</strong>
          </div>

          <div className="profile-row">
            <span>Email</span>
            <strong>{user.email || "Not set"}</strong>
          </div>

          <div className="profile-row">
            <span>Major</span>
            <strong>{user.major || "Not set yet"}</strong>
          </div>

          <div className="profile-row">
            <span>Expected graduation</span>
            <strong>{user.expectedGraduationDate || "Not set yet"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Profile;