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

// 自定义JSON序列化，将字符串ID转为数字（用于请求体）
const transformBigIntRequest = (data) => {
  if (!data) return data;
  // 将对象转为JSON字符串，然后将引号包裹的大数字ID转为数字
  const jsonStr = JSON.stringify(data);
  // 匹配 "dev_id":"123..." 或 "uid":"123..." 等ID字段，将字符串值转为数字
  const transformed = jsonStr.replace(/"(dev_id|uid|alert_id|log_id|data_id)":"(\d+)"/g, '"$1":$2');
  return transformed;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  transformResponse: [transformBigIntResponse],
});

// Request interceptor - add token and transform BigInt IDs
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Add Bearer prefix if not present
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    // 转换请求体中的字符串ID为数字
    if (config.data && typeof config.data === 'object') {
      config.data = transformBigIntRequest(config.data);
      // 由于已经是JSON字符串，需要告诉axios不要再次序列化
      config.transformRequest = [(data) => data];
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
  updateStatus: (data) => {
    console.log('[API] 发送状态更新请求:', data);
    // 由于 /api/v1/devices/status 端点不存在，使用通用的设备更新接口
    console.log('[API] 使用通用设备更新接口 /api/v1/devices');
    return api.put('/api/v1/devices', data);
  },
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
  // 获取文件上传预签名URL (用于客户端直接上传到MinIO) - 不转换ID
  getPresignedUrl: (data) => {
    const token = localStorage.getItem('token');
    return axios.post('/api/v1/device/data/file/presigned_url', data, {
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
      transformResponse: [transformBigIntResponse]
    }).then(response => response.data);
  },
};

export default api;
