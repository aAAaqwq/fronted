import React, { useState, useEffect } from 'react';
import { useToast } from '../components/common/Toast';
import { logApi } from '../api';
import { Search, Trash2, RefreshCw, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Card from '../components/common/Card';

const Logs = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noPermission, setNoPermission] = useState(false);
  const [filters, setFilters] = useState({
    log_id: '',
    type: '',
    level: '',
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
        toast.error(res.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getLevelBadge = (level) => {
    const levelMap = {
      0: { label: 'DEBUG', color: 'bg-gray-100 text-gray-700', icon: Info },
      1: { label: 'INFO', color: 'bg-blue-100 text-blue-700', icon: Info },
      2: { label: 'WARN', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
      3: { label: 'ERROR', color: 'bg-red-100 text-red-700', icon: XCircle },
    };
    const l = levelMap[level] || levelMap[1];
    const Icon = l.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${l.color}`}>
        <Icon size={12} className="mr-1" />
        {l.label}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeColors = {
      system: 'bg-purple-100 text-purple-700',
      user: 'bg-green-100 text-green-700',
      device: 'bg-orange-100 text-orange-700',
      data: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type || 'unknown'}
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
      title: '操作',
      key: 'actions',
      render: (_, row) => (
        <button
          onClick={() => handleDelete(row)}
          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="删除"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  const typeOptions = [
    { value: 'system', label: '系统日志' },
    { value: 'user', label: '用户日志' },
    { value: 'device', label: '设备日志' },
    { value: 'data', label: '数据日志' },
  ];

  const levelOptions = [
    { value: '0', label: 'DEBUG' },
    { value: '1', label: 'INFO' },
    { value: '2', label: 'WARN' },
    { value: '3', label: 'ERROR' },
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
    <div className="space-y-6 animate-fadeIn">
      {/* Filters */}
      <Card title="筛选条件">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Input
            label="日志ID"
            value={filters.log_id}
            onChange={(e) => setFilters({ ...filters, log_id: e.target.value })}
            placeholder="输入日志ID"
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
                setFilters({ log_id: '', type: '', level: '', start_time: '', end_time: '' });
                fetchLogs();
              }}
              icon={RefreshCw}
            >
              重置
            </Button>
          </div>
        </div>
      </Card>

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
    </div>
  );
};

export default Logs;
