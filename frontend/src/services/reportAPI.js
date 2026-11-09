import { api } from './api.js';

// Each function returns the report object from the backend "data" field
export const reportAPI = {
  daily: (date) => api.get('/reports/daily', { params: { date } }).then((res) => res.data.data),
  monthToDate: (date) =>
    api.get('/reports/month-to-date', { params: { date } }).then((res) => res.data.data),
  monthly: (date) => api.get('/reports/monthly', { params: { date } }).then((res) => res.data.data),
};
