const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function getCsrfTokenFromCookie() {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

// authErrorMessage replaces server's 401/403 when Spring Security sends nothing useful
async function request(path, { authErrorMessage, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (authErrorMessage && (response.status === 401 || response.status === 403)) {
      throw new Error(authErrorMessage);
    }

    // read the body once, it can be JSON ({ message }), plain text, or empty
    const text = await response.text();
    let message = text;
    try {
      const errorBody = JSON.parse(text);
      message = errorBody.message || errorBody.error;
    } catch {
      // not JSON, keep the raw text
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

// state changing calls send XSRF-TOKEN cookie back in header, fetch only if it isn't set
async function requestWithCsrf(path, options = {}) {
  const csrfToken = getCsrfTokenFromCookie() ?? (await getCsrfToken());

  return request(path, {
    ...options,
    headers: {
      "X-XSRF-TOKEN": csrfToken,
      ...options.headers,
    },
  });
}

export async function getCurrentUser() {
  return request("/api/auth/me");
}

export async function loginUser({ email, password }) {
  return requestWithCsrf("/api/auth/login", {
    method: "POST",
    authErrorMessage: "Invalid email or password.",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser({ name, email, password }) {
  return requestWithCsrf("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName: name, email, password }),
  });
}

export async function logoutUser() {
  return requestWithCsrf("/api/auth/logout", { method: "POST" });
}

function adminRequest(path, options = {}) {
  const send = options.method ? requestWithCsrf : request;
  return send(`/api/admin/announcements${path}`, {
    ...options,
    authErrorMessage: "You do not have admin access. Try logging out and back in.",
  });
}

export async function fetchAllAnnouncements() {
  return adminRequest("");
}

export async function createAnnouncement({ title, message, severity, expiresAt }) {
  return adminRequest("", {
    method: "POST",
    body: JSON.stringify({ title, message, severity, expiresAt }),
  });
}

export async function deactivateAnnouncement(id) {
  return adminRequest(`/${id}/deactivate`, { method: "POST" });
}

export async function deleteAnnouncement(id) {
  return adminRequest(`/${id}`, { method: "DELETE" });
}
