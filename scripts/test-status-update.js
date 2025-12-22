#!/usr/bin/env node

/**
 * 设备状态更新测试脚本
 * 测试不同的字段格式和API端点
 */

const axios = require('axios');

const API_BASE_URL = 'http://120.46.56.244:12000';

console.log('🔍 测试设备状态更新API...\n');

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 测试不同的字段格式
const testFormats = [
  {
    name: '格式1: DevId + DevStatus',
    data: (devId, status) => ({
      DevId: String(devId),
      DevStatus: parseInt(status)
    })
  },
  {
    name: '格式2: dev_id + dev_status',
    data: (devId, status) => ({
      dev_id: String(devId),
      dev_status: parseInt(status)
    })
  },
  {
    name: '格式3: id + status',
    data: (devId, status) => ({
      id: String(devId),
      status: parseInt(status)
    })
  },
  {
    name: '格式4: device_id + device_status',
    data: (devId, status) => ({
      device_id: String(devId),
      device_status: parseInt(status)
    })
  }
];

// 测试不同的API端点
const testEndpoints = [
  '/api/v1/devices/status',
  '/api/v1/devices/update-status',
  '/api/v1/devices/change-status',
  '/api/v1/device/status',
  '/api/v1/devices'
];

async function getFirstDevice() {
  console.log('📱 获取第一个设备用于测试...');
  
  try {
    const res = await api.get('/api/v1/devices', {
      params: { page: 1, page_size: 1 }
    });
    
    if (res.data && res.data.items && res.data.items.length > 0) {
      const device = res.data.items[0];
      console.log(`✅ 找到测试设备: ID=${device.dev_id}, 当前状态=${device.dev_status}`);
      return device;
    } else {
      console.log('❌ 没有找到可用的设备');
      return null;
    }
  } catch (error) {
    console.log(`❌ 获取设备失败: ${error.message}`);
    return null;
  }
}

async function testStatusUpdate(device) {
  if (!device) return { passed: 0, total: 0 };
  
  console.log('\n🔄 开始测试状态更新...\n');
  
  const originalStatus = device.dev_status;
  const newStatus = originalStatus === 1 ? 0 : 1; // 切换状态
  
  let passedTests = 0;
  let totalTests = 0;
  
  // 测试不同的端点和格式组合
  for (const endpoint of testEndpoints) {
    for (const format of testFormats) {
      totalTests++;
      const testData = format.data(device.dev_id, newStatus);
      
      console.log(`🔍 测试: ${format.name} -> ${endpoint}`);
      console.log(`📋 数据: ${JSON.stringify(testData)}`);
      
      try {
        // 尝试PUT请求
        let response;
        try {
          response = await api.put(endpoint, testData);
        } catch (putError) {
          // 如果PUT失败，尝试POST
          try {
            response = await api.post(endpoint, testData);
          } catch (postError) {
            // 如果POST也失败，尝试PATCH
            response = await api.patch(endpoint, testData);
          }
        }
        
        console.log(`✅ 成功! 状态码: ${response.status}`);
        console.log(`📊 响应: ${JSON.stringify(response.data)}`);
        passedTests++;
        
        // 验证状态是否真的更新了
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待500ms
        const verifyRes = await api.get('/api/v1/devices', {
          params: { page: 1, page_size: 10 }
        });
        
        if (verifyRes.data && verifyRes.data.items) {
          const updatedDevice = verifyRes.data.items.find(d => d.dev_id == device.dev_id);
          if (updatedDevice && updatedDevice.dev_status == newStatus) {
            console.log(`✅ 验证成功: 状态已更新为 ${newStatus}`);
            
            // 恢复原状态
            try {
              await api.put(endpoint, format.data(device.dev_id, originalStatus));
              console.log(`🔄 状态已恢复为 ${originalStatus}`);
            } catch (restoreError) {
              console.log(`⚠️  恢复状态失败: ${restoreError.message}`);
            }
            
            // 找到工作的组合，可以提前结束
            console.log(`🎉 找到工作的组合: ${format.name} + ${endpoint}\n`);
            return { 
              passed: passedTests, 
              total: totalTests, 
              workingFormat: format.name,
              workingEndpoint: endpoint,
              workingData: testData
            };
          } else {
            console.log(`❌ 验证失败: 状态未更新`);
          }
        }
        
      } catch (error) {
        console.log(`❌ 失败: ${error.message}`);
        if (error.response) {
          console.log(`📊 错误状态: ${error.response.status}`);
          console.log(`📋 错误数据: ${JSON.stringify(error.response.data)}`);
        }
      }
      
      console.log(''); // 空行分隔
    }
  }
  
  return { passed: passedTests, total: totalTests };
}

function generateStatusReport(results) {
  console.log('📊 状态更新测试报告');
  console.log('='.repeat(50));
  
  if (results.workingFormat && results.workingEndpoint) {
    console.log('🎉 找到工作的API格式!');
    console.log(`✅ 格式: ${results.workingFormat}`);
    console.log(`✅ 端点: ${results.workingEndpoint}`);
    console.log(`✅ 数据: ${JSON.stringify(results.workingData)}`);
    console.log('');
    console.log('💡 建议在前端代码中使用此格式');
  } else {
    const score = Math.round((results.passed / results.total) * 100);
    console.log(`总体评分: ${score}% (${results.passed}/${results.total})`);
    
    if (results.passed === 0) {
      console.log('❌ 所有测试都失败了');
      console.log('💡 可能的原因:');
      console.log('- 后端服务未启动');
      console.log('- 需要认证token');
      console.log('- API端点或字段格式不正确');
      console.log('- 权限不足');
    } else {
      console.log('⚠️  部分测试成功，但状态验证失败');
      console.log('💡 可能的原因:');
      console.log('- 状态更新有延迟');
      console.log('- 需要特定的权限');
      console.log('- 数据库更新失败');
    }
  }
  
  console.log(`\n测试完成时间: ${new Date().toLocaleString()}`);
  
  return results.workingFormat ? 100 : 0;
}

async function main() {
  try {
    const device = await getFirstDevice();
    if (!device) {
      console.log('无法获取测试设备，退出测试');
      process.exit(1);
    }
    
    const results = await testStatusUpdate(device);
    const score = generateStatusReport(results);
    
    process.exit(score >= 50 ? 0 : 1);
  } catch (error) {
    console.error('测试执行失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();
