#!/usr/bin/env node

/**
 * 调试字段格式脚本
 * 测试不同的字段格式组合
 */

const axios = require('axios');

const API_BASE_URL = 'http://120.46.56.244:12000';

console.log('🔍 调试后端字段格式要求...\n');

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

// 测试不同的字段格式
async function testFieldFormats() {
  const testCases = [
    {
      name: '格式1: 标准字段',
      data: {
        DevId: "653421142357639200",
        DevName: "test_device",
        DevType: "temperature",
        DevStatus: 1
      }
    },
    {
      name: '格式2: 小写字段',
      data: {
        dev_id: "653421142357639200",
        dev_name: "test_device",
        dev_type: "temperature", 
        dev_status: 1
      }
    },
    {
      name: '格式3: 混合字段',
      data: {
        DevId: "653421142357639200",
        dev_name: "test_device",
        dev_type: "temperature",
        DevStatus: 1
      }
    },
    {
      name: '格式4: 完整设备信息',
      data: {
        DevId: "653421142357639200",
        DevName: "test_device",
        DevType: "temperature",
        DevStatus: 1,
        Model: "TH001",
        Version: "v1.0",
        SamplingRate: 1000,
        UploadInterval: 60
      }
    },
    {
      name: '格式5: 嵌套设备对象',
      data: {
        Device: {
          DevId: "653421142357639200",
          DevName: "test_device", 
          DevType: "temperature",
          DevStatus: 1
        }
      }
    },
    {
      name: '格式6: 只有必需字段',
      data: {
        DevId: "653421142357639200",
        DevName: "test_device",
        DevType: "temperature"
      }
    },
    {
      name: '格式7: 字符串状态',
      data: {
        DevId: "653421142357639200",
        DevName: "test_device",
        DevType: "temperature",
        DevStatus: "1"
      }
    }
  ];

  console.log('🧪 测试不同字段格式...\n');

  for (const testCase of testCases) {
    console.log(`🔍 ${testCase.name}`);
    console.log(`📋 数据: ${JSON.stringify(testCase.data, null, 2)}`);
    
    try {
      const response = await api.put('/api/v1/devices', testCase.data);
      console.log(`✅ 成功! 状态: ${response.status}`);
      console.log(`📊 响应: ${JSON.stringify(response.data)}`);
      
      // 找到工作的格式就停止
      console.log(`🎉 找到工作的格式: ${testCase.name}`);
      return testCase;
      
    } catch (error) {
      console.log(`❌ 失败: ${error.response?.status || 'NETWORK'}`);
      if (error.response?.data) {
        console.log(`📋 错误: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    console.log(''); // 空行
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return null;
}

// 测试创建设备（对比格式）
async function testCreateDevice() {
  console.log('🆕 测试创建设备格式...\n');
  
  const createData = {
    DevName: "debug_test_device",
    DevType: "temperature",
    Model: "DEBUG001",
    Version: "v1.0"
  };
  
  console.log('📋 创建数据:', JSON.stringify(createData, null, 2));
  
  try {
    const response = await api.post('/api/v1/devices', createData);
    console.log('✅ 创建成功!');
    console.log('📊 响应:', JSON.stringify(response.data, null, 2));
    
    // 获取创建的设备ID
    const deviceId = response.data?.data?.dev_id;
    if (deviceId) {
      console.log(`📱 新设备ID: ${deviceId}`);
      
      // 尝试更新这个新设备
      console.log('\n🔄 尝试更新新创建的设备...');
      const updateData = {
        DevId: String(deviceId),
        DevName: "debug_test_device_updated",
        DevType: "temperature",
        DevStatus: 1,
        Model: "DEBUG001",
        Version: "v1.0"
      };
      
      const updateResponse = await api.put('/api/v1/devices', updateData);
      console.log('✅ 更新成功!');
      console.log('📊 更新响应:', JSON.stringify(updateResponse.data, null, 2));
      
      // 清理：删除测试设备
      await api.delete('/api/v1/devices', { params: { dev_id: deviceId } });
      console.log('🗑️  测试设备已清理');
      
      return updateData;
    }
    
  } catch (error) {
    console.log('❌ 创建失败:', error.response?.status);
    if (error.response?.data) {
      console.log('📋 错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  return null;
}

async function main() {
  const loginSuccess = await login();
  if (!loginSuccess) {
    process.exit(1);
  }
  
  // 先测试创建设备（这个应该能工作）
  const createResult = await testCreateDevice();
  
  // 再测试更新设备的不同格式
  const updateResult = await testFieldFormats();
  
  console.log('\n📊 调试结果');
  console.log('='.repeat(50));
  
  if (createResult) {
    console.log('✅ 创建设备格式正确');
    console.log('📋 工作的创建格式:', JSON.stringify(createResult, null, 2));
  } else {
    console.log('❌ 创建设备也失败');
  }
  
  if (updateResult) {
    console.log('✅ 找到工作的更新格式');
    console.log('📋 推荐格式:', JSON.stringify(updateResult.data, null, 2));
  } else {
    console.log('❌ 所有更新格式都失败');
    console.log('💡 可能的问题:');
    console.log('   1. 后端API有bug');
    console.log('   2. 需要特殊的字段值或格式');
    console.log('   3. 设备ID不存在或无权限修改');
  }
  
  process.exit(updateResult ? 0 : 1);
}

main();
