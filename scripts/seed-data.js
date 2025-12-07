/**
 * 医疗传感器数据模拟生成脚本
 * 根据数据库表结构生成真实的医疗康复设备传感器数据
 * 
 * 数据库字段名（device表）：
 * - model
 * - version  
 * - sampling_rate
 * - upload_interval
 */

const API_BASE = 'http://120.46.56.244:12000';

// 管理员账号
const ADMIN_EMAIL = 'admin@sensor.com';
const ADMIN_PASSWORD = 'admin123';

// 医疗设备类型配置 - 使用时间戳后缀避免重名
const TIMESTAMP_SUFFIX = Date.now().toString().slice(-6);
const DEVICE_TYPES = [
  { type: 'ecg', name: `ECG_${TIMESTAMP_SUFFIX}`, model: 'ECG-Pro-3000', version: 'v2.1.0', sampling: 500, interval: 5 },
  { type: 'emg', name: `EMG_${TIMESTAMP_SUFFIX}`, model: 'EMG-Rehab-200', version: 'v1.5.2', sampling: 1000, interval: 10 },
  { type: 'temperature', name: `TEMP_${TIMESTAMP_SUFFIX}`, model: 'TempPatch-Mini', version: 'v3.0.1', sampling: 1, interval: 60 },
  { type: 'spo2', name: `SPO2_${TIMESTAMP_SUFFIX}`, model: 'OxiSense-100', version: 'v2.0.0', sampling: 25, interval: 30 },
  { type: 'pressure', name: `PRES_${TIMESTAMP_SUFFIX}`, model: 'PressureMat-Pro', version: 'v1.2.0', sampling: 50, interval: 15 },
  { type: 'motion', name: `MOT_${TIMESTAMP_SUFFIX}`, model: 'MotionTrack-360', version: 'v2.3.1', sampling: 100, interval: 10 }
];

// 医护人员用户配置
const USERS = [
  { email: 'doctor.zhang@hospital.com', password: 'doctor123', username: '张医生' },
  { email: 'nurse.li@hospital.com', password: 'nurse123', username: '李护士' },
  { email: 'therapist.wang@hospital.com', password: 'therapy123', username: '王康复师' },
  { email: 'patient001@rehab.com', password: 'patient123', username: '患者张三' },
  { email: 'patient002@rehab.com', password: 'patient123', username: '患者李四' },
];

let token = null;
let createdDevices = [];
let createdUsers = [];

// HTTP请求封装
async function request(method, path, data = null, useToken = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useToken && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, options);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`请求失败: ${method} ${path}`, error.message);
    return { code: 500, message: error.message };
  }
}

