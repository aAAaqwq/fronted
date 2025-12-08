import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/common/Toast';
import { dataApi, deviceApi } from '../api';
import { Upload, FileText, Activity, Thermometer, Heart, Zap, Send, X, CheckCircle, BarChart3, TrendingUp, Download, Eye, RefreshCw } from 'lucide-react';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import Input from '../components/common/Input';
import Card from '../components/common/Card';

const DataUpload = () => {
  const toast = useToast();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadType, setUploadType] = useState('timeseries'); // timeseries, file, or visualize
  const [selectedDevice, setSelectedDevice] = useState('');
  const [measurementType, setMeasurementType] = useState('emg');
  
  // CSV文件上传
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const csvInputRef = useRef(null);
  
  // 文件上传
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
  // 数据可视化
  const [timeseriesData, setTimeseriesData] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [dataStats, setDataStats] = useState(null);
  
  // 上传历史
  const [uploadHistory, setUploadHistory] = useState([]);

  useEffect(() => {
    fetchDevices();
  }, []);

  // 当设备或测量类型改变时，如果在可视化模式，自动查询数据
  useEffect(() => {
    if (uploadType === 'visualize' && selectedDevice) {
      queryTimeseriesData();
    }
  }, [selectedDevice, measurementType, uploadType]);

  const fetchDevices = async () => {
    try {
      const res = await deviceApi.getList({ page: 1, page_size: 100 });
      if (res.code === 200 && res.data?.items) {
        setDevices(res.data.items);
        if (res.data.items.length > 0) {
          setSelectedDevice(res.data.items[0].dev_id.toString());
        }
      }
    } catch (error) {
      toast.error('获取设备列表失败');
    }
  };

  const measurementTypes = [
    { value: 'ecg', label: '心电图 (ECG)', icon: Heart },
    { value: 'emg', label: '肌电图 (EMG)', icon: Activity },
    { value: 'temperature', label: '体温', icon: Thermometer },
    { value: 'spo2', label: '血氧饱和度', icon: Heart },
    { value: 'pressure', label: '压力', icon: Zap },
    { value: 'motion', label: '运动数据', icon: Activity },
  ];

  // 解析CSV文件
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 2) {
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        data.push(row);
      }
    }
    return data;
  };

  // 处理CSV文件选择
  const handleCSVSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast.error('请选择CSV文件');
      return;
    }
    
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const data = parseCSV(text);
      setCsvPreview(data.slice(0, 10)); // 预览前10行
      toast.success(`已解析 ${data.length} 条数据`);
    };
    reader.readAsText(file);
  };

  // 批量上传CSV时序数据
  const handleCSVUpload = async () => {
    if (!selectedDevice) {
      toast.error('请选择设备');
      return;
    }
    if (!csvFile) {
      toast.error('请选择CSV文件');
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const data = parseCSV(text);
        
        if (data.length === 0) {
          toast.error('CSV文件为空或格式不正确');
          setLoading(false);
          return;
        }

        // 构建批量上传的数据点
        const points = data.map((row, index) => {
          // 支持多种CSV格式
          const timestamp = row.timestamp || row.time || row.t || (Math.floor(Date.now() / 1000) + index);
          const value = row.value || row.v || row.data || row[Object.keys(row).find(k => !['timestamp', 'time', 't', 'quality', 'quality_score'].includes(k))];
          const quality = row.quality || row.quality_score || '95';
          
          // 支持多通道数据
          const fields = {};
          Object.keys(row).forEach(key => {
            if (!['timestamp', 'time', 't', 'quality', 'quality_score'].includes(key)) {
              const numVal = parseFloat(row[key]);
              if (!isNaN(numVal)) {
                fields[key] = numVal;
              }
            }
          });
          
          // 如果没有解析到字段，使用value
          if (Object.keys(fields).length === 0 && value) {
            fields.value = parseFloat(value);
          }

          return {
            timestamp: parseInt(timestamp),
            measurement: measurementType,
            tags: { quality_score: quality.toString() },
            fileds: fields
          };
        }).filter(p => p.timestamp && Object.keys(p.fileds).length > 0);

        if (points.length === 0) {
          toast.error('没有有效的数据点，请检查CSV格式');
          setLoading(false);
          return;
        }

        // 分批上传（每批最多1000条）
        const batchSize = 1000;
        let successCount = 0;
        
        for (let i = 0; i < points.length; i += batchSize) {
          const batch = points.slice(i, i + batchSize);
          const avgQuality = batch.reduce((sum, p) => sum + parseFloat(p.tags.quality_score || 95), 0) / batch.length;
          
          const payload = {
            series_data: { points: batch },
            metadata: {
              dev_id: parseInt(selectedDevice),
              data_type: 'time_series',
              quality_score: avgQuality.toFixed(1)
            }
          };

          try {
            const res = await dataApi.upload(payload);
            if (res.code === 200 || res.code === 201) {
              successCount += batch.length;
            }
          } catch (err) {
            console.error('Batch upload error:', err);
          }
        }

        if (successCount > 0) {
          toast.success(`成功上传 ${successCount} 条时序数据`);
          setUploadHistory(prev => [{
            id: Date.now(),
            type: 'timeseries',
            device: devices.find(d => d.dev_id.toString() === selectedDevice)?.dev_name,
            measurement: measurementType,
            points: successCount,
            time: new Date().toLocaleString()
          }, ...prev.slice(0, 9)]);
          setCsvFile(null);
          setCsvPreview([]);
          if (csvInputRef.current) csvInputRef.current.value = '';
        } else {
          toast.error('上传失败');
        }
        setLoading(false);
      };
      reader.readAsText(csvFile);
    } catch (error) {
      toast.error('上传失败: ' + (error.message || '未知错误'));
      setLoading(false);
    }
  };

  // 查询时序数据
  const queryTimeseriesData = async () => {
    if (!selectedDevice) return;
    
    setQueryLoading(true);
    try {
      // 查询最近24小时的数据
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - 86400 * 7; // 7天
      
      const res = await dataApi.queryTimeseries({
        dev_id: parseInt(selectedDevice),
        start_time: startTime,
        end_time: endTime,
        measurement: measurementType,
        limit_points: 500
      });
      
      if (res.code === 200 && res.data?.points) {
        setTimeseriesData(res.data.points);
      } else {
        setTimeseriesData([]);
      }

      // 获取统计信息
      const statsRes = await dataApi.getStatistic({
        dev_id: selectedDevice,
        measurement: measurementType
      });
      if (statsRes.code === 200 && statsRes.data) {
        setDataStats(statsRes.data);
      }
    } catch (error) {
      console.error('Query error:', error);
      setTimeseriesData([]);
    } finally {
      setQueryLoading(false);
    }
  };

  // 生成示例CSV
  const downloadSampleCSV = () => {
    const now = Math.floor(Date.now() / 1000);
    let csvContent = '';
    
    if (measurementType === 'emg') {
      csvContent = 'timestamp,ch1,ch2,ch3,ch4,ch5,quality_score\n';
      for (let i = 0; i < 100; i++) {
        const values = Array(5).fill(0).map(() => (Math.random() * 200).toFixed(1));
        csvContent += `${now + i},${values.join(',')},${(90 + Math.random() * 10).toFixed(0)}\n`;
      }
    } else if (measurementType === 'ecg') {
      csvContent = 'timestamp,value,quality_score\n';
      for (let i = 0; i < 100; i++) {
        csvContent += `${now + i},${(Math.random() * 2 - 1).toFixed(3)},${(90 + Math.random() * 10).toFixed(0)}\n`;
      }
    } else {
      csvContent = 'timestamp,value,quality_score\n';
      for (let i = 0; i < 100; i++) {
        csvContent += `${now + i},${(Math.random() * 100).toFixed(2)},${(90 + Math.random() * 10).toFixed(0)}\n`;
      }
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${measurementType}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('示例CSV已下载');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // 预览图片
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedDevice) {
      toast.error('请选择设备');
      return;
    }
    if (!selectedFile) {
      toast.error('请选择文件');
      return;
    }

    setLoading(true);
    try {
      // 确定文件类型对应的bucket
      let bucketName = 'file';
      let contentType = selectedFile.type || 'application/octet-stream';
      if (selectedFile.type.startsWith('image/')) bucketName = 'image';
      else if (selectedFile.type.startsWith('video/')) bucketName = 'video';
      else if (selectedFile.type.startsWith('audio/')) bucketName = 'audio';

      // 步骤1: 获取预签名URL
      const presignedRes = await dataApi.getPresignedUrl({
        dev_id: selectedDevice,
        filename: selectedFile.name,
        bucket_name: bucketName,
        content_type: contentType
      });

      if (presignedRes.code !== 200 || !presignedRes.data) {
        toast.error(presignedRes.message || '获取上传URL失败');
        setLoading(false);
        return;
      }

      const { upload_url, upload_id } = presignedRes.data;

      // 步骤2: 直接上传文件到MinIO (使用预签名URL)
      try {
        const uploadResponse = await fetch(upload_url, {
          method: 'PUT',
          body: selectedFile,
          headers: {
            'Content-Type': contentType
          }
        });

        if (!uploadResponse.ok) {
          toast.error('文件上传到存储服务失败');
          setLoading(false);
          return;
        }
      } catch (uploadErr) {
        toast.error('文件上传失败: ' + (uploadErr.message || '网络错误'));
        setLoading(false);
        return;
      }

      // 步骤3: 确认上传并创建元数据
      const confirmPayload = {
        file_data: {
          upload_id: upload_id,
          bucket_name: bucketName
        },
        metadata: {
          dev_id: parseInt(selectedDevice),
          data_type: 'file_data',
          quality_score: '100'
        }
      };

      const confirmRes = await dataApi.upload(confirmPayload);
      if (confirmRes.code === 200 || confirmRes.code === 201) {
        toast.success('文件上传成功');
        setUploadHistory(prev => [{
          id: Date.now(),
          type: 'file',
          device: devices.find(d => d.dev_id.toString() === selectedDevice)?.dev_name,
          filename: selectedFile.name,
          size: (selectedFile.size / 1024).toFixed(2) + ' KB',
          time: new Date().toLocaleString()
        }, ...prev.slice(0, 9)]);
        setSelectedFile(null);
        setFilePreview(null);
      } else {
        toast.error(confirmRes.message || '确认上传失败');
      }
    } catch (error) {
      toast.error('上传失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 简单的折线图组件
  const SimpleLineChart = ({ data, title }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
            <p>暂无数据</p>
          </div>
        </div>
      );
    }

    // 获取数据的值
    const values = data.map(p => {
      const fields = p.fileds || p.fields || {};
      return fields.value || fields.ch1 || Object.values(fields)[0] || 0;
    });
    const timestamps = data.map(p => p.timestamp);
    
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    
    // 生成SVG路径
    const width = 600;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = values.map((v, i) => {
      const x = padding + (i / (values.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((v - minVal) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]">
          {/* 背景网格 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line
                x1={padding}
                y1={padding + chartHeight * ratio}
                x2={width - padding}
                y2={padding + chartHeight * ratio}
                stroke="#e5e7eb"
                strokeDasharray="4"
              />
              <text
                x={padding - 5}
                y={padding + chartHeight * ratio + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {(maxVal - range * ratio).toFixed(1)}
              </text>
            </g>
          ))}
          
          {/* 数据线 */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={points}
          />
          
          {/* 数据点 */}
          {values.slice(0, 50).map((v, i) => {
            const x = padding + (i / (values.length - 1 || 1)) * chartWidth;
            const y = padding + chartHeight - ((v - minVal) / range) * chartHeight;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
                className="hover:r-5 transition-all"
              >
                <title>{`时间: ${new Date(timestamps[i] * 1000).toLocaleString()}\n值: ${v.toFixed(2)}`}</title>
              </circle>
            );
          })}
          
          {/* 标题 */}
          <text x={width / 2} y={20} textAnchor="middle" className="text-sm font-medium fill-gray-700">
            {title} ({values.length} 个数据点)
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 功能选择 */}
      <div className="flex space-x-4">
        <button
          onClick={() => setUploadType('timeseries')}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            uploadType === 'timeseries'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Activity className={`mx-auto mb-2 ${uploadType === 'timeseries' ? 'text-primary-600' : 'text-gray-400'}`} size={32} />
          <p className={`font-medium ${uploadType === 'timeseries' ? 'text-primary-700' : 'text-gray-600'}`}>
            批量上传时序数据
          </p>
          <p className="text-sm text-gray-500 mt-1">通过CSV文件批量导入</p>
        </button>
        <button
          onClick={() => setUploadType('file')}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            uploadType === 'file'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FileText className={`mx-auto mb-2 ${uploadType === 'file' ? 'text-primary-600' : 'text-gray-400'}`} size={32} />
          <p className={`font-medium ${uploadType === 'file' ? 'text-primary-700' : 'text-gray-600'}`}>
            文件数据上传
          </p>
          <p className="text-sm text-gray-500 mt-1">上传图片、视频、音频等</p>
        </button>
        <button
          onClick={() => setUploadType('visualize')}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            uploadType === 'visualize'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <BarChart3 className={`mx-auto mb-2 ${uploadType === 'visualize' ? 'text-primary-600' : 'text-gray-400'}`} size={32} />
          <p className={`font-medium ${uploadType === 'visualize' ? 'text-primary-700' : 'text-gray-600'}`}>
            数据可视化
          </p>
          <p className="text-sm text-gray-500 mt-1">查看已上传的时序数据</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要区域 */}
        <div className="lg:col-span-2">
          <Card title={
            uploadType === 'timeseries' ? '批量上传时序数据 (CSV)' : 
            uploadType === 'file' ? '文件上传' : '时序数据可视化'
          }>
            {/* 设备选择 */}
            <div className="mb-6">
              <Select
                label="选择设备"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                options={devices.map(d => ({ value: d.dev_id.toString(), label: `${d.dev_name} (${d.dev_type})` }))}
                placeholder="请选择设备"
              />
            </div>

            {uploadType === 'timeseries' ? (
              <>
                {/* 测量类型选择 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">测量类型</label>
                  <div className="grid grid-cols-3 gap-2">
                    {measurementTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setMeasurementType(type.value)}
                          className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                            measurementType === type.value
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon size={20} className={measurementType === type.value ? 'text-primary-600' : 'text-gray-400'} />
                          <span className={`text-xs mt-1 ${measurementType === type.value ? 'text-primary-700' : 'text-gray-600'}`}>
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CSV上传区域 */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">上传CSV文件</label>
                    <Button size="sm" variant="ghost" onClick={downloadSampleCSV} icon={<Download size={14} />}>
                      下载示例CSV
                    </Button>
                  </div>
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      csvFile ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      ref={csvInputRef}
                      type="file"
                      onChange={handleCSVSelect}
                      className="hidden"
                      id="csv-upload"
                      accept=".csv"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      {csvFile ? (
                        <div>
                          <FileText size={40} className="mx-auto mb-2 text-primary-500" />
                          <p className="text-primary-700 font-medium">{csvFile.name}</p>
                          <p className="text-sm text-gray-500">{csvPreview.length > 0 ? `已解析 ${csvPreview.length}+ 条数据` : '解析中...'}</p>
                        </div>
                      ) : (
                        <div>
                          <Upload size={40} className="mx-auto mb-2 text-gray-400" />
                          <p className="text-gray-600">点击选择CSV文件</p>
                          <p className="text-sm text-gray-400 mt-1">支持格式: timestamp, value, quality_score</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* CSV预览 */}
                {csvPreview.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">数据预览 (前10行)</label>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(csvPreview[0]).map(key => (
                              <th key={key} className="px-3 py-2 text-left font-medium text-gray-600">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((row, i) => (
                            <tr key={i} className="border-t">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-3 py-2 text-gray-800">{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCSVUpload}
                  loading={loading}
                  disabled={!csvFile}
                  className="w-full"
                  icon={<Send size={18} />}
                >
                  批量上传时序数据
                </Button>
              </>
            ) : uploadType === 'visualize' ? (
              <>
                {/* 数据可视化 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">测量类型</label>
                  <div className="grid grid-cols-3 gap-2">
                    {measurementTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setMeasurementType(type.value)}
                          className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                            measurementType === type.value
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon size={20} className={measurementType === type.value ? 'text-primary-600' : 'text-gray-400'} />
                          <span className={`text-xs mt-1 ${measurementType === type.value ? 'text-primary-700' : 'text-gray-600'}`}>
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 统计信息 */}
                {dataStats && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600">数据总量</p>
                      <p className="text-2xl font-bold text-blue-700">{dataStats.total || 0}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-600">异常数据</p>
                      <p className="text-2xl font-bold text-red-700">{dataStats.abnormal || 0}</p>
                    </div>
                  </div>
                )}

                {/* 图表 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">时序数据图表 (最近7天)</label>
                    <Button size="sm" variant="ghost" onClick={queryTimeseriesData} loading={queryLoading} icon={<RefreshCw size={14} />}>
                      刷新
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 bg-white">
                    {queryLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                      </div>
                    ) : (
                      <SimpleLineChart 
                        data={timeseriesData} 
                        title={measurementTypes.find(t => t.value === measurementType)?.label || measurementType}
                      />
                    )}
                  </div>
                </div>

                {/* 数据表格 */}
                {timeseriesData.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">数据详情 (最近50条)</label>
                    <div className="overflow-x-auto border rounded-lg max-h-64">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">时间</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">数值</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">质量分</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timeseriesData.slice(0, 50).map((point, i) => {
                            const fields = point.fileds || point.fields || {};
                            const value = fields.value || fields.ch1 || Object.values(fields)[0] || '-';
                            return (
                              <tr key={i} className="border-t hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-800">
                                  {new Date(point.timestamp * 1000).toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-gray-800">
                                  {typeof value === 'number' ? value.toFixed(2) : value}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    parseFloat(point.tags?.quality_score || 0) >= 80 
                                      ? 'bg-green-100 text-green-700' 
                                      : parseFloat(point.tags?.quality_score || 0) >= 50
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {point.tags?.quality_score || '-'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* 文件上传区域 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择文件</label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      selectedFile ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {selectedFile ? (
                        <div>
                          {filePreview ? (
                            <img src={filePreview} alt="预览" className="max-h-32 mx-auto mb-2 rounded" />
                          ) : (
                            <FileText size={48} className="mx-auto mb-2 text-primary-500" />
                          )}
                          <p className="text-primary-700 font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <Upload size={48} className="mx-auto mb-2 text-gray-400" />
                          <p className="text-gray-600">点击或拖拽文件到此处</p>
                          <p className="text-sm text-gray-400 mt-1">支持图片、视频、音频、文档等格式</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleFileUpload}
                  loading={loading}
                  disabled={!selectedFile}
                  className="w-full"
                  icon={<Upload size={18} />}
                >
                  上传文件
                </Button>
              </>
            )}
          </Card>
        </div>

        {/* 上传历史 */}
        <div>
          <Card title="上传历史">
            {uploadHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Upload size={32} className="mx-auto mb-2 opacity-50" />
                <p>暂无上传记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadHistory.map(record => (
                  <div key={record.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        record.type === 'timeseries' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {record.type === 'timeseries' ? '时序数据' : '文件'}
                      </span>
                      <CheckCircle size={14} className="text-green-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-800">{record.device}</p>
                    <p className="text-xs text-gray-500">
                      {record.type === 'timeseries' 
                        ? `${record.measurement} - ${record.points}个数据点`
                        : `${record.filename} (${record.size})`
                      }
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{record.time}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
