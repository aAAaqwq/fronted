import axios from 'axios';

// Use proxy in development, direct URL in production
const API_BASE_URL = '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Add Bearer prefix if not present
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// User APIs
export const userApi = {
  register: (data) => api.post('/api/v1/users/register', data),
  login: (data) => api.post('/api/v1/users/login', data),
  changePassword: (data) => api.put('/api/v1/users/password', data),
  getUsers: (params) => api.get('/api/v1/users/all', { params }),
  getUser: (params) => api.get('/api/v1/users', { params }),
  updateUser: (data) => api.put('/api/v1/users', data),
  deleteUser: (uid) => api.delete('/api/v1/users', { params: { uid } }),
  getBindDevices: (params) => api.get('/api/v1/users/bind_devices', { params }),
};

// Device APIs
export const deviceApi = {
  create: (data) => api.post('/api/v1/devices', data),
  getList: (params) => api.get('/api/v1/devices', { params }),
  update: (data) => api.put('/api/v1/devices', data),
  delete: (dev_id) => api.delete('/api/v1/devices', { params: { dev_id } }),
  bindUser: (data) => api.post('/api/v1/devices/bind_user', data),
  unbindUser: (data) => api.delete('/api/v1/devices/unbind_user', { data }),
  getBindUsers: (dev_id) => api.get('/api/v1/devices/bind_users', { params: { dev_id } }),
  getStatistics: () => api.get('/api/v1/devices/statistics'),
};

// Warning APIs
export const warningApi = {
  create: (data) => api.post('/api/v1/warning_info', data),
  getList: (params) => api.get('/api/v1/warning_info', { params }),
  update: (params) => api.put('/api/v1/warning_info', null, { params }),
  delete: (alert_id) => api.delete('/api/v1/warning_info', { params: { alert_id } }),
};

// Log APIs
export const logApi = {
  create: (data) => api.post('/api/v1/logs', data),
  getList: (params) => api.get('/api/v1/logs', { params }),
  delete: (log_id) => api.delete('/api/v1/logs', { params: { log_id } }),
};

// Device Data APIs
export const dataApi = {
  upload: (data) => api.post('/api/v1/device/data', data),
  queryTimeseries: (data) => api.post('/api/v1/device/data/timeseries', data),
  deleteTimeseries: (data) => api.delete('/api/v1/device/data/timeseries', { data }),
  getStatistic: (params) => api.get('/api/v1/device/data/statistic', { params }),
  getFileList: (params) => api.get('/api/v1/device/data/file/list', { params }),
  downloadFile: (params) => api.get('/api/v1/device/data/file/download', { params }),
  deleteFile: (data) => api.delete('/api/v1/device/data/file', { data }),
};

export default api;
