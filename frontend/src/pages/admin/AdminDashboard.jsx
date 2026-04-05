import React, { useEffect, useState, useMemo } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  message,
  Table,
  Tag,
  Space,
  Popconfirm,
  Tooltip,
  Avatar,
  Grid,
} from "antd";
import {
  PlusOutlined,
  UserOutlined,
  ApartmentOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useraccessAPI, authAPI, managerAPI } from "../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

const currentUserId = () => JSON.parse(localStorage.getItem("user") || "{}").id;

function AdminDashboard() {
  const [orgs, setOrgs] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // Search / filter state
  const [managerSearch, setManagerSearch] = useState("");
  const [managerRoleFilter, setManagerRoleFilter] = useState("");
  const [managerStatusFilter, setManagerStatusFilter] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [orgTypeFilter, setOrgTypeFilter] = useState("");
  const [orgStatusFilter, setOrgStatusFilter] = useState("");

  const fetchOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const res = await useraccessAPI.getOrganizations();
      setOrgs(res.data.data || []);
    } catch {
      message.error("Failed to load organizations");
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchManagers = async () => {
    setLoadingManagers(true);
    try {
      const res = await managerAPI.getAll();
      setManagers(res.data.data || []);
    } catch {
      message.error("Failed to load manager accounts");
    } finally {
      setLoadingManagers(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
    fetchManagers();
  }, []);

  const activeOrgs = orgs.filter((o) => o.isActive).length;
  const activeManagers = managers.filter(
    (m) => m.isActive && m.role === "manager",
  ).length;

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await authAPI.register(values);
      message.success("Account created successfully");
      setCreateModalOpen(false);
      form.resetFields();
      fetchManagers();
    } catch (err) {
      if (err?.response?.data?.error) {
        message.error(err.response.data.error);
      } else if (err?.response?.data?.errors) {
        message.error(err.response.data.errors[0]?.msg || "Validation failed");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await managerAPI.deactivate(id);
      message.success("Account deactivated");
      fetchManagers();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to deactivate");
    }
  };

  const handleActivate = async (id) => {
    try {
      await managerAPI.activate(id);
      message.success("Account activated");
      fetchManagers();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to activate");
    }
  };

  const handleDelete = async (id) => {
    try {
      await managerAPI.remove(id);
      message.success("Account deleted");
      fetchManagers();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to delete");
    }
  };

  const filteredManagers = useMemo(() => {
    let data = managers;
    if (managerSearch) {
      const q = managerSearch.toLowerCase();
      data = data.filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.Tenant?.name?.toLowerCase().includes(q),
      );
    }
    if (managerRoleFilter)
      data = data.filter((m) => m.role === managerRoleFilter);
    if (managerStatusFilter !== "")
      data = data.filter((m) => String(m.isActive) === managerStatusFilter);
    return data;
  }, [managers, managerSearch, managerRoleFilter, managerStatusFilter]);

  const filteredOrgs = useMemo(() => {
    let data = orgs;
    if (orgSearch) {
      const q = orgSearch.toLowerCase();
      data = data.filter(
        (o) =>
          o.name?.toLowerCase().includes(q) ||
          o.tenantId?.toLowerCase().includes(q) ||
          o.contactEmail?.toLowerCase().includes(q),
      );
    }
    if (orgTypeFilter) data = data.filter((o) => o.type === orgTypeFilter);
    if (orgStatusFilter !== "")
      data = data.filter((o) => String(o.isActive) === orgStatusFilter);
    return data;
  }, [orgs, orgSearch, orgTypeFilter, orgStatusFilter]);

  const orgColumns = [
    {
      title: "ID",
      dataIndex: "tenantId",
      render: (v) => <code>{v}</code>,
      sorter: (a, b) => a.tenantId.localeCompare(b.tenantId),
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (v) => <Tag>{v}</Tag>,
      sorter: (a, b) => (a.type || "").localeCompare(b.type || ""),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (v) => (
        <Tag color={v ? "success" : "default"}>{v ? "Active" : "Inactive"}</Tag>
      ),
      sorter: (a, b) => Number(b.isActive) - Number(a.isActive),
    },
  ];

  const managerColumns = [
    {
      title: "",
      width: 40,
      render: () => <Avatar size={28} icon={<UserOutlined />} />,
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Email",
      dataIndex: "email",
      ellipsis: true,
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (v) => (
        <Tag color={v === "admin" ? "gold" : "blue"}>
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </Tag>
      ),
      sorter: (a, b) => a.role.localeCompare(b.role),
    },
    // {
    //   title: "Organization",
    //   render: (_, r) => r.Tenant?.name || <Text type="secondary">—</Text>,
    //   sorter: (a, b) =>
    //     (a.Tenant?.name || "").localeCompare(b.Tenant?.name || ""),
    // },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (v) => (
        <Tag color={v ? "success" : "default"}>{v ? "Active" : "Inactive"}</Tag>
      ),
      sorter: (a, b) => Number(b.isActive) - Number(a.isActive),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const isSelf = record.id === currentUserId();
        return (
          <Space>
            {record.isActive ? (
              <Popconfirm
                title="Deactivate this account?"
                onConfirm={() => handleDeactivate(record.id)}
                okText="Yes"
                cancelText="No"
                disabled={isSelf}
              >
                <Tooltip
                  title={isSelf ? "Cannot deactivate yourself" : "Deactivate"}
                >
                  <Button
                    size="small"
                    icon={<StopOutlined />}
                    disabled={isSelf}
                  />
                </Tooltip>
              </Popconfirm>
            ) : (
              <Popconfirm
                title="Activate this account?"
                onConfirm={() => handleActivate(record.id)}
                okText="Yes"
                cancelText="No"
                disabled={isSelf}
              >
                <Tooltip title="Activate">
                  <Button
                    size="small"
                    icon={<CheckCircleOutlined />}
                    disabled={isSelf}
                    style={{ color: "#3f8600", borderColor: "#3f8600" }}
                  />
                </Tooltip>
              </Popconfirm>
            )}
            <Popconfirm
              title="Permanently delete this account?"
              description="This cannot be undone."
              onConfirm={() => handleDelete(record.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              disabled={isSelf}
            >
              <Tooltip
                title={isSelf ? "Cannot delete yourself" : "Delete permanently"}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={isSelf}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={4} style={{ marginBottom: 2, letterSpacing: "-0.02em" }}>
          Admin Dashboard
        </Title>
        <Text style={{ color: "#64748b", fontSize: 13 }}>
          Overview of organizations and manager accounts.
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="nfc-stat-card nfc-stat-card-primary">
            <Statistic
              title={
                <span
                  style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}
                >
                  Total Organizations
                </span>
              }
              value={orgs.length}
              prefix={
                <ApartmentOutlined
                  style={{ color: "#5046e5", marginRight: 4 }}
                />
              }
              valueStyle={{ color: "#0f172a", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="nfc-stat-card nfc-stat-card-success">
            <Statistic
              title={
                <span
                  style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}
                >
                  Active Organizations
                </span>
              }
              value={activeOrgs}
              prefix={
                <ApartmentOutlined
                  style={{ color: "#10b981", marginRight: 4 }}
                />
              }
              valueStyle={{ color: "#10b981", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="nfc-stat-card nfc-stat-card-info">
            <Statistic
              title={
                <span
                  style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}
                >
                  Active Managers
                </span>
              }
              value={activeManagers}
              prefix={
                <UserOutlined style={{ color: "#0ea5e9", marginRight: 4 }} />
              }
              valueStyle={{ color: "#0ea5e9", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Managers table */}
      <Card
        title="Manager Accounts"
        style={{ marginBottom: 24 }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            Add Manager
          </Button>
        }
        loading={loadingManagers}
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <Input
            placeholder="Search name,org…"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 220 }}
            onChange={(e) => setManagerSearch(e.target.value)}
          />
          <Select
            placeholder="All roles"
            allowClear
            style={{ width: 130 }}
            onChange={(v) => setManagerRoleFilter(v || "")}
            options={[
              { value: "admin", label: "Admin" },
              { value: "manager", label: "Manager" },
            ]}
          />
          <Select
            placeholder="All statuses"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => setManagerStatusFilter(v ?? "")}
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </Space>
        <Table
          columns={managerColumns}
          dataSource={filteredManagers}
          rowKey="id"
          pagination={{ pageSize: 8 }}
          size="small"
          scroll={{ x: 980 }}
        />
      </Card>

      {/* Organizations table */}
      <Card title="Organizations" loading={loadingOrgs}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input
            placeholder="Search name, ID"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 220 }}
            onChange={(e) => setOrgSearch(e.target.value)}
          />
          <Select
            placeholder="All types"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => setOrgTypeFilter(v || "")}
            options={[
              { value: "SCHOOL", label: "School" },
              { value: "HOSPITAL", label: "Hospital" },
              { value: "BUSINESS", label: "Business" },
            ]}
          />
          <Select
            placeholder="All statuses"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => setOrgStatusFilter(v ?? "")}
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </Space>
        <Table
          columns={orgColumns}
          dataSource={filteredOrgs}
          rowKey="tenantId"
          pagination={{ pageSize: 5 }}
          size="small"
          scroll={{ x: 640 }}
        />
      </Card>

      {/* Create manager modal */}
      <Modal
        title="Add Manager Account"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={creating}
        okText="Create Account"
        width={isMobile ? "95%" : 560}
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Manager accounts can manage organizations and card holders.
        </Text>
        <Form form={form} layout="vertical">
          <Form.Item
            label="Full Name"
            name="name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="Full name" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Required" },
              { min: 6, message: "Min 6 characters" },
            ]}
          >
            <Input.Password placeholder="********" />
          </Form.Item>
          {/* <Form.Item label="Organization" name="tenantId">
            <Select placeholder="Assign to organization">
              {orgs.filter((o) => o.isActive).map((o) => (
                <Option key={o.tenantId} value={o.tenantId}>
                  {o.name} ({o.tenantId})
                </Option>
              ))}
            </Select>
          </Form.Item> */}
          <Form.Item label="Role" name="role" initialValue="manager">
            <Select>
              <Option value="manager">Manager</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminDashboard;
