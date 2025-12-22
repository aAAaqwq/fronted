#!/usr/bin/env node

/**
 * API端点验证脚本
 * 验证哪些API端点可用
 */

const axios = require('axios');

const API_BASE_URL = 'http://120.46.56.244:12000';

console.log('🔍 验证API端点可用性...\n');

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 要测试的端点列表
const endpoints = [
  { method: 'GET', path: '/api/v1/devices', description: '获取设备列表' },
  { method: 'POST', path: '/api/v1/devices', description: '创建设备' },
  { method: 'PUT', path: '/api/v1/devices', description: '更新设备' },
  { method: 'DELETE', path: '/api/v1/devices', description: '删除设备' },
  { method: 'PUT', path: '/api/v1/devices/status', description: '更新设备状态(专用)' },
  { method: 'PATCH', path: '/api/v1/devices/status', description: '更新设备状态(PATCH)' },
  { method: 'POST', path: '/api/v1/devices/status', description: '更新设备状态(POST)' },
  { method: 'GET', path: '/api/v1/users', description: '获取用户列表' },
  { method: 'GET', path: '/api/v1/logs', description: '获取日志列表' },
];

async function testEndpoint(endpoint) {
  try {
    let response;
    const testData = {
      DevId: "test123",
      DevName: "测试设备",
      DevType: "temperature",
      DevStatus: 1
    };

    switch (endpoint.method) {
      case 'GET':
        response = await api.get(endpoint.path, { params: { page: 1, page_size: 1 } });
        break;
      case 'POST':
        response = await api.post(endpoint.path, testData);
        break;
      case 'PUT':
        response = await api.put(endpoint.path, testData);
        break;
      case 'PATCH':
        response = await api.patch(endpoint.path, testData);
        break;
      case 'DELETE':
        response = await api.delete(endpoint.path, { params: { dev_id: "test123" } });
        break;
    }

    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 'NETWORK_ERROR',
      message: error.message,
      data: error.response?.data
    };
  }
}

async function verifyEndpoints() {
  console.log('📡 开始验证API端点...\n');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`🔍 测试: ${endpoint.method} ${endpoint.path}`);
    console.log(`📋 描述: ${endpoint.description}`);
    
    const result = await testEndpoint(endpoint);
    results.push({ endpoint, result });
    
    if (result.success) {
      console.log(`✅ 成功 - 状态码: ${result.status}`);
      if (result.data) {
        console.log(`📊 响应: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
    } else {
      console.log(`❌ 失败 - 状态码: ${result.status}`);
      console.log(`📋 错误: ${result.message}`);
      if (result.data) {
        console.log(`📊 错误详情: ${JSON.stringify(result.data)}`);
      }
    }
    
    console.log(''); // 空行分隔
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

function generateEndpointReport(results) {
  console.log('📊 API端点验证报告');
  console.log('='.repeat(60));
  
  const workingEndpoints = results.filter(r => r.result.success);
  const failedEndpoints = results.filter(r => !r.result.success);
  
  console.log(`\n✅ 可用端点 (${workingEndpoints.length}/${results.length}):`);
  workingEndpoints.forEach(({ endpoint, result }) => {
    console.log(`  ${endpoint.method} ${endpoint.path} - ${result.status}`);
  });
  
  console.log(`\n❌ 不可用端点 (${failedEndpoints.length}/${results.length}):`);
  failedEndpoints.forEach(({ endpoint, result }) => {
    console.log(`  ${endpoint.method} ${endpoint.path} - ${result.status} (${result.message})`);
  });
  
  // 特别关注设备状态更新端点
  console.log('\n🎯 设备状态更新端点分析:');
  const statusEndpoints = results.filter(r => 
    r.endpoint.path.includes('/status') || 
    (r.endpoint.path === '/api/v1/devices' && ['PUT', 'PATCH'].includes(r.endpoint.method))
  );
  
  const workingStatusEndpoints = statusEndpoints.filter(r => r.result.success);
  
  if (workingStatusEndpoints.length > 0) {
    console.log('✅ 推荐使用以下端点进行状态更新:');
    workingStatusEndpoints.forEach(({ endpoint, result }) => {
      console.log(`  ${endpoint.method} ${endpoint.path} - 状态码: ${result.status}`);
    });
  } else {
    console.log('❌ 没有找到可用的状态更新端点');
    console.log('💡 建议使用通用的 PUT /api/v1/devices 端点');
  }
  
  console.log(`\n测试完成时间: ${new Date().toLocaleString()}`);
  
  return workingEndpoints.length / results.length;
}

async function main() {
  try {
    const results = await verifyEndpoints();
    const successRate = generateEndpointReport(results);
    
    process.exit(successRate >= 0.5 ? 0 : 1);
  } catch (error) {
    console.error('验证执行失败:', error);
    process.exit(1);
  }
}

// 运行验证
main();
