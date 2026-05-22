import React, { useEffect, useState } from "react";
import { Layout, Menu, Button, Typography, Dropdown, Avatar, Grid } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  IdcardOutlined,
  LogoutOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function TenantLayout() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const siderCollapsed = isMobile ? !mobileOpen : desktopCollapsed;

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const toggleSider = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setDesktopCollapsed((prev) => !prev);
    }
  };

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
    { type: "divider" },
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

  const orgName = user.tenant?.name || "Tenant";
  const initials = orgName.charAt(0).toUpperCase();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        breakpoint="lg"
        collapsedWidth={0}
        width={240}
        collapsed={siderCollapsed}
        onCollapse={(value) => {
          if (isMobile) setMobileOpen(!value);
          else setDesktopCollapsed(value);
        }}
        onBreakpoint={(broken) => {
          if (!broken) setMobileOpen(false);
        }}
        style={
          isMobile
            ? {
                position: "fixed",
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 1001,
                height: "100vh",
              }
            : undefined
        }
      >
        {siderCollapsed ? (
          <div className="nfc-sidebar-brand-collapsed">
            <div className="nfc-sidebar-brand-logo">
              {/* <img
                src="/logo.png"
                alt="ITB"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              /> */}
              <span
                style={{
                  display: "none",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {initials}
              </span>
            </div>
          </div>
        ) : (
          <div className="nfc-sidebar-brand">
            <div className="nfc-sidebar-brand-logos">
              {/* <img
                src="/logo.png"
                alt="ITB"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              /> */}
              <span
                style={{
                  display: "none",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {initials}
              </span>
            </div>
            <div>
              <div className="nfc-sidebar-brand-title">{orgName}</div>
              {/* <div className="nfc-sidebar-brand-sub">Organization Portal</div> */}
            </div>
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={() => {
            if (isMobile) setMobileOpen(false);
          }}
          style={{ border: "none", paddingLeft: 8, paddingRight: 8 }}
        />
      </Sider>

      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 1000,
          }}
        />
      )}

      <Layout>
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
            icon={
              siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
            }
            onClick={toggleSider}
            style={{
              fontSize: "15px",
              width: 40,
              height: 40,
              color: "#64748b",
            }}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f1f5f9")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <Avatar
                size={30}
                style={{ background: "#27272a", fontSize: 12, fontWeight: 700 }}
              >
                {(user.name || "T").charAt(0).toUpperCase()}
              </Avatar>
              {!isMobile && (
                <div>
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    {user.name || "Tenant"}
                  </Text>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      lineHeight: 1,
                      marginTop: 2,
                    }}
                  >
                    {orgName}
                  </div>
                </div>
              )}
            </div>
          </Dropdown>
        </Header>

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

export default TenantLayout;
