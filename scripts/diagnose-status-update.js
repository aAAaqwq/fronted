#!/usr/bin/env node

/**
 * 设备状态更新诊断脚本
 * 详细测试前端数据和后端数据库更新
 */

const axios = require('axios');

const API_BASE_URL = 'http://120.46.56.244:12000';

console.log('🔍 设备状态更新问题诊断...\n');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

let authToken = null;

// 登录
async function login() {
  try {
    const response = await api.post('/api/v1/users/login', {
      email: 'admin@qq.com',
      password: 'aaqwq123'
    });
    
    if (response.data && response.data.code === 200) {
      authToken = response.data.data.token;
      api.defaults.headers.Authorization = `Bearer ${authToken}`;
      console.log('✅ 登录成功\n');
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ 登录失败:', error.message);
    return false;
  }
}

// 获取单个设备详情
async function getDeviceDetail(devId) {
  try {
    const response = await api.get('/api/v1/devices', {
      params: { page: 1, page_size: 100 }
    });
    
    if (response.data && response.data.code === 200) {
      const device = response.data.data.items?.find(d => d.dev_id == devId);
      return device;
    }
    return null;
  } catch (error) {
    console.error('获取设备详情失败:', error.message);
    return null;
  }
}

// 详细诊断设备状态更新
async function diagnoseStatusUpdate() {
  console.log('📱 获取设备列表...');
  
  // 1. 获取设备列表
  const devicesRes = await api.get('/api/v1/devices', {
    params: { page: 1, page_size: 5 }
  });
  
  if (!devicesRes.data || devicesRes.data.code !== 200) {
    console.log('❌ 获取设备列表失败');
    return false;
  }
  
  const devices = devicesRes.data.data.items || [];
  if (devices.length === 0) {
    console.log('❌ 没有设备可测试');
    return false;
  }
  
  // 选择第一个设备进行测试
  const testDevice = devices[0];
  console.log(`\n🎯 选择测试设备: ${testDevice.dev_name} (ID: ${testDevice.dev_id})`);
  console.log(`📊 当前状态: ${testDevice.dev_status} (${testDevice.dev_status === 0 ? '离线' : testDevice.dev_status === 1 ? '在线' : '异常'})`);
  
  const originalStatus = testDevice.dev_status;
  const newStatus = originalStatus === 1 ? 0 : 1;
  
  console.log(`\n🔄 准备将状态从 ${originalStatus} 更改为 ${newStatus}`);
  
  // 2. 发送状态更新请求
  const updateData = {
    dev_id: parseInt(testDevice.dev_id),
    dev_name: testDevice.dev_name,
    dev_type: testDevice.dev_type,
    dev_status: newStatus,
    model: testDevice.model || '',
    version: testDevice.version || '',
    sampling_rate: testDevice.sampling_rate || 0,
    upload_interval: testDevice.upload_interval || 0,
  };
  
  console.log('\n📤 发送更新请求:');
  console.log(JSON.stringify(updateData, null, 2));
  
  try {
    const updateRes = await api.put('/api/v1/devices', updateData);
    console.log('\n📥 API响应:');
    console.log(JSON.stringify(updateRes.data, null, 2));
    
    if (updateRes.data.code === 200) {
      console.log('\n✅ API调用成功');
      
      // 3. 立即检查返回的数据
      const returnedDevice = updateRes.data.data;
      console.log(`\n🔍 API返回的设备状态: ${returnedDevice.dev_status}`);
      
      if (returnedDevice.dev_status === newStatus) {
        console.log('✅ API返回数据正确');
      } else {
        console.log('❌ API返回数据错误 - 后端可能没有真正更新');
      }
      
      // 4. 多次验证数据库状态
      console.log('\n🔄 验证数据库状态更新...');
      
      for (let i = 0; i < 5; i++) {
        const delay = (i + 1) * 1000; // 1s, 2s, 3s, 4s, 5s
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`\n📊 第${i + 1}次验证 (${delay}ms后):`);
        
        const currentDevice = await getDeviceDetail(testDevice.dev_id);
        if (currentDevice) {
          console.log(`   数据库状态: ${currentDevice.dev_status}`);
          console.log(`   期望状态: ${newStatus}`);
          console.log(`   状态匹配: ${currentDevice.dev_status === newStatus ? '✅' : '❌'}`);
          
          if (currentDevice.dev_status === newStatus) {
            console.log(`\n🎉 数据库状态在第${i + 1}次验证时同步成功！`);
            
            // 恢复原状态
            console.log('\n🔄 恢复原状态...');
            const restoreData = { ...updateData, dev_status: originalStatus };
            await api.put('/api/v1/devices', restoreData);
            
            return true;
          }
        } else {
          console.log('   ❌ 获取设备详情失败');
        }
      }
      
      console.log('\n❌ 数据库状态始终未同步');
      return false;
      
    } else {
      console.log('\n❌ API调用失败:', updateRes.data.message);
      return false;
    }
    
  } catch (error) {
    console.log('\n❌ 更新请求失败:', error.message);
    if (error.response) {
      console.log('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// 生成诊断报告
function generateDiagnosisReport(success) {
  console.log('\n📊 诊断报告');
  console.log('='.repeat(60));
  
  if (success) {
    console.log('🎉 状态更新功能正常');
    console.log('✅ 前端数据格式正确');
    console.log('✅ 后端API处理正常');
    console.log('✅ 数据库更新成功');
    console.log('');
    console.log('💡 如果前端页面仍有问题，可能是:');
    console.log('   1. 前端刷新时机问题');
    console.log('   2. React状态更新问题');
    console.log('   3. 缓存问题');
  } else {
    console.log('❌ 状态更新存在问题');
    console.log('');
    console.log('🔍 可能的问题:');
    console.log('   1. 后端API逻辑错误 - API返回成功但数据库未更新');
    console.log('   2. 数据库事务问题 - 更新未提交');
    console.log('   3. 数据库连接问题 - 写入失败');
    console.log('   4. 后端缓存问题 - 读取的是缓存数据');
    console.log('   5. 数据库约束问题 - 更新被拒绝');
    console.log('');
    console.log('🛠️  建议检查:');
    console.log('   1. 后端日志 - 查看是否有错误');
    console.log('   2. 数据库日志 - 查看SQL执行情况');
    console.log('   3. 后端代码 - 检查更新逻辑');
    console.log('   4. 数据库表结构 - 检查约束和触发器');
  }
  
  console.log(`\n诊断完成时间: ${new Date().toLocaleString()}`);
}

async function main() {
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('登录失败，无法进行诊断');
    process.exit(1);
  }
  
  const success = await diagnoseStatusUpdate();
  generateDiagnosisReport(success);
  
  process.exit(success ? 0 : 1);
}

// 运行诊断
main();
