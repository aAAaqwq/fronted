#!/usr/bin/env node

/**
 * 传感器管理系统健康检查脚本
 * 检查系统各个组件的运行状态
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 开始系统健康检查...\n');

// 检查项目结构
function checkProjectStructure() {
  console.log('📁 检查项目结构...');
  
  const requiredFiles = [
    'package.json',
    'vite.config.js',
    'src/main.jsx',
    'src/App.jsx',
    'src/api/index.js',
    'src/context/AuthContext.jsx',
    'index.html'
  ];

  const requiredDirs = [
    'src/pages',
    'src/components',
    'src/components/common'
  ];

  let structureOk = true;

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - 缺失`);
      structureOk = false;
    }
  });

  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`  ✅ ${dir}/`);
    } else {
      console.log(`  ❌ ${dir}/ - 缺失`);
      structureOk = false;
    }
  });

  return structureOk;
}

// 检查依赖
function checkDependencies() {
  console.log('\n📦 检查依赖...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'recharts',
      'lucide-react',
      'date-fns'
    ];

    let depsOk = true;
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
        console.log(`  ✅ ${dep}`);
      } else {
        console.log(`  ❌ ${dep} - 未安装`);
        depsOk = false;
      }
    });

    // 检查node_modules
    if (fs.existsSync('node_modules')) {
      console.log('  ✅ node_modules 存在');
    } else {
      console.log('  ❌ node_modules 不存在，请运行 npm install');
      depsOk = false;
    }

    return depsOk;
  } catch (error) {
    console.log('  ❌ 无法读取 package.json');
    return false;
  }
}

// 检查环境配置
function checkEnvironment() {
  console.log('\n🔧 检查环境配置...');
  
  let envOk = true;

  // 检查环境文件
  if (fs.existsSync('.env')) {
    console.log('  ✅ .env 文件存在');
  } else {
    console.log('  ⚠️  .env 文件不存在，将使用默认配置');
  }

  if (fs.existsSync('.env.example')) {
    console.log('  ✅ .env.example 文件存在');
  } else {
    console.log('  ❌ .env.example 文件不存在');
    envOk = false;
  }

  // 检查Node.js版本
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 16) {
      console.log(`  ✅ Node.js 版本: ${nodeVersion}`);
    } else {
      console.log(`  ❌ Node.js 版本过低: ${nodeVersion}，需要 >= 16.0.0`);
      envOk = false;
    }
  } catch (error) {
    console.log('  ❌ 无法检查 Node.js 版本');
    envOk = false;
  }

  return envOk;
}

// 检查代码质量
function checkCodeQuality() {
  console.log('\n🔍 检查代码质量...');
  
  let qualityOk = true;
  
  // 检查是否有语法错误
  try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('  ✅ 构建测试通过');
  } catch (error) {
    console.log('  ❌ 构建失败，存在语法错误');
    console.log('    ', error.message.split('\n')[0]);
    qualityOk = false;
  }

  // 检查关键组件
  const criticalFiles = [
    'src/pages/Login.jsx',
    'src/pages/Dashboard.jsx',
    'src/pages/Devices.jsx',
    'src/components/common/Modal.jsx',
    'src/components/common/Button.jsx'
  ];

  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('export default')) {
          console.log(`  ✅ ${file}`);
        } else {
          console.log(`  ⚠️  ${file} - 缺少默认导出`);
        }
      } catch (error) {
        console.log(`  ❌ ${file} - 读取失败`);
        qualityOk = false;
      }
    } else {
      console.log(`  ❌ ${file} - 文件不存在`);
      qualityOk = false;
    }
  });

  return qualityOk;
}

// 检查API配置
function checkApiConfig() {
  console.log('\n🌐 检查API配置...');
  
  let apiOk = true;

  try {
    const viteConfig = fs.readFileSync('vite.config.js', 'utf8');
    
    if (viteConfig.includes('proxy')) {
      console.log('  ✅ Vite代理配置存在');
    } else {
      console.log('  ❌ Vite代理配置缺失');
      apiOk = false;
    }

    if (viteConfig.includes('120.46.56.244:12000')) {
      console.log('  ✅ 后端API地址配置正确');
    } else {
      console.log('  ⚠️  后端API地址可能需要更新');
    }

    const apiFile = fs.readFileSync('src/api/index.js', 'utf8');
    
    if (apiFile.includes('axios')) {
      console.log('  ✅ Axios HTTP客户端配置');
    } else {
      console.log('  ❌ Axios配置缺失');
      apiOk = false;
    }

    if (apiFile.includes('transformBigIntResponse')) {
      console.log('  ✅ BigInt处理配置');
    } else {
      console.log('  ⚠️  BigInt处理配置可能缺失');
    }

  } catch (error) {
    console.log('  ❌ 无法检查API配置');
    apiOk = false;
  }

  return apiOk;
}

// 生成报告
function generateReport(results) {
  console.log('\n📊 健康检查报告');
  console.log('='.repeat(50));
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  console.log(`总体评分: ${score}% (${passedChecks}/${totalChecks})`);
  console.log('');

  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? '✅ 通过' : '❌ 失败';
    console.log(`${check}: ${status}`);
  });

  console.log('');

  if (score >= 90) {
    console.log('🎉 系统状态优秀！');
  } else if (score >= 70) {
    console.log('✅ 系统状态良好，建议修复警告项');
  } else if (score >= 50) {
    console.log('⚠️  系统存在问题，需要修复');
  } else {
    console.log('❌ 系统存在严重问题，请立即修复');
  }

  console.log('\n💡 建议:');
  if (!results['项目结构']) {
    console.log('- 检查并补全缺失的文件和目录');
  }
  if (!results['依赖检查']) {
    console.log('- 运行 npm install 安装依赖');
  }
  if (!results['环境配置']) {
    console.log('- 检查 Node.js 版本和环境变量配置');
  }
  if (!results['代码质量']) {
    console.log('- 修复构建错误和语法问题');
  }
  if (!results['API配置']) {
    console.log('- 检查API配置和网络连接');
  }

  return score;
}

// 主函数
function main() {
  const results = {
    '项目结构': checkProjectStructure(),
    '依赖检查': checkDependencies(),
    '环境配置': checkEnvironment(),
    '代码质量': checkCodeQuality(),
    'API配置': checkApiConfig()
  };

  const score = generateReport(results);
  
  console.log(`\n检查完成时间: ${new Date().toLocaleString()}`);
  
  // 退出码
  process.exit(score >= 70 ? 0 : 1);
}

// 运行检查
main();
