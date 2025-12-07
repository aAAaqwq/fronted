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
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          欢迎回来，{user?.username || user?.email}！
        </h2>
        <p className="text-primary-100">
          {isAdmin() ? '您是管理员，可以管理所有设备和用户。' : '查看您的设备状态和数据统计。'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="设备总数"
          value={stats.total}
          icon={Cpu}
          color="bg-primary-500"
        />
        <StatCard
          title="在线设备"
          value={stats.online}
          icon={Wifi}
          color="bg-green-500"
        />
        <StatCard
          title="离线设备"
          value={stats.offline}
          icon={WifiOff}
          color="bg-gray-500"
        />
        <StatCard
          title="异常设备"
          value={stats.abnormal}
          icon={AlertTriangle}
          color="bg-red-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <Card title="数据上传趋势" className="lg:col-span-2">
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
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie Chart */}
        <Card title="设备状态分布">
          <div className="h-80 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="70%">
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
            <div className="flex justify-center space-x-6 mt-4">
              {pieChartData.map((item) => (
                <div key={item.name} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Warnings */}
      <Card
        title="最近告警"
        extra={
          <a href="/warnings" className="text-sm text-primary-600 hover:text-primary-700">
            查看全部
          </a>
        }
      >
        {warnings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>暂无告警信息</p>
          </div>
        ) : (
          <div className="space-y-4">
            {warnings.map((warning) => (
              <div
                key={warning.alert_id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    warning.alert_status === 'active' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <AlertTriangle
                      size={20}
                      className={warning.alert_status === 'active' ? 'text-red-600' : 'text-gray-500'}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{warning.alert_message || '设备异常'}</p>
                    <p className="text-sm text-gray-500">
                      设备ID: {warning.dev_id} · {warning.triggered_at}
                    </p>
                  </div>
                </div>
                {getStatusBadge(warning.alert_status)}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
