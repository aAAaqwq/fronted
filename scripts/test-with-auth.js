#!/usr/bin/env node

/**
 * 带认证的API测试脚本
 * 使用真实登录信息测试设备状态更新
 */

const axios = require('axios');

const API_BASE_URL = 'http://120.46.56.244:12000';

console.log('🔍 带认证的设备状态更新测试...\n');

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

let authToken = null;

// 登录获取token
async function login() {
  console.log('🔐 正在登录...');
  
  try {
    const loginData = {
      email: 'admin@qq.com',
      password: 'aaqwq123'
    };
    
    const response = await api.post('/api/v1/users/login', loginData);
    
    if (response.data && response.data.code === 200) {
      authToken = response.data.data.token;
      console.log('✅ 登录成功');
      console.log(`📋 Token: ${authToken.substring(0, 20)}...`);
      
      // 设置认证头
      api.defaults.headers.Authorization = `Bearer ${authToken}`;
      
      return true;
    } else {
      console.log('❌ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ 登录异常:', error.message);
    if (error.response) {
      console.log('📊 错误详情:', error.response.data);
    }
    return false;
  }
}

// 获取设备列表
async function getDevices() {
  console.log('\n📱 获取设备列表...');
  
  try {
    const response = await api.get('/api/v1/devices', {
      params: { page: 1, page_size: 5 }
    });
    
    if (response.data && response.data.code === 200) {
      const devices = response.data.data.items || [];
      console.log(`✅ 获取到 ${devices.length} 个设备`);
      
      devices.forEach((device, index) => {
        console.log(`📋 设备 ${index + 1}:`);
        console.log(`   ID: ${device.dev_id}`);
        console.log(`   名称: ${device.dev_name || '未命名'}`);
        console.log(`   类型: ${device.dev_type || '未知'}`);
        console.log(`   状态: ${device.dev_status} (${device.dev_status === 0 ? '离线' : device.dev_status === 1 ? '在线' : '异常'})`);
      });
      
      return devices;
    } else {
      console.log('❌ 获取设备失败:', response.data);
      return [];
    }
  } catch (error) {
    console.log('❌ 获取设备异常:', error.message);
    if (error.response) {
      console.log('📊 错误详情:', error.response.data);
    }
    return [];
  }
}

// 测试设备状态更新
async function testStatusUpdate(device) {
  console.log(`\n🔄 测试设备状态更新: ${device.dev_name || device.dev_id}`);
  
  const originalStatus = device.dev_status;
  const newStatus = originalStatus === 1 ? 0 : 1;
  
  // 根据API文档使用正确的字段格式（小写下划线）
  const updateData = {
    dev_id: parseInt(device.dev_id),  // API要求integer类型
    dev_name: device.dev_name || `设备_${device.dev_id}`,
    dev_type: device.dev_type || 'temperature',
    dev_status: newStatus,
    model: device.model || '',
    version: device.version || '',
    sampling_rate: device.sampling_rate || 0,
    upload_interval: device.upload_interval || 0,
  };
  
  console.log('📋 更新数据:', JSON.stringify(updateData, null, 2));
  
  try {
    // 使用PUT /api/v1/devices 更新设备
    const response = await api.put('/api/v1/devices', updateData);
    
    console.log('📊 API响应:', response.data);
    
    if (response.data && (response.data.code === 200 || response.status === 200)) {
      console.log(`✅ 状态更新成功: ${originalStatus} → ${newStatus}`);
      
      // 验证更新是否生效
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedDevices = await getDevices();
      const updatedDevice = updatedDevices.find(d => d.dev_id == device.dev_id);
      
      if (updatedDevice && updatedDevice.dev_status == newStatus) {
        console.log('✅ 验证成功: 状态已正确更新');
        
        // 恢复原状态
        const restoreData = { ...updateData, dev_status: originalStatus };
        await api.put('/api/v1/devices', restoreData);
        console.log('🔄 状态已恢复');
        
        return true;
      } else {
        console.log('❌ 验证失败: 状态未更新或更新错误');
        return false;
      }
    } else {
      console.log('❌ 状态更新失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ 状态更新异常:', error.message);
    if (error.response) {
      console.log('📊 错误状态:', error.response.status);
      console.log('📋 错误详情:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// 生成测试报告
function generateReport(loginSuccess, devices, updateResults) {
  console.log('\n📊 测试报告');
  console.log('='.repeat(50));
  
  console.log(`登录状态: ${loginSuccess ? '✅ 成功' : '❌ 失败'}`);
  console.log(`设备获取: ${devices.length > 0 ? '✅ 成功' : '❌ 失败'} (${devices.length}个设备)`);
  
  if (updateResults.length > 0) {
    const successCount = updateResults.filter(Boolean).length;
    console.log(`状态更新: ${successCount}/${updateResults.length} 成功`);
    
    if (successCount === updateResults.length) {
      console.log('🎉 所有测试通过！设备状态更新功能正常');
    } else if (successCount > 0) {
      console.log('⚠️  部分测试通过，可能存在特定设备的问题');
    } else {
      console.log('❌ 所有状态更新测试失败');
    }
  } else {
    console.log('状态更新: ⚠️  无设备可测试');
  }
  
  console.log(`\n测试完成时间: ${new Date().toLocaleString()}`);
  
  return loginSuccess && devices.length > 0 && updateResults.some(Boolean);
}

async function main() {
  try {
    // 1. 登录
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.log('登录失败，无法继续测试');
      process.exit(1);
    }
    
    // 2. 获取设备列表
    const devices = await getDevices();
    if (devices.length === 0) {
      console.log('没有设备可测试');
      process.exit(1);
    }
    
    // 3. 测试状态更新（最多测试3个设备）
    const updateResults = [];
    const testDevices = devices.slice(0, 3);
    
    for (const device of testDevices) {
      const result = await testStatusUpdate(device);
      updateResults.push(result);
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 4. 生成报告
    const success = generateReport(loginSuccess, devices, updateResults);
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('测试执行失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();
