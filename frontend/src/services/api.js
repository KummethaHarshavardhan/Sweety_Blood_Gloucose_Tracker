import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:7005').replace(/\/+$/, '');
const BASE_URL = `${API_URL}/api`;

// Backend error codes that mean "the access token is no longer usable, try refreshing it"
const REFRESHABLE_CODES = ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'AUTH_REQUIRED'];
// Auth endpoints must never trigger the refresh logic themselves
const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// The access token lives only in memory (never localStorage or sessionStorage)
let accessToken = null;
let sessionExpiredHandler = () => {};
let refreshInFlight = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

// Main client for every app request. withCredentials sends the HttpOnly refresh cookie.
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// Separate client for refresh, so a refresh failure cannot loop back through the interceptors
const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Single-flight refresh: when several requests expire together, they share one refresh call.
// The backend rotates the refresh token, so two parallel calls would look like token reuse.
export const refreshAccessToken = () => {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        return res.data.data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const path = original?.url || '';
    const skipRefresh = SKIP_REFRESH_PATHS.some((p) => path.startsWith(p));

    if (
      status === 401 &&
      original &&
      !original._retried &&
      !skipRefresh &&
      REFRESHABLE_CODES.includes(code)
    ) {
      original._retried = true; // retry at most once to prevent loops
      try {
        await refreshAccessToken();
        return api(original);
      } catch (refreshError) {
        setAccessToken(null);
        sessionExpiredHandler();
        throw refreshError;
      }
    }

    return Promise.reject(error);
  },
);

// Turns any Axios error into a message for the user
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error?.response) {
    return `Cannot reach the server at ${API_URL}. Make sure the backend is running.`;
  }
  return error.response.data?.message || fallback;
};
