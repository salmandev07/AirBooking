import axios from "axios";

// One axios instance for the whole app. It automatically attaches the
// JWT access token and refreshes it once if the token has expired.
const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // 401 usually means "your access token expired" - try a refresh once.
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;

      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          // Refresh calls must NOT go through this interceptor again.
          const { data } = await axios.post("/api/auth/token/refresh/", { refresh });
          localStorage.setItem("access_token", data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch (refreshError) {
          // Refresh token is dead too - send the user back to login.
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

// Pull the message the backend sent, falling back to something generic.
export function errorMessage(error) {
  if (!error) return "Something went wrong.";
  const data = error.response?.data;

  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;

  if (data) {
    // Validation errors look like {"seats": ["..."]}
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return first[0];
    if (typeof first === "string") return first;
  }

  if (error.message === "Network Error") {
    return "Cannot reach the server. Is the backend running?";
  }
  return error.message || "Something went wrong.";
}

export default api;
