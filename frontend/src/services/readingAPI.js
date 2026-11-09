import { api } from './api.js';

export const readingAPI = {
  // Returns an array of readings, newest date first
  list: ({ from, to } = {}) =>
    api
      .get('/readings', { params: { ...(from && { from }), ...(to && { to }) } })
      .then((res) => res.data.data.readings),

  get: (id) => api.get(`/readings/${id}`).then((res) => res.data.data.reading),

  create: (payload) => api.post('/readings', payload).then((res) => res.data.data.reading),

  update: (id, payload) => api.put(`/readings/${id}`, payload).then((res) => res.data.data.reading),

  remove: (id) => api.delete(`/readings/${id}`).then((res) => res.data),
};
