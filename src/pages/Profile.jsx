import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { userApi } from '../api';
import { User, Mail, Shield, Lock, Save } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';

const Profile = () => {
  const { user, login } = useAuth();
  const toast = useToast();
  
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateProfile = async () => {
    try {
      setSavingProfile(true);
      const res = await userApi.updateUser({
        uid: user.uid,
        username: profileData.username,
        email: profileData.email,
      });
      if (res.code === 200) {
        toast.success('个人信息更新成功');
        // Update local user data
        const updatedUser = { ...user, ...res.data };
        login(updatedUser, localStorage.getItem('token'));
      } else {
        toast.error(res.message || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.old_password || !passwordData.new_password) {
      toast.warning('请填写完整密码信息');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.warning('两次输入的新密码不一致');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.warning('新密码长度至少6位');
      return;
    }

    try {
      setSavingPassword(true);
      const res = await userApi.changePassword({
        uid: user.uid,
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      if (res.code === 200) {
        toast.success('密码修改成功');
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        toast.error(res.message || '密码修改失败');
      }
    } catch (error) {
      toast.error('密码修改失败');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* User Info Card */}
      <Card>
        <div className="flex items-center space-x-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <User size={40} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {user?.username || user?.email}
            </h2>
            <div className="flex items-center mt-2 text-gray-500">
              <Mail size={16} className="mr-2" />
              {user?.email}
            </div>
            <div className="flex items-center mt-1">
              <Shield size={16} className="mr-2 text-primary-600" />
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                user?.role === 'admin' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {user?.role === 'admin' ? '管理员' : '普通用户'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Profile */}
      <Card title="编辑个人信息">
        <div className="space-y-4">
          <Input
            label="用户名"
            value={profileData.username}
            onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
            placeholder="请输入用户名"
            icon={User}
          />
          <Input
            label="邮箱"
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            placeholder="请输入邮箱"
            icon={Mail}
          />
          <div className="flex justify-end pt-4">
            <Button onClick={handleUpdateProfile} loading={savingProfile} icon={Save}>
              保存修改
            </Button>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card title="修改密码">
        <div className="space-y-4">
          <Input
            label="当前密码"
            type="password"
            value={passwordData.old_password}
            onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
            placeholder="请输入当前密码"
            icon={Lock}
          />
          <Input
            label="新密码"
            type="password"
            value={passwordData.new_password}
            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
            placeholder="请输入新密码（至少6位）"
            icon={Lock}
          />
          <Input
            label="确认新密码"
            type="password"
            value={passwordData.confirm_password}
            onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
            placeholder="请再次输入新密码"
            icon={Lock}
          />
          <div className="flex justify-end pt-4">
            <Button onClick={handleChangePassword} loading={savingPassword} icon={Lock}>
              修改密码
            </Button>
          </div>
        </div>
      </Card>

      {/* Account Info */}
      <Card title="账户信息">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">用户ID</span>
            <p className="font-mono mt-1">{user?.uid}</p>
          </div>
          <div>
            <span className="text-gray-500">角色</span>
            <p className="mt-1">{user?.role === 'admin' ? '管理员' : '普通用户'}</p>
          </div>
          <div>
            <span className="text-gray-500">创建时间</span>
            <p className="mt-1">{user?.create_at || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">更新时间</span>
            <p className="mt-1">{user?.update_at || '-'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
