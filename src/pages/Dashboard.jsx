import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { deviceApi, warningApi } from '../api';
import { Cpu, Wifi, WifiOff, AlertTriangle, Activity, TrendingUp, Users, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/common/Card';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className={`text-sm mt-2 flex items-center ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp size={14} className="mr-1" />
            {trend > 0 ? '+' : ''}{trend}% 较昨日
          </p>
        )}
      </div>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={28} className="text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    abnormal: 0,
    type: 0,
  });
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, warningsRes] = await Promise.all([
        deviceApi.getStatistics(),
        warningApi.getList({ page: 1, page_size: 5 }),
      ]);

      if (statsRes.code === 200) {
        setStats(statsRes.data);
      }
      if (warningsRes.code === 200) {
        setWarnings(warningsRes.data.warning_lists || []);
      }
    } catch (error) {
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // Mock data for charts
  const lineChartData = [
    { name: '00:00', value: 30 },
    { name: '04:00', value: 45 },
    { name: '08:00', value: 78 },
    { name: '12:00', value: 95 },
    { name: '16:00', value: 82 },
    { name: '20:00', value: 65 },
    { name: '24:00', value: 40 },
  ];

  const pieChartData = [
    { name: '在线', value: stats.online, color: '#22c55e' },
    { name: '离线', value: stats.offline, color: '#94a3b8' },
    { name: '异常', value: stats.abnormal, color: '#ef4444' },
  ];

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { label: '活跃', color: 'bg-red-100 text-red-700' },
      resolved: { label: '已解决', color: 'bg-green-100 text-green-700' },
      ignored: { label: '已忽略', color: 'bg-gray-100 text-gray-700' },
    };
    const s = statusMap[status] || statusMap.active;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">仪表盘</h1>
          <p className="text-gray-600 mt-2">查看系统概览、设备状态和告警信息</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="设备总数"
            value={stats.total}
            icon={Database}
            color="bg-blue-500"
            trend={5}
          />
          <StatCard
            title="在线设备"
            value={stats.online}
            icon={Wifi}
            color="bg-green-500"
            trend={2}
          />
          <StatCard
            title="离线设备"
            value={stats.offline}
            icon={WifiOff}
            color="bg-gray-500"
            trend={-1}
          />
          <StatCard
            title="异常设备"
            value={stats.abnormal}
            icon={AlertTriangle}
            color="bg-red-500"
            trend={0}
          />
        </div>

        {/* Charts & Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Activity size={20} className="mr-2 text-primary-600" />
              数据流量趋势
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart & Warnings */}
          <div className="space-y-6 flex flex-col">
            {/* Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">设备状态分布</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                {pieChartData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Warnings */}
            <div className="bg-white rounded-xl shadow-sm p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">最新告警</h3>
                <span className="text-xs text-primary-600 cursor-pointer hover:underline">查看全部</span>
              </div>
              <div className="space-y-4">
                {warnings.length > 0 ? (
                  warnings.map((warning, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{warning.alert_message}</p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <span className="mr-2">{new Date(warning.alert_time || Date.now()).toLocaleTimeString()}</span>
                          {getStatusBadge(warning.alert_status === 0 ? 'active' : 'resolved')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>暂无告警信息</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
