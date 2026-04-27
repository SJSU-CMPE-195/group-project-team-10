const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function getCsrfTokenFromCookie() {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Invalid email or password.");
  }

  if (!response.ok) {
    let message = "Request failed";

    try {
      const errorBody = await response.json();
      message = errorBody.message || errorBody.error || message;
    } catch {
      message = await response.text();
    }

    throw new Error(message || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getCsrfToken() {
  await fetch(`${API_BASE_URL}/api/auth/csrf`, {
    credentials: "include",
  });

  return getCsrfTokenFromCookie();
}

export async function getCurrentUser() {
  return request("/api/auth/me");
}

export async function loginUser({ email, password }) {
  const csrfToken = await getCsrfToken();

  return request("/api/auth/login", {
    method: "POST",
    headers: {
      "X-XSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser({ name, email, password }) {
  const csrfToken = await getCsrfToken();

  return request("/api/auth/register", {
    method: "POST",
    headers: {
      "X-XSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify({ fullName: name, email, password }),
  });
}

export async function logoutUser() {
  const csrfToken = await getCsrfToken();

  return request("/api/auth/logout", {
    method: "POST",
    headers: {
      "X-XSRF-TOKEN": csrfToken,
    },
  });
}