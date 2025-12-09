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
  const [measurement, setMeasurement] = useState('ecg'); // 默认心电数据
  const [startTime, setStartTime] = useState(() => {
    // 默认开始时间：7天前
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 16); // 格式化为 datetime-local 格式
  });
  const [endTime, setEndTime] = useState(''); // 默认结束时间为空（至今）
  
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
      // API使用秒级时间戳
      const nowSec = Math.floor(Date.now() / 1000);
      const res = await dataApi.queryTimeseries({
        dev_id: selectedDevice,
        start_time: startTime ? Math.floor(new Date(startTime).getTime() / 1000) : nowSec - 7 * 24 * 60 * 60, // 默认7天
        end_time: endTime ? Math.floor(new Date(endTime).getTime() / 1000) : nowSec,
        measurement: measurement,
        limit_points: 100,
      });
      if (res.code === 200) {
        const points = res.data.points || [];
        const chartData = points.map((p, index) => ({
          // 后端返回秒级时间戳，需要转换为毫秒
          time: new Date(p.timestamp * 1000).toLocaleTimeString(),
          value: p.fields?.value || p.fields?.ch1 || 0,
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
        dev_id: selectedDevice,
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
        dev_id: selectedDevice,
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

  const handleDeleteTimeseries = async () => {
    if (!selectedDevice) {
      toast.warning('请选择设备');
      return;
    }
    if (!window.confirm('确定要删除该设备的时序数据吗？这将删除指定时间范围内的所有数据！')) return;
    try {
      const res = await dataApi.deleteTimeseries({
        dev_id: selectedDevice,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
      if (res.code === 200) {
        toast.success('时序数据删除成功');
        fetchTimeseriesData();
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
      width: '160px',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDownload(row)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Download size={12} className="mr-1" />
            下载
          </button>
          <button
            onClick={() => handleDeleteFile(row)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
          >
            <Trash2 size={12} className="mr-1" />
            删除
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">数据管理</h1>
          <p className="text-gray-600 mt-2">管理和分析传感器数据，支持时序数据和文件数据</p>
        </div>

        {/* Device Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6">
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
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('timeseries')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'timeseries'
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-black/5'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            时序数据
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'files'
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-black/5'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            文件数据
          </button>
        </div>

        {/* Timeseries Tab */}
        {activeTab === 'timeseries' && (
          <div className="space-y-6">
            {/* Query Form */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">查询条件</h3>
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
                  placeholder="留空表示至今"
                />
                <div className="flex items-end space-x-2">
                  <Button onClick={fetchTimeseriesData} loading={loading} icon={Search}>
                    查询
                  </Button>
                  <Button onClick={handleDeleteTimeseries} variant="outline" icon={Trash2}>
                    删除数据
                  </Button>
                </div>
              </div>
            </div>

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
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
        </div>
      )}
      </div>
    </div>
  );
};

export default Data;
