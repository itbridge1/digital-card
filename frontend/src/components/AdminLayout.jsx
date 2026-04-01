import React, { useState } from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  ApartmentOutlined,
  CreditCardOutlined,
  AppstoreAddOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Avatar, Typography, Dropdown, Grid } from "antd";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

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
    // {
    //   key: "/admin/users",
    //   icon: <UserOutlined />,
    //   label: <NavLink to="/admin/users">Users</NavLink>,
    // },
    {
      key: "/admin/card-registration",
      icon: <CreditCardOutlined />,
      label: <NavLink to="/admin/card-registration">Card Registration</NavLink>,
    },
    {
      key: "/admin/card-templates",
      icon: <AppstoreAddOutlined />,
      label: <NavLink to="/admin/card-templates">Card Templates</NavLink>,
    },
    {
      key: "/admin/organizations",
      icon: <ApartmentOutlined />,
      label: <NavLink to="/admin/organizations">Organizations</NavLink>,
    },
  ];

  const brandLogo = (
    <div className="nfc-sidebar-brand-logo">
      <img
        src="/logo.png"
        alt="ITB"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
      />
      <span style={{ display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: 13, fontWeight: 700 }}>NF</span>
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider
        trigger={null}
        collapsible
        breakpoint="lg"
        collapsedWidth={0}
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        onBreakpoint={(broken) => setCollapsed(broken)}
      >
        {collapsed ? (
          <div className="nfc-sidebar-brand-collapsed">
            {brandLogo}
          </div>
        ) : (
          <div className="nfc-sidebar-brand">
            {brandLogo}
            <div>
              <div className="nfc-sidebar-brand-title">NFC Admin</div>
              {/* <div className="nfc-sidebar-brand-sub">IT Bridge Platform</div> */}
            </div>
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ border: "none", paddingLeft: 8, paddingRight: 8 }}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        {/* Header */}
        <Header
          className="nfc-header"
          style={{
            paddingLeft: 12,
            paddingRight: isMobile ? 12 : 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 60,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "15px", width: 40, height: 40, color: "#64748b" }}
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 8, transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <Avatar
                size={30}
                style={{ background: "#27272a", fontSize: 12, fontWeight: 700 }}
              >
                {(user.name || "A").charAt(0).toUpperCase()}
              </Avatar>
              {!isMobile && (
                <div>
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>{user.name || "Admin"}</Text>
                  <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1, marginTop: 2 }}>Administrator</div>
                </div>
              )}
            </div>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: isMobile ? 12 : "20px 20px",
            padding: isMobile ? 12 : 24,
            background: "#ffffff",
            borderRadius: 14,
            minHeight: 280,
            overflowX: "auto",
            boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
            border: "1px solid #e2e8f0",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminLayout;

