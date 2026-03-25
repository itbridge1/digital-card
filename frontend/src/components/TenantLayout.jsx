import React, { useState } from "react";
import {
  Layout,
  Menu,
  Button,
  theme,
  Typography,
  Dropdown,
  Avatar,
  Grid,
} from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  IdcardOutlined,
  LogoutOutlined,
  UserOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function TenantLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
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
      key: "change-password",
      icon: <LockOutlined />,
      label: "Change Password",
      onClick: () => navigate("/change-password"),
    },
    {
      type: "divider",
    },
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
      key: "/tenant/dashboard",
      icon: <DashboardOutlined />,
      label: <NavLink to="/tenant/dashboard">Dashboard</NavLink>,
    },
    {
      key: "/tenant/card-holders",
      icon: <IdcardOutlined />,
      label: <NavLink to="/tenant/card-holders">Card Holders</NavLink>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        breakpoint="lg"
        collapsedWidth={0}
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        onBreakpoint={(broken) => setCollapsed(broken)}
      >
        <div
          style={{
            textAlign: "center",
            color: "#fff",
            padding: "16px 8px",
            fontWeight: 700,
            fontSize: collapsed ? "14px" : "16px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            marginBottom: "8px",
          }}
        >
          {collapsed ? "T" : user.tenant?.name || "Tenant"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            paddingLeft: 12,
            paddingRight: isMobile ? 12 : 24,
          }}
          className="flex justify-between items-center"
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "16px", width: 50, height: 50 }}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <Avatar icon={<UserOutlined />} size="small" />
              {!isMobile && <Text strong>{user.name || "Tenant"}</Text>}
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: isMobile ? "12px" : "24px 16px",
            padding: isMobile ? 12 : 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
            overflowX: "auto",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default TenantLayout;
