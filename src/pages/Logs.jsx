import React, { useState, useEffect } from 'react';
import { useToast } from '../components/common/Toast';
import { logApi } from '../api';
import { Search, Trash2, RefreshCw, AlertCircle, Info, AlertTriangle, XCircle, Plus } from 'lucide-react';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';

const Logs = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noPermission, setNoPermission] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'info',
    level: 1,
    message: '',
    user_agent: ''
  });
  const [filters, setFilters] = useState({
    log_id: '',
    type: '',
    level: '',
    keyword: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setNoPermission(false);
      const params = {};
      if (filters.log_id) params.log_id = filters.log_id;
      if (filters.type) params.type = filters.type;
      if (filters.level) params.level = filters.level;
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.start_time) params.start_time = filters.start_time;
      if (filters.end_time) params.end_time = filters.end_time;

      const res = await logApi.getList(params);
      if (res.code === 200) {
        // API返回 data.logs 数组
        const logData = res.data?.logs || (Array.isArray(res.data) ? res.data : []);
        setLogs(logData);
      } else if (res.code === 403) {
        setNoPermission(true);
      }
    } catch (error) {
      if (error?.code === 403 || error?.message?.includes('管理员')) {
        setNoPermission(true);
      } else {
        toast.error('获取日志列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (log) => {
    if (!window.confirm('确定要删除该日志记录吗？')) return;
    try {
      const res = await logApi.delete(log.log_id);
      if (res.code === 200) {
        toast.success('删除成功');
        fetchLogs();
      } else {
        toast.error(res.message || `删除失败 (code=${res.code})`);
      }
    } catch (error) {
      toast.error(error?.message || '删除失败');
    }
  };

  const handleCreate = async () => {
    if (!formData.message) {
      toast.warning('请填写日志内容');
      return;
    }
    try {
      setSubmitting(true);
      const res = await logApi.create({
        type: formData.type,
        level: parseInt(formData.level),
        message: formData.message,
        user_agent: formData.user_agent || navigator.userAgent
      });
      if (res.code === 200) {
        toast.success('日志上传成功');
        setShowCreateModal(false);
        setFormData({ type: 'info', level: 1, message: '', user_agent: '' });
        fetchLogs();
      } else {
        toast.error(res.message || '上传失败');
      }
    } catch (error) {
      toast.error('上传失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getLevelBadge = (level) => {
    const levelMap = {
      0: { label: 'Level 0', color: 'bg-gray-100 text-gray-700' },
      1: { label: 'Level 1', color: 'bg-blue-100 text-blue-700' },
      2: { label: 'Level 2', color: 'bg-yellow-100 text-yellow-700' },
      3: { label: 'Level 3', color: 'bg-orange-100 text-orange-700' },
      4: { label: 'Level 4', color: 'bg-red-100 text-red-700' },
    };
    const l = levelMap[level] || { label: `Level ${level}`, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${l.color}`}>
        {l.label}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      debug: { label: 'DEBUG', color: 'bg-gray-100 text-gray-700', icon: Info },
      info: { label: 'INFO', color: 'bg-blue-100 text-blue-700', icon: Info },
      warning: { label: 'WARNING', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
      error: { label: 'ERROR', color: 'bg-red-100 text-red-700', icon: XCircle },
      critical: { label: 'CRITICAL', color: 'bg-red-200 text-red-900', icon: AlertCircle },
    };
    const t = typeMap[type] || { label: type?.toUpperCase() || 'UNKNOWN', color: 'bg-gray-100 text-gray-700', icon: Info };
    const Icon = t.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${t.color}`}>
        <Icon size={12} className="mr-1" />
        {t.label}
      </span>
    );
  };

  const columns = [
    {
      title: '日志ID',
      key: 'log_id',
      render: (val) => <span className="font-mono text-sm">{val}</span>,
    },
    {
      title: '类型',
      key: 'type',
      render: (val) => getTypeBadge(val),
    },
    {
      title: '级别',
      key: 'level',
      render: (val) => getLevelBadge(val),
    },
    {
      title: '消息',
      key: 'message',
      render: (val) => (
        <span className="text-sm text-gray-600 truncate max-w-md block">
          {val || '-'}
        </span>
      ),
    },
    {
      title: 'User Agent',
      key: 'user_agent',
      render: (val) => (
        <span className="text-sm text-gray-500 truncate max-w-xs block">
          {val || '-'}
        </span>
      ),
    },
    {
      title: '创建时间',
      key: 'create_at',
      render: (val) => (
        <span className="text-sm text-gray-600">
          {val ? new Date(val).toLocaleString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: '80px',
      render: (_, row) => (
        <button
          onClick={() => handleDelete(row)}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
        >
          <Trash2 size={12} className="mr-1" />
          删除
        </button>
      ),
    },
  ];

  const typeOptions = [
    { value: 'debug', label: 'DEBUG' },
    { value: 'info', label: 'INFO' },
    { value: 'warning', label: 'WARNING' },
    { value: 'error', label: 'ERROR' },
    { value: 'critical', label: 'CRITICAL' },
  ];

  const levelOptions = [
    { value: '0', label: 'Level 0' },
    { value: '1', label: 'Level 1' },
    { value: '2', label: 'Level 2' },
    { value: '3', label: 'Level 3' },
    { value: '4', label: 'Level 4' },
  ];

  // 无权限提示
  if (noPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl shadow-sm">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle size={32} className="text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">需要管理员权限</h2>
        <p className="text-gray-500 text-center max-w-md">
          系统日志功能仅对管理员开放。请使用管理员账号登录。
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">日志管理</h1>
          <p className="text-gray-600 mt-2">查看系统操作日志，监控系统运行状态</p>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-end space-x-2">
              <Button onClick={fetchLogs} variant="secondary" icon={RefreshCw}>
                刷新
              </Button>
            </div>
            <Button onClick={() => setShowCreateModal(true)} icon={Plus}>
              上传日志
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">筛选条件</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Input
              label="日志ID"
              value={filters.log_id}
              onChange={(e) => setFilters({ ...filters, log_id: e.target.value })}
              placeholder="输入日志ID"
            />
            <Input
              label="关键词搜索"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              placeholder="设备名称/型号/ID/版本/类型"
            />
            <Select
              label="日志类型"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              options={typeOptions}
              placeholder="全部类型"
            />
            <Select
              label="日志级别"
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              options={levelOptions}
              placeholder="全部级别"
            />
            <Input
              label="开始时间"
              type="datetime-local"
              value={filters.start_time}
              onChange={(e) => setFilters({ ...filters, start_time: e.target.value })}
            />
            <Input
              label="结束时间"
              type="datetime-local"
              value={filters.end_time}
              onChange={(e) => setFilters({ ...filters, end_time: e.target.value })}
            />
            <div className="flex items-end space-x-2">
              <Button onClick={fetchLogs} icon={Search}>
                搜索
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setFilters({ log_id: '', type: '', level: '', keyword: '', start_time: '', end_time: '' });
                  fetchLogs();
                }}
                icon={RefreshCw}
              >
                重置
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总日志数</p>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Info size={20} className="text-gray-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">INFO</p>
              <p className="text-2xl font-bold text-blue-600">
                {logs.filter(l => l.level === 1).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Info size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">WARN</p>
              <p className="text-2xl font-bold text-yellow-600">
                {logs.filter(l => l.level === 2).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ERROR</p>
              <p className="text-2xl font-bold text-red-600">
                {logs.filter(l => l.level === 3).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {columns.map((col, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={columns.length} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    暂无日志数据
                  </td>
                </tr>
              ) : (
                logs.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Log Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setFormData({ type: 'info', level: 1, message: '', user_agent: '' }); }}
        title="上传日志"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="日志类型"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={typeOptions}
              required
            />
            <Select
              label="日志级别"
              value={formData.level.toString()}
              onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
              options={levelOptions}
              required
            />
          </div>
          <Input
            label="日志消息"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="请输入日志消息内容"
            required
            multiline
            rows={3}
          />
          <Input
            label="User Agent（可选）"
            value={formData.user_agent}
            onChange={(e) => setFormData({ ...formData, user_agent: e.target.value })}
            placeholder="默认使用浏览器 User Agent"
          />
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormData({ type: 'info', level: 1, message: '', user_agent: '' }); }}>
              取消
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              上传
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
};

export default Logs;
