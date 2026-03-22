import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Typography, Dropdown, Avatar } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  ApartmentOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function UserAccessLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ];

  const menuItems = [
    {
      key: '/manager/dashboard',
      icon: <DashboardOutlined />,
      label: <NavLink to="/manager/dashboard">Dashboard</NavLink>,
    },
    {
      key: '/manager/organizations',
      icon: <ApartmentOutlined />,
      label: <NavLink to="/manager/organizations">Organizations</NavLink>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div
          style={{
            textAlign: 'center',
            color: '#fff',
            padding: '16px 8px',
            fontWeight: 700,
            fontSize: collapsed ? '14px' : '16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '8px',
          }}
        >
          {collapsed ? 'UA' : 'User Access'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[
            location.pathname.startsWith('/manager/organizations')
              ? '/manager/organizations'
              : location.pathname,
          ]}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{ background: colorBgContainer, paddingLeft: 16, paddingRight: 24 }}
          className="flex justify-between items-center"
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 50, height: 50 }}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} size="small" />
              <Text strong>{user.name || 'User Access'}</Text>
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default UserAccessLayout;
