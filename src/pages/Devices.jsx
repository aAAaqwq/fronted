import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { deviceApi, userApi } from '../api';
import { Plus, Search, Edit, Trash2, Link, Unlink, Wifi, WifiOff, AlertCircle, Users, Bug } from 'lucide-react';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import DeviceStatusDebugger from '../components/DeviceStatusDebugger';

const Devices = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false); // 添加自动刷新功能
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBindModal, setShowBindModal] = useState(false);
  const [showBindUsersModal, setShowBindUsersModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [statusData, setStatusData] = useState({ dev_id: '', dev_status: 0 });
  const [deviceBindUsers, setDeviceBindUsers] = useState([]);
  const [bindUsersLoading, setBindUsersLoading] = useState(false);
  const [formData, setFormData] = useState({
    dev_name: '',
    dev_type: '',
    model: '',
    version: '',
    sampling_rate: '',
    upload_interval: '',
  });
  const [bindData, setBindData] = useState({ dev_id: '', uid: '', permission_level: 'rw' });
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDevices();
    if (isAdmin()) {
      fetchUsers();
    }
  }, [pagination.page, statusFilter]);

  // 自动刷新设备状态（每30秒）
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDevices();
    }, 30000); // 30秒刷新一次
    return () => clearInterval(interval);
  }, [autoRefresh, pagination.page, statusFilter]);

  const fetchUsers = async () => {
    try {
      const res = await userApi.getUsers({ page: 1, page_size: 100 });
      if (res.code === 200) {
        setUsers(res.data?.items || []);
      }
    } catch (error) {
      console.error('获取用户列表失败', error);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
      };
      if (keyword) params.keyword = keyword;
      if (statusFilter !== '') params.dev_status = parseInt(statusFilter);

      const res = await deviceApi.getList(params);
      if (res.code === 200) {
        const items = res.data.items || [];
        // 调试信息：记录设备状态
        if (items.length > 0) {
          console.log('[设备列表] 获取到', items.length, '个设备');
          items.forEach(device => {
            console.log(`[设备状态] ID: ${device.dev_id}, 名称: ${device.dev_name}, 状态: ${device.dev_status} (${device.dev_status === 0 ? '离线' : device.dev_status === 1 ? '在线' : '异常'})`);
          });
        }
        setDevices(items);
        setPagination(prev => ({ ...prev, ...res.data.pagination }));
      }
    } catch (error) {
      console.error('[设备列表] 获取失败:', error);
      toast.error('获取设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchDevices();
  };

  const handleCreate = async () => {
    if (!formData.dev_name || !formData.dev_type) {
      toast.warning('请填写设备名称和设备类型');
      return;
    }
    try {
      setSubmitting(true);
      
      // 根据API文档使用正确的字段格式（小写下划线）
      const createData = {
        dev_name: formData.dev_name,
        dev_type: formData.dev_type,
        model: formData.model || '',
        version: formData.version || '',
        sampling_rate: formData.sampling_rate || 0,
        upload_interval: formData.upload_interval || 0,
      };
      
      console.log('[设备创建] 创建设备数据:', createData);
      const res = await deviceApi.create(createData);
      if (res.code === 201 || res.code === 200) {
        console.log('[设备创建] 创建成功，返回数据:', res.data);
        toast.success('创建成功 - 设备默认状态为离线');
        setShowCreateModal(false);
        resetForm();
        fetchDevices();
      } else {
        console.error('[设备创建] 创建失败:', res);
        toast.error(res.message || '创建失败');
      }
    } catch (error) {
      console.error('[设备创建] 创建异常:', error);
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.message) {
          toast.error(`创建失败: ${errorData.message}`);
        } else {
          toast.error('创建失败，请检查输入信息');
        }
      } else {
        toast.error('创建失败，请检查网络连接');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.dev_name || !formData.dev_type) {
      toast.warning('请填写设备名称和设备类型');
      return;
    }
    try {
      setSubmitting(true);
      
      // 根据API文档使用正确的字段格式（小写下划线）
      const updateData = {
        dev_id: parseInt(selectedDevice.dev_id),  // API要求integer类型
        dev_name: formData.dev_name,
        dev_type: formData.dev_type,
        model: formData.model || '',
        version: formData.version || '',
        sampling_rate: formData.sampling_rate || 0,
        upload_interval: formData.upload_interval || 0,
      };
      
      console.log('[设备编辑] 更新设备数据:', updateData);
      const res = await deviceApi.update(updateData);
      if (res.code === 200) {
        toast.success('更新成功');
        setShowEditModal(false);
        fetchDevices();
      } else {
        console.error('[设备编辑] 更新失败:', res);
        toast.error(res.message || '更新失败');
      }
    } catch (error) {
      console.error('[设备编辑] 更新异常:', error);
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        toast.error(`更新失败: ${errorData.message || '请检查输入信息'}`);
      } else {
        toast.error('更新失败，请检查网络连接');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (device) => {
    if (!window.confirm(`确定要删除设备 ${device.dev_name || device.dev_id} 吗？`)) return;
    try {
      const res = await deviceApi.delete(device.dev_id);
      if (res.code === 200) {
        toast.success('删除成功');
        fetchDevices();
      } else {
        toast.error(res.message || `删除失败 (code=${res.code})`);
      }
    } catch (error) {
      toast.error(error?.message || '删除失败');
    }
  };

  const handleBind = async () => {
    if (!bindData.dev_id) {
      toast.warning('请输入设备ID');
      return;
    }
    try {
      setSubmitting(true);
      // 构建请求体，uid可选（不传则后端从token获取当前用户）
      const requestBody = {
        dev_id: bindData.dev_id.toString(),
        permission_level: bindData.permission_level,
      };
      // 只有管理员选择了其他用户时才传uid
      if (bindData.uid) {
        requestBody.uid = bindData.uid.toString();
      }
      
      const res = await deviceApi.bindUser(requestBody);
      if (res.code === 201 || res.code === 200) {
        toast.success('绑定成功');
        setShowBindModal(false);
        setBindData({ dev_id: '', uid: '', permission_level: 'rw' });
        fetchDevices();
      } else {
        toast.error(res.message || '绑定失败');
      }
    } catch (error) {
      toast.error('绑定失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnbind = async (device) => {
    if (!window.confirm(`确定要解绑设备 ${device.dev_name || device.dev_id} 吗？`)) return;
    try {
      const res = await deviceApi.unbindUser({ dev_id: device.dev_id });
      if (res.code === 200) {
        toast.success('解绑成功');
        fetchDevices();
      } else {
        toast.error(res.message || '解绑失败');
      }
    } catch (error) {
      toast.error('解绑失败');
    }
  };

  const openStatusModal = (device) => {
    console.log('[状态模态框] 打开设备状态修改:', {
      dev_id: device.dev_id,
      dev_name: device.dev_name,
      current_status: device.dev_status,
      device_type: typeof device.dev_id
    });
    setSelectedDevice(device);
    setStatusData({ dev_id: device.dev_id, dev_status: device.dev_status });
    setShowStatusModal(true);
  };

  const openDebugModal = (device) => {
    setSelectedDevice(device);
    setShowDebugModal(true);
  };

  const handleDebugStatusUpdate = (updatedDevice) => {
    // 更新本地设备列表中的状态
    setDevices(prev => prev.map(device => 
      device.dev_id === updatedDevice.dev_id ? updatedDevice : device
    ));
  };

  const handleUpdateStatus = async () => {
    try {
      setSubmitting(true);
      
      // 检查用户是否已登录
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('请先登录后再操作');
        setSubmitting(false);
        return;
      }
      
      // 从设备列表中获取当前设备的完整信息
      const currentDevice = devices.find(d => String(d.dev_id) === String(statusData.dev_id));
      console.log('[状态更新] 找到当前设备:', currentDevice);
      
      // 强制确保必需字段不为空
      let deviceName = '';
      let deviceType = '';
      
      // 尝试多种方式获取设备名称
      if (currentDevice?.dev_name) {
        deviceName = currentDevice.dev_name;
      } else if (currentDevice?.DevName) {
        deviceName = currentDevice.DevName;
      } else if (selectedDevice?.dev_name) {
        deviceName = selectedDevice.dev_name;
      } else if (selectedDevice?.DevName) {
        deviceName = selectedDevice.DevName;
      } else {
        deviceName = `设备_${statusData.dev_id}`;
      }
      
      // 尝试多种方式获取设备类型
      if (currentDevice?.dev_type) {
        deviceType = currentDevice.dev_type;
      } else if (currentDevice?.DevType) {
        deviceType = currentDevice.DevType;
      } else if (selectedDevice?.dev_type) {
        deviceType = selectedDevice.dev_type;
      } else if (selectedDevice?.DevType) {
        deviceType = selectedDevice.DevType;
      } else {
        deviceType = 'temperature';
      }
      
      // 根据API文档使用正确的字段格式（小写下划线）
      const updateData = {
        dev_id: parseInt(statusData.dev_id),  // API要求integer类型
        dev_name: String(deviceName).trim() || `设备_${statusData.dev_id}`,
        dev_type: String(deviceType).trim() || 'temperature',
        dev_status: parseInt(statusData.dev_status),
        model: currentDevice?.model || selectedDevice?.model || '',
        version: currentDevice?.version || selectedDevice?.version || '',
        sampling_rate: currentDevice?.sampling_rate || selectedDevice?.sampling_rate || 0,
        upload_interval: currentDevice?.upload_interval || selectedDevice?.upload_interval || 0,
      };
      
      // 最后检查：如果还是空，强制设置
      if (!updateData.dev_name || updateData.dev_name.trim() === '') {
        updateData.dev_name = `设备_${statusData.dev_id}`;
      }
      if (!updateData.dev_type || updateData.dev_type.trim() === '') {
        updateData.dev_type = 'temperature';
      }
      
      console.log('[状态更新] 最终数据检查 (正确格式):');
      console.log('  dev_id:', updateData.dev_id, '(类型:', typeof updateData.dev_id, ')');
      console.log('  dev_name:', `"${updateData.dev_name}" (长度: ${updateData.dev_name.length})`);
      console.log('  dev_type:', `"${updateData.dev_type}" (长度: ${updateData.dev_type.length})`);
      console.log('  dev_status:', updateData.dev_status);
      
      // 备用格式（只包含必要字段）
      const updateDataAlt = {
        dev_id: String(statusData.dev_id),
        dev_status: parseInt(statusData.dev_status),
      };
      
      console.log('[状态更新] 更新设备状态 (主格式):', updateData);
      console.log('[状态更新] 更新设备状态 (备用格式):', updateDataAlt);
      
      const statusText = statusData.dev_status == 0 ? '离线' : statusData.dev_status == 1 ? '在线' : '异常';
      
      try {
        // 使用通用设备更新接口
        console.log('[状态更新] 使用通用设备更新接口...');
        const res = await deviceApi.updateStatus(updateData);
        console.log('[状态更新] API调用成功');
        
        console.log('[状态更新] API响应:', res);
        
        if (res && (res.code === 200 || res.status === 200 || res.data)) {
          console.log('[状态更新] 服务器同步成功');
          
          // 立即更新本地状态
          const newStatus = parseInt(statusData.dev_status);
          console.log('[状态更新] 准备更新本地状态，目标设备ID:', statusData.dev_id, '新状态:', newStatus);
          
          setDevices(prev => {
            const updated = prev.map(device => {
              if (String(device.dev_id) === String(statusData.dev_id)) {
                console.log('[状态更新] 更新设备:', device.dev_id, '从', device.dev_status, '到', newStatus);
                return { ...device, dev_status: newStatus };
              }
              return device;
            });
            
            const updatedDevice = updated.find(d => String(d.dev_id) === String(statusData.dev_id));
            console.log('[状态更新] 本地状态已更新:', updatedDevice);
            return updated;
          });
          
          toast.success(`状态已更新为${statusText}`);
          setShowStatusModal(false);
          
          // 验证服务器状态同步的函数
          const verifyServerStatus = async (retryCount = 0) => {
            const maxRetries = 3;
            const delay = 1500 + (retryCount * 1000); // 1.5s, 2.5s, 3.5s
            
            console.log(`[状态更新] 验证服务器状态更新 (第${retryCount + 1}次)...`);
            
            try {
              const verifyRes = await deviceApi.getList({
                page: pagination.page,
                page_size: pagination.page_size,
              });
              
              if (verifyRes.code === 200) {
                const serverDevice = verifyRes.data.items?.find(d => String(d.dev_id) === String(statusData.dev_id));
                
                if (serverDevice) {
                  console.log('[状态更新] 服务器设备状态:', serverDevice.dev_status, '期望状态:', newStatus);
                  
                  if (serverDevice.dev_status === newStatus) {
                    console.log('[状态更新] 服务器状态已同步，刷新页面');
                    fetchDevices();
                    return true; // 同步成功
                  } else if (retryCount < maxRetries) {
                    console.log(`[状态更新] 服务器状态未同步，${delay}ms后重试...`);
                    setTimeout(() => verifyServerStatus(retryCount + 1), delay);
                    return false; // 需要重试
                  } else {
                    console.log('[状态更新] 达到最大重试次数，保持本地状态');
                    toast.warning('状态更新成功，服务器同步可能需要更多时间');
                    return false; // 放弃重试
                  }
                } else {
                  console.log('[状态更新] 未找到对应设备，刷新页面');
                  fetchDevices();
                  return true;
                }
              }
            } catch (error) {
              console.error('[状态更新] 验证服务器状态失败:', error);
              if (retryCount < maxRetries) {
                setTimeout(() => verifyServerStatus(retryCount + 1), delay);
              }
              return false;
            }
          };
          
          // 开始验证
          setTimeout(() => verifyServerStatus(), 1500);
        } else {
          throw new Error(res?.message || res?.data?.message || '服务器同步失败');
        }
      } catch (syncError) {
        console.error('[状态更新] 服务器同步失败:', syncError);
        
        // 回滚本地状态
        setDevices(prev => prev.map(device => 
          String(device.dev_id) === String(statusData.dev_id)
            ? { ...device, dev_status: selectedDevice?.dev_status || 0 }
            : device
        ));
        
        let errorMessage = '状态更新失败，已回滚到原状态';
        
        if (syncError.response) {
          const status = syncError.response.status;
          const data = syncError.response.data;
          
          if (status === 401) {
            errorMessage = '登录已过期，请重新登录';
            // 清除过期token
            localStorage.removeItem('token');
            // 3秒后跳转到登录页
            setTimeout(() => {
              window.location.href = '/login';
            }, 3000);
          } else if (status === 400 && data?.message?.includes('DevName') && data?.message?.includes('DevType')) {
            errorMessage = '后端API验证错误，请联系技术支持。这是已知的后端问题，正在修复中。';
            console.error('后端API Bug: 即使发送了正确字段，后端仍报字段验证失败');
          } else if (status === 403) {
            errorMessage = '权限不足，无法修改设备状态';
          } else if (status === 404) {
            errorMessage = '设备不存在或API接口未找到';
          } else if (status === 500) {
            errorMessage = '服务器内部错误，请稍后重试';
          } else {
            errorMessage = data?.message || `服务器错误 (${status})`;
          }
        } else if (syncError.request) {
          errorMessage = '网络连接失败，请检查网络或后端服务';
        } else {
          errorMessage = syncError.message || '未知错误';
        }
        
        toast.error(errorMessage);
      }
      
      // 无论成功失败，都重新获取最新数据
      setTimeout(() => fetchDevices(), 1000);
      
    } catch (error) {
      console.error('[状态更新] 处理异常:', error);
      toast.error('状态更新处理失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDeviceBindUsers = async (device) => {
    try {
      setBindUsersLoading(true);
      setSelectedDevice(device);
      const res = await deviceApi.getBindUsers(device.dev_id);
      if (res.code === 200) {
        setDeviceBindUsers(res.data?.bound_users || []);
        setShowBindUsersModal(true);
      } else {
        toast.error('获取设备绑定用户失败');
      }
    } catch (error) {
      toast.error('获取设备绑定用户失败');
    } finally {
      setBindUsersLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      dev_name: '',
      dev_type: '',
      model: '',
      version: '',
      sampling_rate: '',
      upload_interval: '',
    });
  };

  const openEditModal = (device) => {
    setSelectedDevice(device);
    setFormData({
      dev_name: device.dev_name || '',
      dev_type: device.dev_type || '',
      model: device.model || '',
      version: device.version || '',
      sampling_rate: device.sampling_rate || '',
      upload_interval: device.upload_interval || '',
    });
    setShowEditModal(true);
  };

  const getStatusBadge = (status) => {
    // 调试信息：记录状态渲染
    console.log('[状态渲染] 渲染状态:', status, '类型:', typeof status);
    
    const statusMap = {
      0: { label: '离线', icon: WifiOff, color: 'bg-gray-100 text-gray-700' },
      1: { label: '在线', icon: Wifi, color: 'bg-green-100 text-green-700' },
      2: { label: '异常', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
    };
    const s = statusMap[status] || statusMap[0];
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
        <Icon size={12} className="mr-1" />
        {s.label}
      </span>
    );
  };

  const columns = [
    {
      title: 'ID',
      key: 'dev_id',
      width: '80px',
      render: (val) => <span className="font-mono text-xs">{String(val).slice(-6)}</span>,
    },
    {
      title: '设备名称',
      key: 'dev_name',
      width: '120px',
      render: (val) => (
        <div className="truncate" title={val || '-'}>
          {val || '-'}
        </div>
      ),
    },
    {
      title: '类型',
      key: 'dev_type',
      width: '80px',
      render: (val) => (
        <span className="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded text-xs truncate" title={val}>
          {val}
        </span>
      ),
    },
    {
      title: '型号',
      key: 'model',
      width: '80px',
      render: (val) => (
        <div className="truncate text-xs" title={val || '-'}>
          {val || '-'}
        </div>
      ),
    },
    {
      title: '版本',
      key: 'version',
      width: '60px',
      render: (val) => (
        <div className="truncate text-xs" title={val || '-'}>
          {val || '-'}
        </div>
      ),
    },
    {
      title: '状态',
      key: 'dev_status',
      width: '70px',
      render: (val) => getStatusBadge(val),
    },
    {
      title: '电量',
      key: 'dev_power',
      width: '80px',
      render: (val) => (
        <div className="flex items-center">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                val > 50 ? 'bg-green-500' : val > 20 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${val || 0}%` }}
            />
          </div>
          <span className="ml-1 text-xs text-gray-600">{val || 0}%</span>
        </div>
      ),
    },
    {
      title: '创建时间',
      key: 'create_at',
      width: '90px',
      render: (val) => (
        <div className="text-xs text-gray-500" title={val}>
          {val ? new Date(val).toLocaleDateString() : '-'}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: '280px',
      render: (_, row) => (
        <div className="flex items-center space-x-1 flex-wrap gap-y-1">
          <button
            onClick={() => fetchDeviceBindUsers(row)}
            className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
            title="查看绑定用户"
          >
            <Users size={10} className="mr-0.5" />
            用户
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
            title="编辑设备"
          >
            <Edit size={10} className="mr-0.5" />
            编辑
          </button>
          <button
            onClick={() => handleUnbind(row)}
            className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
            title="解绑设备"
          >
            <Unlink size={10} className="mr-0.5" />
            解绑
          </button>
          <button
            onClick={() => openDebugModal(row)}
            className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded hover:bg-cyan-100 transition-colors"
            title="状态调试"
          >
            <Bug size={10} className="mr-0.5" />
            调试
          </button>
          {isAdmin() && (
            <>
              <button
                onClick={() => openStatusModal(row)}
                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                title="修改状态"
              >
                <AlertCircle size={10} className="mr-0.5" />
                状态
              </button>
              <button
                onClick={() => handleDelete(row)}
                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                title="删除设备"
              >
                <Trash2 size={10} className="mr-0.5" />
                删除
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const deviceTypeOptions = [
    { value: 'temperature', label: '温度传感器' },
    { value: 'humidity', label: '湿度传感器' },
    { value: 'pressure', label: '压力传感器' },
    { value: 'ecg', label: '心电传感器' },
    { value: 'emg', label: '肌电传感器' },
    { value: 'image', label: '图像传感器' },
    { value: 'other', label: '其他' },
  ];

  const permissionOptions = [
    { value: 'r', label: '只读' },
    { value: 'w', label: '只写' },
    { value: 'rw', label: '读写' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto space-y-4 animate-fadeIn">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">设备管理</h1>
          <p className="text-gray-600 mt-1 text-sm">管理传感器设备，查看设备状态和绑定用户</p>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4 flex-wrap">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索设备..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '0', label: '离线' },
                  { value: '1', label: '在线' },
                  { value: '2', label: '异常' },
                ]}
                placeholder="全部状态"
                className="w-32"
              />
              <Button onClick={handleSearch} variant="secondary">
                搜索
              </Button>
              <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>自动刷新(30s)</span>
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={() => setShowBindModal(true)} icon={Link} variant="outline">
                绑定设备
              </Button>
              {isAdmin() && (
                <Button onClick={() => setShowCreateModal(true)} icon={Plus}>
                  创建设备
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={devices}
          loading={loading}
          pagination={pagination}
          compact={true}
          onPageChange={(page) => {
            setPagination(prev => ({ ...prev, page }));
            fetchDevices();
          }}
        />

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="创建设备"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="设备名称"
              value={formData.dev_name}
              onChange={(e) => setFormData({ ...formData, dev_name: e.target.value })}
              placeholder="请输入设备名称"
              required
            />
            <Select
              label="设备类型"
              value={formData.dev_type}
              onChange={(e) => setFormData({ ...formData, dev_type: e.target.value })}
              options={deviceTypeOptions}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="设备型号"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="请输入设备型号"
            />
            <Input
              label="固件版本"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="请输入固件版本"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="采样频率"
              type="number"
              value={formData.sampling_rate}
              onChange={(e) => setFormData({ ...formData, sampling_rate: parseInt(e.target.value) || '' })}
              placeholder="Hz"
            />
            <Input
              label="上传间隔"
              type="number"
              value={formData.upload_interval}
              onChange={(e) => setFormData({ ...formData, upload_interval: parseInt(e.target.value) || '' })}
              placeholder="秒"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              创建
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑设备"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="设备名称"
              value={formData.dev_name}
              onChange={(e) => setFormData({ ...formData, dev_name: e.target.value })}
              placeholder="请输入设备名称"
              required
            />
            <Select
              label="设备类型"
              value={formData.dev_type}
              onChange={(e) => setFormData({ ...formData, dev_type: e.target.value })}
              options={deviceTypeOptions}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="设备型号"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="请输入设备型号"
            />
            <Input
              label="固件版本"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="请输入固件版本"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="采样频率"
              type="number"
              value={formData.sampling_rate}
              onChange={(e) => setFormData({ ...formData, sampling_rate: parseInt(e.target.value) || '' })}
              placeholder="Hz"
            />
            <Input
              label="上传间隔"
              type="number"
              value={formData.upload_interval}
              onChange={(e) => setFormData({ ...formData, upload_interval: parseInt(e.target.value) || '' })}
              placeholder="秒"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} loading={submitting}>
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bind Modal */}
      <Modal
        isOpen={showBindModal}
        onClose={() => { setShowBindModal(false); setBindData({ dev_id: '', uid: '', permission_level: 'rw' }); }}
        title="绑定设备"
      >
        <div className="space-y-4">
          <Input
            label="设备ID"
            value={bindData.dev_id}
            onChange={(e) => setBindData({ ...bindData, dev_id: e.target.value })}
            placeholder="请输入要绑定的设备ID"
            required
          />
          {isAdmin() && users.length > 0 && (
            <Select
              label="绑定用户（可选，默认绑定自己）"
              value={bindData.uid}
              onChange={(e) => setBindData({ ...bindData, uid: e.target.value })}
              options={[
                { value: '', label: '绑定到当前用户' },
                ...users.map(u => ({ value: u.uid.toString(), label: `${u.username || u.email} (${u.role})` }))
              ]}
            />
          )}
          <Select
            label="权限级别"
            value={bindData.permission_level}
            onChange={(e) => setBindData({ ...bindData, permission_level: e.target.value })}
            options={permissionOptions}
          />
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setShowBindModal(false); setBindData({ dev_id: '', uid: '', permission_level: 'rw' }); }}>
              取消
            </Button>
            <Button onClick={handleBind} loading={submitting}>
              绑定
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="修改设备状态"
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">设备ID: <span className="font-mono font-medium text-gray-900">{selectedDevice?.dev_id}</span></p>
            <p className="text-sm text-gray-600 mt-1">设备名称: <span className="font-medium text-gray-900">{selectedDevice?.dev_name || '-'}</span></p>
          </div>
          <Select
            label="设备状态"
            value={statusData.dev_status.toString()}
            onChange={(e) => setStatusData({ ...statusData, dev_status: parseInt(e.target.value) })}
            options={[
              { value: '0', label: '离线' },
              { value: '1', label: '在线' },
              { value: '2', label: '异常' },
            ]}
            required
          />
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateStatus} loading={submitting}>
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* Device Bind Users Modal */}
      <Modal
        isOpen={showBindUsersModal}
        onClose={() => setShowBindUsersModal(false)}
        title={`${selectedDevice?.dev_name || `设备 ${selectedDevice?.dev_id}`} 的绑定用户`}
      >
        <div className="space-y-4">
          {bindUsersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">加载中...</p>
            </div>
          ) : deviceBindUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p>该设备暂未绑定任何用户</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {deviceBindUsers.map(bindUser => (
                <div key={bindUser.uid} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{bindUser.username || bindUser.email || `用户 ${bindUser.uid}`}</p>
                      <p className="text-sm text-gray-500">ID: {bindUser.uid}</p>
                      <p className="text-sm text-gray-500">邮箱: {bindUser.email || '-'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        bindUser.role === 'admin' || bindUser.role === 1 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {bindUser.role === 'admin' || bindUser.role === 1 ? '管理员' : '普通用户'}
                      </span>
                      {bindUser.permission_level && (
                        <p className="text-xs text-gray-500 mt-1">
                          权限: {bindUser.permission_level === 'rw' ? '读写' : bindUser.permission_level === 'r' ? '只读' : '只写'}
                        </p>
                      )}
                      {bindUser.bind_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          绑定时间: {new Date(bindUser.bind_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowBindUsersModal(false)}>
              关闭
            </Button>
          </div>
        </div>
      </Modal>

      {/* Device Status Debugger */}
      <DeviceStatusDebugger
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        device={selectedDevice}
        onStatusUpdate={handleDebugStatusUpdate}
      />
      </div>
    </div>
  );
};

export default Devices;
