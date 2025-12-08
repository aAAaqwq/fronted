import React, { useState, useEffect } from 'react';
import { useToast } from '../components/common/Toast';
import { userApi } from '../api';
import { Plus, Search, Edit, Trash2, Shield, User as UserIcon } from 'lucide-react';
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
  const [selectedUser, setSelectedUser] = useState(null);
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
            onClick={() => handleDelete(row)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
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

      {/* Table */}
      <Table
        columns={columns}
        data={users}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
      />

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
    </div>
  );
};

export default Users;
