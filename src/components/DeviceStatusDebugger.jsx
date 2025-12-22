import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './common/Toast';
import { deviceApi } from '../api';
import { RefreshCw, Info, AlertCircle } from 'lucide-react';
import Button from './common/Button';
import Modal from './common/Modal';

const DeviceStatusDebugger = ({ isOpen, onClose, device, onStatusUpdate }) => {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  const fetchDeviceStatus = async () => {
    if (!device) return;
    
    try {
      setLoading(true);
      console.log('[状态调试] 获取设备状态:', device.dev_id);
      
      // 获取设备详细信息
      const res = await deviceApi.getList({ 
        dev_id: device.dev_id,
        page: 1, 
        page_size: 1 
      });
      
      if (res.code === 200 && res.data.items?.length > 0) {
        const deviceInfo = res.data.items[0];
        const info = {
          timestamp: new Date().toLocaleString(),
          user: {
            uid: user?.uid,
            role: user?.role,
            isAdmin: isAdmin()
          },
          device: {
            dev_id: deviceInfo.dev_id,
            dev_name: deviceInfo.dev_name,
            dev_status: deviceInfo.dev_status,
            dev_type: deviceInfo.dev_type,
            model: deviceInfo.model,
            version: deviceInfo.version,
            create_at: deviceInfo.create_at,
            update_at: deviceInfo.update_at
          },
          statusText: deviceInfo.dev_status === 0 ? '离线' : 
                     deviceInfo.dev_status === 1 ? '在线' : '异常'
        };
        
        setDebugInfo(info);
        console.log('[状态调试] 设备信息:', info);
        
        if (onStatusUpdate) {
          onStatusUpdate(deviceInfo);
        }
      } else {
        toast.error('获取设备状态失败');
      }
    } catch (error) {
      console.error('[状态调试] 获取失败:', error);
      toast.error('获取设备状态失败');
    } finally {
      setLoading(false);
    }
  };

  const forceRefreshStatus = async () => {
    await fetchDeviceStatus();
    toast.success('状态已刷新');
  };

  React.useEffect(() => {
    if (isOpen && device) {
      fetchDeviceStatus();
    }
  }, [isOpen, device]);

  if (!device) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`设备状态调试 - ${device.dev_name || device.dev_id}`}
    >
      <div className="space-y-4">
        {/* 操作按钮 */}
        <div className="flex items-center space-x-3 pb-4 border-b">
          <Button
            onClick={forceRefreshStatus}
            loading={loading}
            icon={RefreshCw}
            variant="secondary"
          >
            刷新状态
          </Button>
          <div className="text-sm text-gray-500">
            实时获取数据库中的设备状态
          </div>
        </div>

        {/* 调试信息 */}
        {debugInfo && (
          <div className="space-y-4">
            {/* 用户信息 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <Info size={16} className="mr-2" />
                当前用户信息
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>用户ID: {debugInfo.user.uid}</p>
                <p>角色: {debugInfo.user.role === 1 || debugInfo.user.role === 'admin' ? '管理员' : '普通用户'}</p>
                <p>管理员权限: {debugInfo.user.isAdmin ? '是' : '否'}</p>
                <p>查询时间: {debugInfo.timestamp}</p>
              </div>
            </div>

            {/* 设备状态信息 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <AlertCircle size={16} className="mr-2" />
                设备状态信息
              </h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p>设备ID: <span className="font-mono">{debugInfo.device.dev_id}</span></p>
                <p>设备名称: {debugInfo.device.dev_name || '-'}</p>
                <p>设备类型: {debugInfo.device.dev_type || '-'}</p>
                <p>型号: {debugInfo.device.model || '-'}</p>
                <p>版本: {debugInfo.device.version || '-'}</p>
                <p>创建时间: {debugInfo.device.create_at || '-'}</p>
                <p>更新时间: {debugInfo.device.update_at || '-'}</p>
              </div>
            </div>

            {/* 状态详情 */}
            <div className={`p-4 rounded-lg ${
              debugInfo.device.dev_status === 1 ? 'bg-green-50' : 
              debugInfo.device.dev_status === 2 ? 'bg-red-50' : 'bg-gray-50'
            }`}>
              <h4 className={`font-medium mb-2 ${
                debugInfo.device.dev_status === 1 ? 'text-green-900' : 
                debugInfo.device.dev_status === 2 ? 'text-red-900' : 'text-gray-900'
              }`}>
                当前状态
              </h4>
              <div className={`text-sm ${
                debugInfo.device.dev_status === 1 ? 'text-green-800' : 
                debugInfo.device.dev_status === 2 ? 'text-red-800' : 'text-gray-700'
              }`}>
                <p>状态码: {debugInfo.device.dev_status}</p>
                <p>状态描述: {debugInfo.statusText}</p>
                <p className="mt-2 text-xs">
                  说明: 0=离线, 1=在线, 2=异常
                </p>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">调试提示</h4>
              <div className="text-sm text-yellow-800 space-y-1">
                <p>• 如果管理员和普通用户看到的状态不一致，可能是权限或缓存问题</p>
                <p>• 设备创建时默认状态为离线(0)</p>
                <p>• 只有管理员可以修改设备状态</p>
                <p>• 状态变更会实时同步到数据库</p>
              </div>
            </div>
          </div>
        )}

        {/* 关闭按钮 */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeviceStatusDebugger;
