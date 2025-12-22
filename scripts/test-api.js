#!/usr/bin/env node

/**
 * API连接测试脚本
 * 测试后端API的连通性和基本功能
 */

const axios = require('axios');

const API_BASE_URL = 'http://120.46.56.244:12000';

console.log('🔍 开始API连接测试...\n');

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 测试API连通性
async function testConnection() {
  console.log('📡 测试API连通性...');
  
  try {
    const response = await api.get('/');
    console.log('  ✅ API服务器连接成功');
    console.log(`  📊 响应状态: ${response.status}`);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('  ❌ API服务器连接失败 - 连接被拒绝');
      console.log('  💡 请检查后端服务是否启动在 http://120.46.56.244:12000');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('  ❌ API服务器连接超时');
      console.log('  💡 请检查网络连接和防火墙设置');
    } else {
      console.log(`  ⚠️  API服务器响应异常: ${error.message}`);
    }
    return false;
  }
}

// 测试设备API
async function testDeviceAPI() {
  console.log('\n🔧 测试设备API...');
  
  try {
    // 测试获取设备列表
    const response = await api.get('/api/v1/devices', {
      params: { page: 1, page_size: 5 }
    });
    
    console.log('  ✅ 获取设备列表成功');
    console.log(`  📊 响应状态: ${response.status}`);
    
    if (response.data) {
      console.log(`  📋 数据结构: ${JSON.stringify(Object.keys(response.data))}`);
      
      if (response.data.items && Array.isArray(response.data.items)) {
        console.log(`  📱 设备数量: ${response.data.items.length}`);
        
        if (response.data.items.length > 0) {
          const device = response.data.items[0];
          console.log(`  🔍 示例设备: ID=${device.dev_id}, 状态=${device.dev_status}`);
          
          // 测试状态更新API
          await testStatusUpdate(device.dev_id, device.dev_status);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.log(`  ❌ 设备API测试失败: ${error.message}`);
    if (error.response) {
      console.log(`  📊 错误状态: ${error.response.status}`);
      console.log(`  📋 错误数据: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// 测试状态更新API
async function testStatusUpdate(devId, currentStatus) {
  console.log('\n🔄 测试状态更新API...');
  
  const testData = {
    dev_id: String(devId),
    dev_status: currentStatus === 1 ? 0 : 1 // 切换状态
  };
  
  const endpoints = [
    { method: 'PUT', url: '/api/v1/devices/status' },
    { method: 'POST', url: '/api/v1/devices/status' },
    { method: 'PATCH', url: '/api/v1/devices/status' },
    { method: 'PUT', url: '/api/v1/devices' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`  🔍 尝试 ${endpoint.method} ${endpoint.url}...`);
      
      let response;
      switch (endpoint.method) {
        case 'PUT':
          response = await api.put(endpoint.url, testData);
          break;
        case 'POST':
          response = await api.post(endpoint.url, testData);
          break;
        case 'PATCH':
          response = await api.patch(endpoint.url, testData);
          break;
      }
      
      console.log(`  ✅ ${endpoint.method} ${endpoint.url} 成功`);
      console.log(`  📊 响应状态: ${response.status}`);
      console.log(`  📋 响应数据: ${JSON.stringify(response.data)}`);
      
      // 恢复原状态
      const restoreData = { ...testData, dev_status: currentStatus };
      await api.put(endpoint.url, restoreData);
      console.log(`  🔄 状态已恢复`);
      
      return true;
    } catch (error) {
      console.log(`  ❌ ${endpoint.method} ${endpoint.url} 失败: ${error.message}`);
      if (error.response) {
        console.log(`    📊 状态: ${error.response.status}`);
        console.log(`    📋 数据: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
  
  return false;
}

// 测试用户API
async function testUserAPI() {
  console.log('\n👤 测试用户API...');
  
  try {
    const response = await api.get('/api/v1/users', {
      params: { page: 1, page_size: 5 }
    });
    
    console.log('  ✅ 获取用户列表成功');
    console.log(`  📊 响应状态: ${response.status}`);
    
    if (response.data && response.data.items) {
      console.log(`  👥 用户数量: ${response.data.items.length}`);
    }
    
    return true;
  } catch (error) {
    console.log(`  ❌ 用户API测试失败: ${error.message}`);
    return false;
  }
}

// 测试日志API
async function testLogAPI() {
  console.log('\n📝 测试日志API...');
  
  try {
    const response = await api.get('/api/v1/logs', {
      params: { page: 1, page_size: 5 }
    });
    
    console.log('  ✅ 获取日志列表成功');
    console.log(`  📊 响应状态: ${response.status}`);
    
    if (response.data && response.data.items) {
      console.log(`  📋 日志数量: ${response.data.items.length}`);
    }
    
    return true;
  } catch (error) {
    console.log(`  ❌ 日志API测试失败: ${error.message}`);
    return false;
  }
}

// 生成测试报告
function generateReport(results) {
  console.log('\n📊 API测试报告');
  console.log('='.repeat(50));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const score = Math.round((passedTests / totalTests) * 100);
  
  console.log(`总体评分: ${score}% (${passedTests}/${totalTests})`);
  console.log('');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ 通过' : '❌ 失败';
    console.log(`${test}: ${status}`);
  });
  
  console.log('');
  
  if (score >= 80) {
    console.log('🎉 API连接状态良好！');
  } else if (score >= 60) {
    console.log('⚠️  API连接存在问题，建议检查');
  } else {
    console.log('❌ API连接严重问题，需要立即修复');
  }
  
  console.log('\n💡 建议:');
  if (!results['连通性测试']) {
    console.log('- 检查后端服务是否启动');
    console.log('- 验证API地址是否正确');
    console.log('- 检查网络连接和防火墙');
  }
  if (!results['设备API测试']) {
    console.log('- 检查设备API接口实现');
    console.log('- 验证数据库连接');
  }
  if (!results['用户API测试']) {
    console.log('- 检查用户认证系统');
  }
  if (!results['日志API测试']) {
    console.log('- 检查日志系统配置');
  }
  
  console.log(`\n测试完成时间: ${new Date().toLocaleString()}`);
  
  return score;
}

// 主函数
async function main() {
  const results = {
    '连通性测试': await testConnection(),
    '设备API测试': await testDeviceAPI(),
    '用户API测试': await testUserAPI(),
    '日志API测试': await testLogAPI()
  };
  
  const score = generateReport(results);
  
  // 退出码
  process.exit(score >= 70 ? 0 : 1);
}

// 运行测试
main().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
