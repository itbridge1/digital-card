import { useState, useEffect, useRef } from "react";
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
  Upload,
  message,
  Alert,
  Descriptions,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import CardList from "../components/CardList";
import CardForm from "../components/CardForm";
import { tenantAPI, cardAPI } from "../services/api";
import { LogoutOutlined, UserOutlined, UploadOutlined, FolderOpenOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Dragger } = Upload;

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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [zipImportModalOpen, setZipImportModalOpen] = useState(false);
  const [zipImportFile, setZipImportFile] = useState(null);
  const [zipImporting, setZipImporting] = useState(false);
  const [zipImportResult, setZipImportResult] = useState(null);
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

  const handleImportOpen = () => {
    setImportFile(null);
    setImportResult(null);
    setImportModalOpen(true);
  };

  const handleZipImportOpen = () => {
    setZipImportFile(null);
    setZipImportResult(null);
    setZipImportModalOpen(true);
  };

  const handleImportConfirm = async () => {
    if (!importFile) {
      message.warning("Please select a file first");
      return;
    }
    if (!selectedTenant) {
      message.warning("Please select a tenant first");
      return;
    }
    setImporting(true);
    try {
      const res = await cardAPI.importCards(selectedTenant.tenantId, importFile);
      setImportResult(res.data);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      message.error(err.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleZipImportConfirm = async () => {
    if (!zipImportFile) {
      message.warning("Please select a ZIP file first");
      return;
    }
    if (!selectedTenant) {
      message.warning("Please select a tenant first");
      return;
    }
    setZipImporting(true);
    try {
      const res = await cardAPI.importZip(selectedTenant.tenantId, zipImportFile);
      setZipImportResult(res.data);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      message.error(err.response?.data?.error || "ZIP import failed");
    } finally {
      setZipImporting(false);
    }
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
                <div className="flex gap-2">
                  <Button
                    size={isMobile ? "small" : "middle"}
                    icon={<UploadOutlined />}
                    onClick={handleImportOpen}
                    className="text-xs sm:text-sm"
                  >
                    {isMobile ? "Import" : "Import Cards"}
                  </Button>
                  <Button
                    size={isMobile ? "small" : "middle"}
                    icon={<FolderOpenOutlined />}
                    onClick={handleZipImportOpen}
                    className="text-xs sm:text-sm"
                  >
                    {isMobile ? "ZIP" : "Import ZIP"}
                  </Button>
                  <Button
                    type="primary"
                    size={isMobile ? "small" : "middle"}
                    onClick={() => setShowForm(true)}
                    className="text-xs sm:text-sm"
                  >
                    + Register Card
                  </Button>
                </div>
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

      {/* IMPORT MODAL */}
      <Modal
        open={importModalOpen}
        onCancel={() => { if (!importing) setImportModalOpen(false); }}
        title="Import Card Holders"
        width={isMobile ? "95vw" : 560}
        style={{ maxWidth: "95vw" }}
        footer={
          importResult ? (
            <Button type="primary" onClick={() => setImportModalOpen(false)}>
              Close
            </Button>
          ) : (
            <div className="flex justify-end gap-2">
              <Button onClick={() => setImportModalOpen(false)} disabled={importing}>
                Cancel
              </Button>
              <Button type="primary" loading={importing} onClick={handleImportConfirm}>
                Import
              </Button>
            </div>
          )
        }
      >
        {importResult ? (
          <div className="space-y-3">
            <Alert
              type={importResult.summary.failed > 0 ? "warning" : "success"}
              message={importResult.message}
              showIcon
            />
            <Descriptions size="small" bordered column={3}>
              <Descriptions.Item label="Created">{importResult.summary.created}</Descriptions.Item>
              <Descriptions.Item label="Skipped">{importResult.summary.skipped}</Descriptions.Item>
              <Descriptions.Item label="Failed">{importResult.summary.failed}</Descriptions.Item>
            </Descriptions>
            {importResult.details.failed.length > 0 && (
              <div className="text-xs text-red-500">
                <strong>Failed rows:</strong>
                <ul className="mt-1 list-disc pl-4">
                  {importResult.details.failed.map((f, i) => (
                    <li key={i}>Row {f.row} {f.tagId ? `(${f.tagId})` : ""}: {f.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {importResult.details.skipped.length > 0 && (
              <div className="text-xs text-yellow-600">
                <strong>Skipped rows:</strong>
                <ul className="mt-1 list-disc pl-4">
                  {importResult.details.skipped.map((s, i) => (
                    <li key={i}>Row {s.row} {s.tagId ? `(${s.tagId})` : ""}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Upload an <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> file.
              The first row must be a header row.
              {selectedTenant?.type && (
                <> Columns for <strong>{selectedTenant.type}</strong> type:</>
              )}
            </p>
            {(() => {
              const type = selectedTenant?.type;
              const common = (
                <div>
                  <span className="font-semibold">Required: </span>Tag ID
                  <br />
                  <span className="font-semibold">Common: </span>Name, Email, Phone / Contact, Address, Business URL
                </div>
              );
              const schoolCols = (
                <div className="mt-1 text-indigo-700">
                  <span className="font-semibold">SCHOOL: </span>
                  Roll No, Name, Guardian, Address, Contact, Class, Section, House
                </div>
              );
              const hospitalCols = (
                <div className="mt-1 text-green-700">
                  <span className="font-semibold">HOSPITAL: </span>
                  Employee ID, Department, Specialization, License Number, Emergency Contact
                </div>
              );
              const businessCols = (
                <div className="mt-1 text-orange-700">
                  <span className="font-semibold">BUSINESS: </span>
                  Company, Position / Designation, LinkedIn, Website
                </div>
              );
              return (
                <div className="text-xs bg-gray-50 rounded p-2 leading-relaxed">
                  {common}
                  {(!type || type === "SCHOOL") && schoolCols}
                  {(!type || type === "HOSPITAL") && hospitalCols}
                  {(!type || type === "BUSINESS") && businessCols}
                </div>
              );
            })()}

            <Dragger
              accept=".xlsx,.xls,.csv"
              beforeUpload={(file) => { setImportFile(file); return false; }}
              onRemove={() => setImportFile(null)}
              maxCount={1}
              fileList={importFile ? [importFile] : []}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file here to upload</p>
              <p className="ant-upload-hint">.xlsx / .xls / .csv — max 10 MB</p>
            </Dragger>
          </div>
        )}
      </Modal>

      {/* ZIP IMPORT MODAL */}
      <Modal
        open={zipImportModalOpen}
        onCancel={() => { if (!zipImporting) setZipImportModalOpen(false); }}
        title="Import Cards + Photos (ZIP)"
        width={isMobile ? "95vw" : 580}
        style={{ maxWidth: "95vw" }}
        footer={
          zipImportResult ? (
            <Button type="primary" onClick={() => setZipImportModalOpen(false)}>
              Close
            </Button>
          ) : (
            <div className="flex justify-end gap-2">
              <Button onClick={() => setZipImportModalOpen(false)} disabled={zipImporting}>
                Cancel
              </Button>
              <Button type="primary" loading={zipImporting} onClick={handleZipImportConfirm}>
                Import
              </Button>
            </div>
          )
        }
      >
        {zipImportResult ? (
          <div className="space-y-3">
            <Alert
              type={zipImportResult.summary.failed > 0 ? "warning" : "success"}
              message={zipImportResult.message}
              showIcon
            />
            <Descriptions size="small" bordered column={3}>
              <Descriptions.Item label="Created">{zipImportResult.summary.created}</Descriptions.Item>
              <Descriptions.Item label="Skipped">{zipImportResult.summary.skipped}</Descriptions.Item>
              <Descriptions.Item label="Failed">{zipImportResult.summary.failed}</Descriptions.Item>
            </Descriptions>
            {zipImportResult.details.failed.length > 0 && (
              <div className="text-xs text-red-500">
                <strong>Failed rows:</strong>
                <ul className="mt-1 list-disc pl-4">
                  {zipImportResult.details.failed.map((f, i) => (
                    <li key={i}>Row {f.row} {f.tagId ? `(${f.tagId})` : ""}: {f.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {zipImportResult.details.skipped.length > 0 && (
              <div className="text-xs text-yellow-600">
                <strong>Skipped rows:</strong>
                <ul className="mt-1 list-disc pl-4">
                  {zipImportResult.details.skipped.map((s, i) => (
                    <li key={i}>Row {s.row} {s.tagId ? `(${s.tagId})` : ""}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Alert
              type="info"
              showIcon
              message="ZIP file structure"
              description={
                <div className="text-xs leading-relaxed">
                  Create a ZIP containing:
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">
                    <li>One <strong>.xlsx / .xls / .csv</strong> spreadsheet (same columns as normal import)</li>
                    <li>Profile photo files (<strong>.jpg / .png / .webp …</strong>) in the same root level</li>
                    <li>Add a <strong>Photo</strong> column in the spreadsheet whose value is the image filename (e.g. <code>_DSC0036.jpg</code>)</li>
                  </ul>
                </div>
              }
            />
            <Dragger
              accept=".zip"
              beforeUpload={(file) => { setZipImportFile(file); return false; }}
              onRemove={() => setZipImportFile(null)}
              maxCount={1}
              fileList={zipImportFile ? [zipImportFile] : []}
            >
              <p className="ant-upload-drag-icon">
                <FolderOpenOutlined />
              </p>
              <p className="ant-upload-text">Click or drag ZIP folder here</p>
              <p className="ant-upload-hint">.zip containing Excel + photos — max 50 MB</p>
            </Dragger>
          </div>
        )}
      </Modal>
    </Layout>
  );
}

export default Dashboard;
