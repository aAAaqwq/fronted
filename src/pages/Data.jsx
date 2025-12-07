import React, { useState, useEffect } from 'react';
import { useToast } from '../components/common/Toast';
import { dataApi, deviceApi } from '../api';
import { Search, Download, Trash2, FileImage, FileVideo, FileAudio, File, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';

const Data = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('timeseries');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Timeseries data
  const [timeseriesData, setTimeseriesData] = useState([]);
  const [measurement, setMeasurement] = useState('ecg');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // File data
  const [files, setFiles] = useState([]);
  const [filePagination, setFilePagination] = useState({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [bucketName, setBucketName] = useState('image');
  
  // Statistics
  const [stats, setStats] = useState({ total: 0, abnormal: 0 });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await deviceApi.getList({ page: 1, page_size: 100 });
      if (res.code === 200) {
        setDevices(res.data.items || []);
        if (res.data.items?.length > 0) {
          setSelectedDevice(res.data.items[0].dev_id.toString());
        }
      }
    } catch (error) {
      toast.error('获取设备列表失败');
    }
  };

  const fetchTimeseriesData = async () => {
    if (!selectedDevice) {
      toast.warning('请选择设备');
      return;
    }
    try {
      setLoading(true);
      const now = Date.now();
      const res = await dataApi.queryTimeseries({
        dev_id: parseInt(selectedDevice),
        start_time: startTime ? new Date(startTime).getTime() : now - 24 * 60 * 60 * 1000,
        end_time: endTime ? new Date(endTime).getTime() : now,
        measurement: measurement,
        limit_points: 100,
      });
      if (res.code === 200) {
        const points = res.data.points || [];
        const chartData = points.map((p, index) => ({
          time: new Date(p.timestamp).toLocaleTimeString(),
          value: p.fileds?.value || p.fileds?.ch1 || 0,
        }));
        setTimeseriesData(chartData);
        toast.success(`获取到 ${points.length} 条数据`);
      } else {
        toast.error(res.message || '查询失败');
      }
    } catch (error) {
      toast.error('查询失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchFileData = async () => {
    if (!selectedDevice) {
      toast.warning('请选择设备');
      return;
    }
    try {
      setLoading(true);
      const res = await dataApi.getFileList({
        dev_id: parseInt(selectedDevice),
        bucket_name: bucketName,
        page: filePagination.page,
        page_size: filePagination.page_size,
      });
      if (res.code === 200) {
        setFiles(res.data.items || []);
        setFilePagination(prev => ({ ...prev, ...res.data.pagination }));
      }
    } catch (error) {
      toast.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    if (!selectedDevice) return;
    try {
      const res = await dataApi.getStatistic({
        dev_id: parseInt(selectedDevice),
        measurement: measurement,
      });
      if (res.code === 200) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('获取统计失败');
    }
  };

  const handleDownload = async (file) => {
    try {
      const res = await dataApi.downloadFile({
        bucket_key: file.bucket_key,
        bucket_name: bucketName,
      });
      if (res.code === 200 && res.data.download_url) {
        window.open(res.data.download_url, '_blank');
      } else {
        toast.error('获取下载链接失败');
      }
    } catch (error) {
      toast.error('下载失败');
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm('确定要删除该文件吗？')) return;
    try {
      const res = await dataApi.deleteFile({
        bucket_key: file.bucket_key,
        bucket_name: bucketName,
      });
      if (res.code === 200) {
        toast.success('删除成功');
        fetchFileData();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getFileIcon = (contentType) => {
    if (contentType?.startsWith('image/')) return FileImage;
    if (contentType?.startsWith('video/')) return FileVideo;
    if (contentType?.startsWith('audio/')) return FileAudio;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fileColumns = [
    {
      title: '文件名',
      key: 'name',
      render: (val, row) => {
        const Icon = getFileIcon(row.content_type);
        return (
          <div className="flex items-center">
            <Icon size={20} className="text-gray-400 mr-2" />
            <span className="truncate max-w-xs">{val}</span>
          </div>
        );
      },
    },
    {
      title: '类型',
      key: 'content_type',
      render: (val) => (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
          {val || 'unknown'}
        </span>
      ),
    },
    {
      title: '大小',
      key: 'size',
      render: (val) => formatFileSize(val),
    },
    {
      title: '修改时间',
      key: 'last_modified',
      render: (val) => val || '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDownload(row)}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="下载"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => handleDeleteFile(row)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const measurementOptions = [
    { value: 'ecg', label: '心电数据' },
    { value: 'emg', label: '肌电数据' },
    { value: 'temperature', label: '温度数据' },
    { value: 'humidity', label: '湿度数据' },
    { value: 'pressure', label: '压力数据' },
  ];

  const bucketOptions = [
    { value: 'image', label: '图片' },
    { value: 'video', label: '视频' },
    { value: 'audio', label: '音频' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Device Selector */}
      <Card>
        <div className="flex items-center space-x-4">
          <Select
            label="选择设备"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            options={devices.map(d => ({
              value: d.dev_id.toString(),
              label: d.dev_name || `设备 ${d.dev_id}`,
            }))}
            placeholder="请选择设备"
            className="w-64"
          />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('timeseries')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'timeseries'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          时序数据
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'files'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          文件数据
        </button>
      </div>

      {/* Timeseries Tab */}
      {activeTab === 'timeseries' && (
        <div className="space-y-6">
          {/* Query Form */}
          <Card title="查询条件">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                label="数据类型"
                value={measurement}
                onChange={(e) => setMeasurement(e.target.value)}
                options={measurementOptions}
              />
              <Input
                label="开始时间"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                label="结束时间"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <div className="flex items-end">
                <Button onClick={fetchTimeseriesData} loading={loading} icon={Search}>
                  查询
                </Button>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">数据总量</p>
              <p className="text-3xl font-bold text-primary-600">{stats.total || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">异常数据</p>
              <p className="text-3xl font-bold text-red-600">{stats.abnormal || 0}</p>
            </div>
          </div>

          {/* Chart */}
          <Card title="数据趋势图">
            <div className="h-80">
              {timeseriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeseriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  暂无数据，请选择设备并查询
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          {/* Query Form */}
          <Card>
            <div className="flex items-center space-x-4">
              <Select
                label="文件类型"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                options={bucketOptions}
                className="w-40"
              />
              <div className="flex items-end">
                <Button onClick={fetchFileData} loading={loading} icon={RefreshCw}>
                  刷新
                </Button>
              </div>
            </div>
          </Card>

          {/* File Table */}
          <Table
            columns={fileColumns}
            data={files}
            loading={loading}
            pagination={filePagination}
            onPageChange={(page) => {
              setFilePagination(prev => ({ ...prev, page }));
              fetchFileData();
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Data;