// 生成正态分布随机数
function gaussianRandom(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

// 生成ECG心电数据
function generateECGPoints(timestamp, count = 100) {
  const points = [];
  const heartRate = gaussianRandom(72, 10);
  for (let i = 0; i < count; i++) {
    const t = i / 500;
    const phase = (t * 1000 % (60000 / heartRate)) / (60000 / heartRate);
    let value = 0;
    if (phase < 0.1) value = 0.15 * Math.sin(phase * Math.PI / 0.1);
    else if (phase < 0.22) value = 1.0 * Math.sin((phase - 0.15) * Math.PI / 0.07);
    else if (phase < 0.55) value = 0.3 * Math.sin((phase - 0.35) * Math.PI / 0.2);
    value += gaussianRandom(0, 0.02);
    points.push({
      timestamp: timestamp + i * 2,
      measurement: 'ecg',
      tags: { quality_score: (95 + Math.random() * 5).toFixed(1) },
      fileds: { value: parseFloat(value.toFixed(4)), heart_rate: parseFloat(heartRate.toFixed(1)) }
    });
  }
  return points;
}

// 生成体温数据
function generateTemperaturePoints(timestamp, count = 30) {
  const points = [];
  const baseTemp = gaussianRandom(36.5, 0.3);
  for (let i = 0; i < count; i++) {
    points.push({
      timestamp: timestamp + i * 1000,
      measurement: 'temperature',
      tags: { quality_score: (98 + Math.random() * 2).toFixed(1) },
      fileds: { value: parseFloat((baseTemp + gaussianRandom(0, 0.1)).toFixed(2)) }
    });
  }
  return points;
}

// 生成血氧数据
function generateSpO2Points(timestamp, count = 30) {
  const points = [];
  const baseSpo2 = gaussianRandom(97, 1.5);
  const basePulse = gaussianRandom(75, 8);
  for (let i = 0; i < count; i++) {
    points.push({
      timestamp: timestamp + i * 1000,
      measurement: 'spo2',
      tags: { quality_score: (95 + Math.random() * 5).toFixed(1) },
      fileds: {
        spo2: parseFloat(Math.min(100, Math.max(90, baseSpo2 + gaussianRandom(0, 0.5))).toFixed(1)),
        pulse_rate: Math.round(Math.max(50, basePulse + gaussianRandom(0, 3)))
      }
    });
  }
  return points;
}

// 主函数
async function main() {
  console.log('='.repeat(60));
  console.log('医疗传感器数据模拟生成脚本 (基于s6.openapi.json)');
  console.log('='.repeat(60));

  // 1. 登录获取token
  console.log('\n[1/5] 登录系统...');
  const loginRes = await request('POST', '/api/v1/users/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  }, false);
  
  if (loginRes.code !== 200) {
    console.error('登录失败:', loginRes.message);
    console.log('尝试注册管理员账号...');
    const regRes = await request('POST', '/api/v1/users/register', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, false);
    if (regRes.code === 200 || regRes.code === 201) {
      console.log('注册成功，重新登录...');
      const loginRes2 = await request('POST', '/api/v1/users/login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }, false);
      if (loginRes2.code !== 200) {
        console.error('登录失败:', loginRes2.message);
        return;
      }
      token = loginRes2.data.token;
    } else {
      console.error('注册失败:', regRes.message);
      return;
    }
  } else {
    token = loginRes.data.token;
  }
  console.log('✓ 登录成功');

  // 2. 创建用户
  console.log('\n[2/5] 创建医护人员用户...');
  for (const user of USERS) {
    const res = await request('POST', '/api/v1/users/register', user, false);
    if (res.code === 200 || res.code === 201) {
      console.log(`  ✓ 创建用户: ${user.username} (${user.email})`);
      createdUsers.push(user);
    } else {
      console.log(`  - 用户已存在: ${user.email}`);
    }
  }

  // 3. 创建医疗设备 (使用数据库表字段名)
  console.log('\n[3/5] 创建医疗设备...');
  for (const deviceType of DEVICE_TYPES) {
    for (let j = 0; j < 2; j++) {
      // 根据数据库device表结构使用正确字段名
      const deviceData = {
        dev_name: `${deviceType.name}_${String(j + 1).padStart(2, '0')}`,
        dev_type: deviceType.type,
        model: deviceType.model,
        version: deviceType.version,
        dev_status: Math.random() > 0.2 ? 1 : 0, // 1在线, 0离线
        dev_power: Math.floor(20 + Math.random() * 80),
        sampling_rate: deviceType.sampling,
        upload_interval: deviceType.interval,
        offline_threshold: 300,
        extended_config: {}
      };
      
      const res = await request('POST', '/api/v1/devices', deviceData);
      if (res.code === 200 || res.code === 201) {
        const devId = res.data?.dev_id || res.dev_id;
        if (devId) {
          createdDevices.push({ ...deviceData, dev_id: devId });
          console.log(`  ✓ 创建设备: ${deviceData.dev_name} (ID: ${devId})`);
        } else {
          console.log(`  ✓ 创建设备: ${deviceData.dev_name}`);
          if (res.data) createdDevices.push({ ...deviceData, ...res.data });
        }
      } else if (res.message && res.message.includes('Duplicate')) {
        console.log(`  - 设备已存在: ${deviceData.dev_name}`);
        // 设备已存在，记录设备名以便后续查询
        createdDevices.push({ ...deviceData, dev_id: null, existing: true });
      } else {
        console.log(`  ✗ 设备创建失败: ${deviceData.dev_name} - ${res.message}`);
      }
    }
  }
  
  // 如果有已存在的设备，尝试查询获取dev_id
  const existingDevices = createdDevices.filter(d => d.existing);
  if (existingDevices.length > 0) {
    console.log('  正在查询已存在设备的ID...');
    // 尝试通过设备列表API获取（需要管理员权限或已绑定）
    const listRes = await request('GET', '/api/v1/devices?page=1&page_size=100');
    if (listRes.code === 200 && listRes.data?.items) {
      for (const item of listRes.data.items) {
        const idx = createdDevices.findIndex(d => d.dev_name === item.dev_name);
        if (idx >= 0) {
          createdDevices[idx].dev_id = item.dev_id;
          createdDevices[idx].existing = false;
        }
      }
    }
  }

  // 4. 上传传感器时序数据
  console.log('\n[4/5] 上传传感器时序数据...');
  const now = Date.now();
  let dataCount = 0;
  
  for (const device of createdDevices) {
    if (!device.dev_id) continue;
    
    // 生成过去24小时的数据，每4小时一批
    for (let hour = 0; hour < 24; hour += 4) {
      const timestamp = now - (24 - hour) * 60 * 60 * 1000;
      let points = [];
      
      switch (device.dev_type) {
        case 'ecg':
          points = generateECGPoints(timestamp, 50);
          break;
        case 'temperature':
          points = generateTemperaturePoints(timestamp, 20);
          break;
        case 'spo2':
          points = generateSpO2Points(timestamp, 20);
          break;
        default:
          points = generateTemperaturePoints(timestamp, 10);
      }
      
      if (points.length > 0) {
        const uploadData = {
          metadata: {
            data_id: Math.floor(Math.random() * 1000000),
            dev_id: device.dev_id,
            uid: 0,
            data_type: device.dev_type,
            quality_score: (95 + Math.random() * 5).toFixed(1),
            timestamp: new Date(timestamp).toISOString(),
            extra_data: { session: `session_${Date.now()}` }
          },
          series_data: { points }
        };
        
        const res = await request('POST', '/api/v1/device/data', uploadData);
        if (res.code === 200 || res.code === 201) {
          dataCount += points.length;
        }
      }
    }
    console.log(`  ✓ ${device.dev_name}: 已上传数据`);
  }
  console.log(`  总计上传 ${dataCount} 个数据点`);

  // 5. 创建告警信息
  console.log('\n[5/5] 创建告警信息...');
  const warnings = [
    { type: 'dev', message: '设备电量低于20%', status: 'active' },
    { type: 'dev', message: '设备离线超过30分钟', status: 'active' },
    { type: 'data', message: '心率异常：检测到心率>120bpm', status: 'active' },
    { type: 'data', message: '体温异常：检测到体温>38.5°C', status: 'resolved' },
    { type: 'data', message: '血氧饱和度低于95%', status: 'resolved' },
  ];
  
  let warningCount = 0;
  for (const device of createdDevices.slice(0, 5)) {
    if (!device.dev_id) continue;
    const warning = warnings[warningCount % warnings.length];
    const res = await request('POST', '/api/v1/warning_info', {
      data_id: Math.floor(Math.random() * 1000000), // alert_event表需要data_id
      dev_id: device.dev_id,
      alert_type: warning.type,
      alert_message: warning.message,
      alert_status: warning.status,
      triggered_at: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    if (res.code === 200 || res.code === 201) {
      console.log(`  ✓ 告警: ${warning.message}`);
      warningCount++;
    } else {
      console.log(`  ✗ 告警创建失败: ${res.message}`);
    }
  }

  // 6. 绑定设备到用户
  console.log('\n[6/7] 绑定设备到用户...');
  let bindCount = 0;
  // 获取当前用户信息
  const meRes = await request('GET', '/api/v1/users?uid=0');
  const currentUid = meRes.data?.uid;
  
  if (currentUid && createdDevices.length > 0) {
    for (const device of createdDevices.slice(0, 6)) {
      if (!device.dev_id) continue;
      const res = await request('POST', '/api/v1/devices/bind_user', {
        uid: currentUid,
        dev_id: device.dev_id,
        permission_level: 'rw'
      });
      if (res.code === 200 || res.code === 201) {
        console.log(`  ✓ 绑定: ${device.dev_name} -> 当前用户`);
        bindCount++;
      }
    }
  }

  // 7. 创建系统日志
  console.log('\n[7/7] 创建系统日志...');
  const logs = [
    { type: 'info', level: 1, message: '系统启动成功' },
    { type: 'info', level: 1, message: '用户登录: admin@sensor.com' },
    { type: 'info', level: 1, message: '设备上线: 心电监测仪-01' },
    { type: 'warning', level: 2, message: '设备电量警告: 血氧监测仪-02 剩余15%' },
    { type: 'error', level: 3, message: '数据上传失败: 网络连接超时' },
    { type: 'info', level: 1, message: '告警已处理: 体温异常' },
  ];
  
  let logCount = 0;
  for (const log of logs) {
    const res = await request('POST', '/api/v1/logs', {
      ...log,
      user_agent: 'SensorManagement/1.0'
    });
    if (res.code === 200 || res.code === 201) {
      console.log(`  ✓ 日志: [${log.type.toUpperCase()}] ${log.message}`);
      logCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('数据生成完成！');
  console.log(`  - 用户: ${createdUsers.length} 个新创建`);
  console.log(`  - 设备: ${createdDevices.length} 个`);
  console.log(`  - 设备绑定: ${bindCount} 个`);
  console.log(`  - 数据点: ${dataCount} 个`);
  console.log(`  - 告警: ${warningCount} 个`);
  console.log(`  - 日志: ${logCount} 条`);
  console.log('='.repeat(60));
}

main().catch(console.error);
