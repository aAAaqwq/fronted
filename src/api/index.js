import axios from 'axios';

// Use proxy in development, direct URL in production
const API_BASE_URL = '';

// 自定义JSON解析，将大数字ID转为字符串
const transformBigIntResponse = (data) => {
  if (typeof data === 'string') {
    try {
      // 将大数字（超过15位）转为字符串后再解析
      const transformed = data.replace(/:(\d{15,})/g, ':"$1"');
      return JSON.parse(transformed);
    } catch (e) {
      return data;
    }
  }
  return data;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  transformResponse: [transformBigIntResponse],
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

// Response interceptor - handle errors and BigInt IDs
api.interceptors.response.use(
  (response) => {
    // 处理响应数据中的大数字ID（转为字符串避免精度丢失）
    const data = response.data;
    return data;
  },
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
  // 获取文件上传预签名URL (用于客户端直接上传到MinIO)
  getPresignedUrl: (data) => api.post('/api/v1/device/data/file/presigned_url', data),
};

export default api;
