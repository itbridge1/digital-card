import { useState, useEffect } from "react";
import {
  Layout,
  Select,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Modal,
  Avatar,
  Dropdown,
  Popconfirm,
} from "antd";
import CardList from "../components/CardList";
import CardForm from "../components/CardForm";
import { tenantAPI, cardAPI } from "../services/api";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalTaps: 0,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) fetchStats();
  }, [selectedTenant, refreshTrigger]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await tenantAPI.getAll();
      const data = res.data.data;
      setTenants(data);

      const savedTenantId = localStorage.getItem("selectedTenantId");

      if (savedTenantId) {
        const found = data.find((t) => t.tenantId === savedTenantId);
        if (found) setSelectedTenant(found);
        else setSelectedTenant(data[0]);
      } else if (data.length > 0) {
        setSelectedTenant(data[0]);
        localStorage.setItem("selectedTenantId", data[0].tenantId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await cardAPI.getAll(selectedTenant.tenantId);
      const cards = res.data.data;

      setStats({
        total: cards.length,
        active: cards.filter((c) => c.isActive).length,
        totalTaps: cards.reduce((sum, c) => sum + c.tapCount, 0),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTenantChange = (value) => {
    const tenant = tenants.find((t) => t.tenantId === value);
    setSelectedTenant(tenant);

    if (tenant) {
      localStorage.setItem("selectedTenantId", tenant.tenantId);
    }

    setRefreshTrigger((prev) => prev + 1);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCard(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setShowForm(true);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    handleLogout();
  };

  const cancelLogout = () => {
    setLogoutConfirmOpen(false);
  };

  const handleUserMenuClick = ({ key }) => {
    if (key === "logout") {
      setLogoutConfirmOpen(true);
    }
  };

  const userMenuItems = [
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  return (
    <Layout className="h-screen">
      {/* HEADER */}
      <Header
        className="bg-linear-to-r from-purple-600 to-purple-800 flex flex-nowrap justify-between items-center gap-2 sm:gap-3 md:gap-4 px-2 sm:px-4 md:px-6 py-2 sm:py-3 overflow-visible z-10"
        style={{ minHeight: "auto" }}
      >
        <div className="max-w-7xl mx-auto w-full flex flex-nowrap justify-between items-center gap-2 sm:gap-3 md:gap-4">
          <Title
            level={4}
            className="text-white! m-0 text-xs sm:text-sm md:text-lg whitespace-nowrap shrink-0  border-amber-100"
          >
            <span className="inline sm:hidden">NFC</span>
            <span className="hidden sm:inline">IT Bridge NFC</span>
          </Title>

          <div
            className="flex gap-1.5 sm:gap-2 items-center shrink-0"
            style={{ zIndex: 1000 }}
          >
            <Select
              value={selectedTenant?.tenantId}
              onChange={handleTenantChange}
              placeholder="Tenant"
              className="w-24 sm:w-32 md:w-44 lg:w-60"
              size="small"
              popupMatchSelectWidth={false}
            >
              {tenants.map((t) => (
                <Option key={t.tenantId} value={t.tenantId}>
                  {t.name} ({t.type})
                </Option>
              ))}
            </Select>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Popconfirm
                title="Logout"
                description="Are you sure you want to logout?"
                open={logoutConfirmOpen}
                onConfirm={confirmLogout}
                onCancel={cancelLogout}
                okText="Yes"
                cancelText="No"
              >
                <Avatar
                  icon={<UserOutlined />}
                  className="cursor-pointer shrink-0"
                  size="small"
                />
              </Popconfirm>
            </Dropdown>
          </div>
        </div>
      </Header>

      {/* CONTENT */}
      <Content className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-auto">
        {!selectedTenant ? (
          <div className="text-center py-20">
            <Title level={4}>No Tenant Selected</Title>
            <Text>Please select a tenant</Text>
          </div>
        ) : (
          <>
            {/* STATS */}
            <Row gutter={[8, 8]} className="mb-3 sm:mb-6">
              <Col xs={24} sm={12} md={8}>
                <Card size={isMobile ? "small" : "default"} className="h-full">
                  <Text className="text-xs sm:text-sm">Total Cards</Text>
                  <Title
                    level={isMobile ? 3 : 2}
                    className="m-0 mt-1 text-lg sm:text-2xl md:text-3xl"
                  >
                    {stats.total}
                  </Title>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Card size={isMobile ? "small" : "default"} className="h-full">
                  <Text className="text-xs sm:text-sm">Active Cards</Text>
                  <Title
                    level={isMobile ? 3 : 2}
                    className="m-0 mt-1 text-lg sm:text-2xl md:text-3xl"
                  >
                    {stats.active}
                  </Title>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Card size={isMobile ? "small" : "default"} className="h-full">
                  <Text className="text-xs sm:text-sm">Total Taps</Text>
                  <Title
                    level={isMobile ? 3 : 2}
                    className="m-0 mt-1 text-lg sm:text-2xl md:text-3xl"
                  >
                    {stats.totalTaps}
                  </Title>
                </Card>
              </Col>
            </Row>

            {/* CARDS SECTION */}
            <Card
              size={isMobile ? "small" : "default"}
              title={
                <span className="text-xs sm:text-sm md:text-base">
                  Registered Cards
                </span>
              }
              extra={
                <Button
                  type="primary"
                  size={isMobile ? "small" : "middle"}
                  onClick={() => setShowForm(true)}
                  className="text-xs sm:text-sm"
                >
                  + Register Card
                </Button>
              }
            >
              <CardList
                tenantId={selectedTenant.tenantId}
                onEdit={handleEdit}
                refreshTrigger={refreshTrigger}
              />
            </Card>
          </>
        )}
      </Content>

      {/* MODAL */}
      <Modal
        open={showForm}
        onCancel={() => setShowForm(false)}
        footer={null}
        title={editingCard ? "Edit Card" : "Register Card"}
        width={isMobile ? "95vw" : 800}
        style={{ maxWidth: "95vw" }}
      >
        <CardForm
          card={editingCard}
          tenantId={selectedTenant?.tenantId}
          tenantType={selectedTenant?.type}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </Layout>
  );
}

export default Dashboard;
