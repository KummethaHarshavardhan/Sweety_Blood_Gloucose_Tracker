import { api, refreshAccessToken } from './api.js';

// Each function returns the backend "data" object: { user } or { accessToken, user }
export const authAPI = {
  register: (payload) => api.post('/auth/register', payload).then((res) => res.data.data),
  login: (payload) => api.post('/auth/login', payload).then((res) => res.data.data),
  refresh: () => refreshAccessToken(),
  logout: () => api.post('/auth/logout').then((res) => res.data),
  me: () => api.get('/auth/me').then((res) => res.data.data),
};
