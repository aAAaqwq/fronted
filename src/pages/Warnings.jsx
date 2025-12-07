import React, { useState, useEffect } from 'react';
import { useToast } from '../components/common/Toast';
import { warningApi } from '../api';
import { Search, AlertTriangle, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';

const Warnings = () => {
  const toast = useToast();
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState(null);

  useEffect(() => {
    fetchWarnings();
  }, [pagination.page, statusFilter, typeFilter]);

  const fetchWarnings = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
      };
      if (statusFilter) params.alert_status = statusFilter;
      if (typeFilter) params.alert_type = typeFilter;

      const res = await warningApi.getList(params);
      if (res.code === 200) {
        setWarnings(res.data.warning_lists || []);
        setPagination(prev => ({ ...prev, ...res.data.pagination }));
      }
    } catch (error) {
      toast.error('获取告警列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (warning, newStatus) => {
    try {
      const res = await warningApi.update({
        alert_id: warning.alert_id,
        alert_status: newStatus,
      });
      if (res.code === 200) {
        toast.success('状态更新成功');
        fetchWarnings();
      } else {
        toast.error(res.message || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    }
  };

  const handleDelete = async (warning) => {
    if (!window.confirm('确定要删除该告警记录吗？')) return;
    try {
      const res = await warningApi.delete(warning.alert_id);
      if (res.code === 200) {
        toast.success('删除成功');
        fetchWarnings();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { label: '活跃', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
      resolved: { label: '已解决', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      ignored: { label: '已忽略', color: 'bg-gray-100 text-gray-700', icon: XCircle },
    };
    const s = statusMap[status] || statusMap.active;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
        <Icon size={12} className="mr-1" />
        {s.label}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      dev: { label: '设备告警', color: 'bg-orange-100 text-orange-700' },
      data: { label: '数据告警', color: 'bg-blue-100 text-blue-700' },
    };
    const t = typeMap[type] || { label: type, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.color}`}>
        {t.label}
      </span>
    );
  };

  const columns = [
    {
      title: '告警ID',
      key: 'alert_id',
      render: (val) => <span className="font-mono text-sm">{val}</span>,
    },
    {
      title: '设备ID',
      key: 'dev_id',
      render: (val) => val ? <span className="font-mono text-sm">{val}</span> : '-',
    },
    {
      title: '告警类型',
      key: 'alert_type',
      render: (val) => getTypeBadge(val),
    },
    {
      title: '告警状态',
      key: 'alert_status',
      render: (val) => getStatusBadge(val),
    },
    {
      title: '告警信息',
      key: 'alert_message',
      render: (val) => (
        <span className="text-sm text-gray-600 truncate max-w-xs block">
          {val || '-'}
        </span>
      ),
    },
    {
      title: '触发时间',
      key: 'triggered_at',
      render: (val) => val || '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => { setSelectedWarning(row); setShowDetailModal(true); }}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="查看详情"
          >
            <Eye size={16} />
          </button>
          {row.alert_status === 'active' && (
            <>
              <button
                onClick={() => handleUpdateStatus(row, 'resolved')}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title="标记为已解决"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={() => handleUpdateStatus(row, 'ignored')}
                className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="忽略"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
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

  // Statistics
  const activeCount = warnings.filter(w => w.alert_status === 'active').length;
  const resolvedCount = warnings.filter(w => w.alert_status === 'resolved').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">活跃告警</p>
            <p className="text-3xl font-bold text-red-600">{activeCount}</p>
          </div>
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">已解决</p>
            <p className="text-3xl font-bold text-green-600">{resolvedCount}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle size={24} className="text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">总告警数</p>
            <p className="text-3xl font-bold text-gray-900">{pagination.total}</p>
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} className="text-gray-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
          options={[
            { value: 'active', label: '活跃' },
            { value: 'resolved', label: '已解决' },
            { value: 'ignored', label: '已忽略' },
          ]}
          placeholder="全部状态"
          className="w-40"
        />
        <Select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
          options={[
            { value: 'dev', label: '设备告警' },
            { value: 'data', label: '数据告警' },
          ]}
          placeholder="全部类型"
          className="w-40"
        />
        <Button onClick={fetchWarnings} variant="secondary">
          刷新
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={warnings}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="告警详情"
        size="lg"
      >
        {selectedWarning && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">告警ID</label>
                <p className="font-mono">{selectedWarning.alert_id}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">设备ID</label>
                <p className="font-mono">{selectedWarning.dev_id || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">数据ID</label>
                <p className="font-mono">{selectedWarning.data_id || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">告警类型</label>
                <p>{getTypeBadge(selectedWarning.alert_type)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">告警状态</label>
                <p>{getStatusBadge(selectedWarning.alert_status)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">触发时间</label>
                <p>{selectedWarning.triggered_at || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">解决时间</label>
                <p>{selectedWarning.resolved_at || '-'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">告警信息</label>
              <p className="mt-1 p-3 bg-gray-50 rounded-lg">
                {selectedWarning.alert_message || '无详细信息'}
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              {selectedWarning.alert_status === 'active' && (
                <>
                  <Button
                    variant="success"
                    onClick={() => { handleUpdateStatus(selectedWarning, 'resolved'); setShowDetailModal(false); }}
                  >
                    标记为已解决
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => { handleUpdateStatus(selectedWarning, 'ignored'); setShowDetailModal(false); }}
                  >
                    忽略
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Warnings;
