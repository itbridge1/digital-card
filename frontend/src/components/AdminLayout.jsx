import React, { useState } from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  ApartmentOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, theme, Avatar, Typography, Dropdown } from "antd";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const userMenuItems = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
      danger: true,
    },
  ];

  const menuItems = [
    {
      key: "/admin/dashboard",
      icon: <DashboardOutlined />,
      label: <NavLink to="/admin/dashboard">Dashboard</NavLink>,
    },
    {
      key: "/admin/users",
      icon: <UserOutlined />,
      label: <NavLink to="/admin/users">Users</NavLink>,
    },
    {
      key: "/admin/card-registration",
      icon: <CreditCardOutlined />,
      label: <NavLink to="/admin/card-registration">Card Registration</NavLink>,
    },
    {
      key: "/manager/organizations",
      icon: <ApartmentOutlined />,
      label: <NavLink to="/admin/organizations">Organizations</NavLink>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="text-center text-white py-4 text-lg font-semibold">
          {collapsed ? "NFC" : "NFC Admin"}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        {/* Header */}
        <Header
          style={{ background: colorBgContainer, paddingLeft: 16, paddingRight: 24 }}
          className="flex justify-between items-center"
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "16px", width: 50, height: 50 }}
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Avatar icon={<UserOutlined />} size="small" />
              <Text strong>{user.name || "Admin"}</Text>
            </div>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: "24px 16px",
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

export default AdminLayout;

