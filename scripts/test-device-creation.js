#!/usr/bin/env node

/**
 * 设备创建API测试脚本
 * 测试字段映射和验证逻辑
 */

const axios = require('axios');

const API_BASE_URL = 'http://120.46.56.244:12000';

console.log('🔍 测试设备创建API字段映射...\n');

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 测试数据
const testCases = [
  {
    name: '正确的字段映射',
    data: {
      DevName: '测试设备001',
      DevType: 'temperature',
      Model: 'TH-001',
      Version: 'v1.0.0',
      SamplingRate: 1000,
      UploadInterval: 60
    },
    shouldSucceed: true
  },
  {
    name: '缺少DevName字段',
    data: {
      DevType: 'temperature',
      Model: 'TH-002',
      Version: 'v1.0.0'
    },
    shouldSucceed: false
  },
  {
    name: '缺少DevType字段',
    data: {
      DevName: '测试设备002',
      Model: 'TH-003',
      Version: 'v1.0.0'
    },
    shouldSucceed: false
  },
  {
    name: '旧的字段格式（应该失败）',
    data: {
      dev_name: '测试设备003',
      dev_type: 'temperature',
      model: 'TH-004',
      version: 'v1.0.0'
    },
    shouldSucceed: false
  }
];

async function testDeviceCreation() {
  console.log('📱 开始测试设备创建API...\n');
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`🔍 测试 ${i + 1}: ${testCase.name}`);
    console.log(`📋 数据: ${JSON.stringify(testCase.data, null, 2)}`);
    
    try {
      const response = await api.post('/api/v1/devices', testCase.data);
      
      if (testCase.shouldSucceed) {
        console.log(`✅ 测试通过 - 创建成功`);
        console.log(`📊 响应: ${JSON.stringify(response.data)}`);
        passedTests++;
        
        // 清理：删除创建的测试设备
        if (response.data && response.data.data && response.data.data.dev_id) {
          try {
            await api.delete('/api/v1/devices', {
              params: { dev_id: response.data.data.dev_id }
            });
            console.log(`🗑️  测试设备已清理`);
          } catch (cleanupError) {
            console.log(`⚠️  清理失败: ${cleanupError.message}`);
          }
        }
      } else {
        console.log(`❌ 测试失败 - 应该失败但成功了`);
        console.log(`📊 意外响应: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      if (!testCase.shouldSucceed) {
        console.log(`✅ 测试通过 - 正确失败`);
        if (error.response) {
          console.log(`📊 错误状态: ${error.response.status}`);
          console.log(`📋 错误信息: ${JSON.stringify(error.response.data)}`);
        }
        passedTests++;
      } else {
        console.log(`❌ 测试失败 - 应该成功但失败了`);
        console.log(`📊 错误: ${error.message}`);
        if (error.response) {
          console.log(`📋 错误详情: ${JSON.stringify(error.response.data)}`);
        }
      }
    }
    
    console.log(''); // 空行分隔
  }
  
  return { passed: passedTests, total: totalTests };
}

async function testFieldValidation() {
  console.log('🔍 测试字段验证逻辑...\n');
  
  const validationTests = [
    {
      name: '空DevName验证',
      data: { DevName: '', DevType: 'temperature' },
      expectedError: 'DevName'
    },
    {
      name: '空DevType验证',
      data: { DevName: '测试设备', DevType: '' },
      expectedError: 'DevType'
    },
    {
      name: '无效DevType验证',
      data: { DevName: '测试设备', DevType: 'invalid_type' },
      expectedError: 'DevType'
    }
  ];
  
  let passedValidation = 0;
  
  for (const test of validationTests) {
    console.log(`🔍 验证测试: ${test.name}`);
    
    try {
      const response = await api.post('/api/v1/devices', test.data);
      console.log(`❌ 验证失败 - 应该被拒绝但通过了`);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        const errorMessage = error.response.data.message || '';
        if (errorMessage.includes(test.expectedError)) {
          console.log(`✅ 验证通过 - 正确拒绝了${test.expectedError}字段`);
          passedValidation++;
        } else {
          console.log(`⚠️  验证部分通过 - 被拒绝但错误信息不匹配`);
          console.log(`📋 期望包含: ${test.expectedError}`);
          console.log(`📋 实际错误: ${errorMessage}`);
        }
      } else {
        console.log(`⚠️  验证异常 - 错误状态: ${error.response?.status || 'unknown'}`);
      }
    }
    console.log('');
  }
  
  return { passed: passedValidation, total: validationTests.length };
}

function generateReport(creationResults, validationResults) {
  console.log('📊 测试报告');
  console.log('='.repeat(50));
  
  const totalPassed = creationResults.passed + validationResults.passed;
  const totalTests = creationResults.total + validationResults.total;
  const score = Math.round((totalPassed / totalTests) * 100);
  
  console.log(`总体评分: ${score}% (${totalPassed}/${totalTests})`);
  console.log('');
  console.log(`设备创建测试: ${creationResults.passed}/${creationResults.total}`);
  console.log(`字段验证测试: ${validationResults.passed}/${validationResults.total}`);
  console.log('');
  
  if (score >= 90) {
    console.log('🎉 API字段映射完美！');
  } else if (score >= 70) {
    console.log('✅ API字段映射良好');
  } else {
    console.log('❌ API字段映射需要修复');
  }
  
  console.log('\n💡 修复建议:');
  if (creationResults.passed < creationResults.total) {
    console.log('- 检查前端字段映射是否正确');
    console.log('- 验证后端API字段要求');
  }
  if (validationResults.passed < validationResults.total) {
    console.log('- 检查前端表单验证逻辑');
    console.log('- 确保必填字段正确标记');
  }
  
  console.log(`\n测试完成时间: ${new Date().toLocaleString()}`);
  
  return score;
}

async function main() {
  try {
    const creationResults = await testDeviceCreation();
    const validationResults = await testFieldValidation();
    
    const score = generateReport(creationResults, validationResults);
    
    process.exit(score >= 70 ? 0 : 1);
  } catch (error) {
    console.error('测试执行失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();
