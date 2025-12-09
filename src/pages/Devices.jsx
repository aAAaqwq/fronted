import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { deviceApi, userApi } from '../api';
import { Plus, Search, Edit, Trash2, Link, Unlink, Wifi, WifiOff, AlertCircle, Users } from 'lucide-react';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';

const Devices = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBindModal, setShowBindModal] = useState(false);
  const [showBindUsersModal, setShowBindUsersModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
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
        setDevices(res.data.items || []);
        setPagination(prev => ({ ...prev, ...res.data.pagination }));
      }
    } catch (error) {
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
    if (!formData.dev_type) {
      toast.warning('请填写设备类型');
      return;
    }
    try {
      setSubmitting(true);
      const res = await deviceApi.create(formData);
      if (res.code === 201 || res.code === 200) {
        toast.success('创建成功');
        setShowCreateModal(false);
        resetForm();
        fetchDevices();
      } else {
        toast.error(res.message || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    try {
      setSubmitting(true);
      const res = await deviceApi.update({
        dev_id: selectedDevice.dev_id,
        ...formData,
      });
      if (res.code === 200) {
        toast.success('更新成功');
        setShowEditModal(false);
        fetchDevices();
      } else {
        toast.error(res.message || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
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
    const statusMap = {
      0: { label: '在线', icon: Wifi, color: 'bg-green-100 text-green-700' },
      1: { label: '离线', icon: WifiOff, color: 'bg-gray-100 text-gray-700' },
      2: { label: '异常', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
    };
    const s = statusMap[status] || statusMap[1];
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
      title: '设备ID',
      key: 'dev_id',
      render: (val) => <span className="font-mono text-sm">{val}</span>,
    },
    {
      title: '设备名称',
      key: 'dev_name',
      render: (val) => val || '-',
    },
    {
      title: '设备类型',
      key: 'dev_type',
      render: (val) => (
        <span className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-sm">
          {val}
        </span>
      ),
    },
    {
      title: '状态',
      key: 'dev_status',
      render: (val) => getStatusBadge(val),
    },
    {
      title: '电量',
      key: 'dev_power',
      render: (val) => (
        <div className="flex items-center">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                val > 50 ? 'bg-green-500' : val > 20 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${val || 0}%` }}
            />
          </div>
          <span className="ml-2 text-sm text-gray-600">{val || 0}%</span>
        </div>
      ),
    },
    {
      title: '创建时间',
      key: 'create_at',
      render: (val) => val || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: '320px',
      render: (_, row) => (
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <button
            onClick={() => fetchDeviceBindUsers(row)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Users size={12} className="mr-1" />
            用户
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
          >
            <Edit size={12} className="mr-1" />
            编辑
          </button>
          <button
            onClick={() => handleUnbind(row)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
          >
            <Unlink size={12} className="mr-1" />
            解绑
          </button>
          {isAdmin() && (
            <button
              onClick={() => handleDelete(row)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            >
              <Trash2 size={12} className="mr-1" />
              删除
            </button>
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">设备管理</h1>
          <p className="text-gray-600 mt-2">管理传感器设备，查看设备状态和绑定用户</p>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
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
                  { value: '0', label: '在线' },
                  { value: '1', label: '离线' },
                  { value: '2', label: '异常' },
                ]}
                placeholder="全部状态"
                className="w-32"
              />
              <Button onClick={handleSearch} variant="secondary">
                搜索
              </Button>
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <Table
            columns={columns}
            data={devices}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
          />
        </div>

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
                        bindUser.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {bindUser.role === 'admin' ? '管理员' : '普通用户'}
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
      </div>
    </div>
  );
};

export default Devices;
