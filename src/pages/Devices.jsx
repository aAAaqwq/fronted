import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { deviceApi } from '../api';
import { Plus, Search, Edit, Trash2, Link, Unlink, Wifi, WifiOff, AlertCircle } from 'lucide-react';
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
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [formData, setFormData] = useState({
    dev_name: '',
    dev_type: '',
    model: '',
    version: '',
    sampling_rate: '',
    upload_interval: '',
  });
  const [bindData, setBindData] = useState({ dev_id: '', permission_level: 'rw' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, [pagination.page, statusFilter]);

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
      const res = await deviceApi.bindUser({
        dev_id: parseInt(bindData.dev_id),
        permission_level: bindData.permission_level,
      });
      if (res.code === 201 || res.code === 200) {
        toast.success('绑定成功');
        setShowBindModal(false);
        setBindData({ dev_id: '', permission_level: 'rw' });
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
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="编辑"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleUnbind(row)}
            className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
            title="解绑"
          >
            <Unlink size={16} />
          </button>
          {isAdmin() && (
            <button
              onClick={() => handleDelete(row)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="删除"
            >
              <Trash2 size={16} />
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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
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

      {/* Table */}
      <Table
        columns={columns}
        data={devices}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
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
        onClose={() => { setShowBindModal(false); setBindData({ dev_id: '', permission_level: 'rw' }); }}
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
          <Select
            label="权限级别"
            value={bindData.permission_level}
            onChange={(e) => setBindData({ ...bindData, permission_level: e.target.value })}
            options={permissionOptions}
          />
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setShowBindModal(false); setBindData({ dev_id: '', permission_level: 'rw' }); }}>
              取消
            </Button>
            <Button onClick={handleBind} loading={submitting}>
              绑定
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Devices;
