import React, { useState, useEffect } from 'react';
import { useToast } from '../components/common/Toast';
import { userApi } from '../api';
import { Plus, Search, Edit, Trash2, Shield, User as UserIcon, Eye, Smartphone } from 'lucide-react';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';

const Users = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDevices, setUserDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });
  const [editFormData, setEditFormData] = useState({
    uid: '',
    email: '',
    username: '',
  });
    const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
      };
      if (keyword) params.keyword = keyword;
      if (roleFilter) params.role = roleFilter;

      const res = await userApi.getUsers(params);
      if (res.code === 200) {
        setUsers(res.data.items || []);
        setPagination(prev => ({ ...prev, ...res.data.pagination }));
      }
    } catch (error) {
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.password) {
      toast.warning('请填写邮箱和密码');
      return;
    }
    try {
      setSubmitting(true);
      const res = await userApi.register(formData);
      if (res.code === 201 || res.code === 200) {
        toast.success('创建成功');
        setShowCreateModal(false);
        setFormData({ email: '', password: '', username: '' });
        fetchUsers();
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
      const res = await userApi.updateUser(editFormData);
      if (res.code === 200) {
        toast.success('更新成功');
        setShowEditModal(false);
        fetchUsers();
      } else {
        toast.error(res.message || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  
  const fetchUserDetail = async (user) => {
    try {
      const res = await userApi.getUser({ uid: user.uid });
      if (res.code === 200) {
        setSelectedUser({ ...user, ...res.data });
        setShowDetailModal(true);
      } else {
        toast.error('获取用户详情失败');
      }
    } catch (error) {
      toast.error('获取用户详情失败');
    }
  };

  const fetchUserDevices = async (user) => {
    try {
      setDevicesLoading(true);
      setSelectedUser(user);
      const res = await userApi.getBindDevices({ page: 1, page_size: 100 });
      if (res.code === 200) {
        setUserDevices(res.data?.items || []);
        setShowDevicesModal(true);
      } else {
        toast.error('获取用户设备失败');
      }
    } catch (error) {
      toast.error('获取用户设备失败');
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`确定要删除用户 ${user.username || user.email} 吗？`)) return;
    try {
      const res = await userApi.deleteUser(user.uid);
      if (res.code === 200) {
        toast.success('删除成功');
        fetchUsers();
      } else {
        toast.error(res.message || `删除失败 (code=${res.code})`);
      }
    } catch (error) {
      toast.error(error?.message || '删除失败');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      uid: user.uid,
      email: user.email || '',
      username: user.username || '',
    });
    setShowEditModal(true);
  };

  
  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <Shield size={12} className="mr-1" />
          管理员
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <UserIcon size={12} className="mr-1" />
        普通用户
      </span>
    );
  };

  const columns = [
    {
      title: '用户ID',
      key: 'uid',
      render: (val) => <span className="font-mono text-sm">{val}</span>,
    },
    {
      title: '用户名',
      key: 'username',
      render: (val) => val || '-',
    },
    {
      title: '邮箱',
      key: 'email',
    },
    {
      title: '角色',
      key: 'role',
      render: (val) => getRoleBadge(val),
    },
    {
      title: '创建时间',
      key: 'create_at',
      render: (val) => val || '-',
    },
    {
      title: '更新时间',
      key: 'update_at',
      render: (val) => val || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: '280px',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchUserDetail(row)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Eye size={12} className="mr-1" />
            详情
          </button>
          <button
            onClick={() => fetchUserDevices(row)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
          >
            <Smartphone size={12} className="mr-1" />
            设备
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
          >
            <Edit size={12} className="mr-1" />
            编辑
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
          >
            <Trash2 size={12} className="mr-1" />
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-600 mt-2">管理系统用户，查看用户信息和绑定设备</p>
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
                  placeholder="搜索用户..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
                />
              </div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'admin', label: '管理员' },
                  { value: 'user', label: '普通用户' },
                ]}
                placeholder="全部角色"
                className="w-32"
              />
              <Button onClick={handleSearch} variant="secondary">
                搜索
              </Button>
            </div>
            <Button onClick={() => setShowCreateModal(true)} icon={Plus}>
              创建用户
            </Button>
          </div>
        </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={users}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setFormData({ email: '', password: '', username: '' }); }}
        title="创建用户"
      >
        <div className="space-y-4">
          <Input
            label="邮箱"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="请输入邮箱"
            required
          />
          <Input
            label="密码"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="请输入密码"
            required
          />
          <Input
            label="用户名"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="请输入用户名（可选）"
          />
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormData({ email: '', password: '', username: '' }); }}>
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
        title="编辑用户"
      >
        <div className="space-y-4">
          <Input
            label="邮箱"
            type="email"
            value={editFormData.email}
            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            placeholder="请输入邮箱"
          />
          <Input
            label="用户名"
            value={editFormData.username}
            onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
            placeholder="请输入用户名"
          />
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

      {/* User Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="用户详情"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户ID</label>
                <p className="text-sm text-gray-900 font-mono">{selectedUser.uid}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <div>{getRoleBadge(selectedUser.role)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <p className="text-sm text-gray-900">{selectedUser.email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <p className="text-sm text-gray-900">{selectedUser.username || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
                <p className="text-sm text-gray-900">{selectedUser.create_at || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">更新时间</label>
                <p className="text-sm text-gray-900">{selectedUser.update_at || '-'}</p>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>


      {/* User Devices Modal */}
      <Modal
        isOpen={showDevicesModal}
        onClose={() => setShowDevicesModal(false)}
        title={`${selectedUser?.username || selectedUser?.email || '用户'} 的绑定设备`}
      >
        <div className="space-y-4">
          {devicesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">加载中...</p>
            </div>
          ) : userDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Smartphone size={32} className="mx-auto mb-2 opacity-50" />
              <p>该用户暂未绑定任何设备</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {userDevices.map(device => (
                <div key={device.dev_id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{device.dev_name || `设备 ${device.dev_id}`}</p>
                      <p className="text-sm text-gray-500">ID: {device.dev_id}</p>
                      <p className="text-sm text-gray-500">类型: {device.dev_type || '-'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        device.dev_status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {device.dev_status === 1 ? '在线' : '离线'}
                      </span>
                      {device.permission_level && (
                        <p className="text-xs text-gray-500 mt-1">权限: {device.permission_level}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowDevicesModal(false)}>
              关闭
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
};

export default Users;
