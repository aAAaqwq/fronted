#!/usr/bin/env node

/**
 * 认证检查脚本
 * 检查当前用户的登录状态和token有效性
 */

console.log('🔍 检查认证状态...\n');

// 模拟浏览器环境检查
function checkBrowserAuth() {
  console.log('📱 浏览器环境认证检查:');
  console.log('1. 打开浏览器开发者工具 (F12)');
  console.log('2. 切换到 Application 或 Storage 标签');
  console.log('3. 查看 Local Storage');
  console.log('4. 检查是否有 "token" 项');
  console.log('');
  
  console.log('🔧 或者在控制台运行以下命令:');
  console.log('   localStorage.getItem("token")');
  console.log('');
  
  console.log('📊 预期结果:');
  console.log('✅ 有token: 显示类似 "Bearer eyJ..." 的字符串');
  console.log('❌ 无token: 显示 null');
  console.log('');
}

function checkAuthFlow() {
  console.log('🔄 认证流程检查:');
  console.log('');
  
  console.log('1️⃣ 如果没有token:');
  console.log('   - 访问登录页面 /login');
  console.log('   - 使用正确的用户名密码登录');
  console.log('   - 登录成功后会自动保存token');
  console.log('');
  
  console.log('2️⃣ 如果有token但API返回401:');
  console.log('   - token可能已过期');
  console.log('   - 清除token: localStorage.removeItem("token")');
  console.log('   - 重新登录');
  console.log('');
  
  console.log('3️⃣ 如果登录后仍然401:');
  console.log('   - 检查后端服务是否正常');
  console.log('   - 检查token格式是否正确');
  console.log('   - 联系后端开发人员');
  console.log('');
}

function generateAuthReport() {
  console.log('📊 认证问题诊断报告');
  console.log('='.repeat(50));
  
  console.log('🎯 问题症状:');
  console.log('- API调用返回 401 "缺少Authorization头"');
  console.log('- 设备状态更新失败');
  console.log('- 字段验证错误可能是认证问题的副作用');
  console.log('');
  
  console.log('🔍 可能原因:');
  console.log('1. 用户未登录 (最可能)');
  console.log('2. Token已过期');
  console.log('3. Token格式错误');
  console.log('4. 后端认证服务异常');
  console.log('');
  
  console.log('💡 解决方案:');
  console.log('1. 确保用户已登录');
  console.log('2. 检查token是否存在和有效');
  console.log('3. 如果token过期，重新登录');
  console.log('4. 检查后端服务状态');
  console.log('');
  
  console.log('🚀 快速修复步骤:');
  console.log('1. 打开浏览器，访问系统');
  console.log('2. 如果没有登录，先登录');
  console.log('3. 登录后再尝试修改设备状态');
  console.log('4. 如果仍有问题，清除缓存重新登录');
  console.log('');
  
  console.log('🔧 调试命令:');
  console.log('// 检查token');
  console.log('console.log("Token:", localStorage.getItem("token"));');
  console.log('');
  console.log('// 清除token (如果需要重新登录)');
  console.log('localStorage.removeItem("token");');
  console.log('');
  
  console.log(`检查完成时间: ${new Date().toLocaleString()}`);
}

function main() {
  checkBrowserAuth();
  checkAuthFlow();
  generateAuthReport();
  
  console.log('💡 提示: 这是认证问题，不是字段映射问题！');
  console.log('请先确保用户已登录，然后再测试设备状态更新功能。');
}

// 运行检查
main();
