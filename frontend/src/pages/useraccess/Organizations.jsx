import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Typography,
  message,
  Popconfirm,
  Avatar,
  Upload,
  Tooltip,
  Grid,
  Alert,
  Descriptions,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  UploadOutlined,
  SearchOutlined,
  KeyOutlined,
  UserAddOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useraccessAPI, uploadAPI } from "../../services/api";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

function Organizations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser.role === "admin";

  // Search / filter state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");

  // Tenant credential management state
  const [credModalOrg, setCredModalOrg] = useState(null);      // org being managed
  const [credAccount, setCredAccount] = useState(null);         // existing tenant account info
  const [credLoadingOrg, setCredLoadingOrg] = useState(null);  // tenantId currently loading
  const [credSaving, setCredSaving] = useState(false);
  const [otpResult, setOtpResult] = useState(null);            // { email, generatedPassword }
  const [createAccountForm] = Form.useForm();
  const [statusUpdatingOrgId, setStatusUpdatingOrgId] = useState(null);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await useraccessAPI.getOrganizations();
      setOrgs(res.data.data || []);
    } catch {
      message.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const openCreate = () => {
    setEditingOrg(null);
    setLogoUrl("");
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (org) => {
    setEditingOrg(org);
    setLogoUrl(org.logoUrl || "");
    form.setFieldsValue({
      tenantId: org.tenantId,
      name: org.name,
      type: org.type,
      contactEmail: org.contactEmail,
    });
    setModalOpen(true);
  };

  const handleLogoUpload = async (info) => {
    setLogoUploading(true);
    try {
      const { file, onSuccess, onError } = info;
      
      console.log("🔄 Upload info:", info);
      console.log("📁 File object:", file);
      console.log("📋 File type check:", file instanceof File, file instanceof Blob);
      
      if (!file) {
        message.error("No file selected");
        setLogoUploading(false);
        onError(new Error("No file selected"));
        return;
      }
      
        // Validate file type
        if (!file.type.startsWith('image/')) {
          const err = new Error('Please select an image file');
          message.error(err.message);
          onError(err);
          setLogoUploading(false);
          return;
        }
      
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          const err = new Error('File must be smaller than 5MB');
          message.error(err.message);
          onError(err);
          setLogoUploading(false);
          return;
        }
      
      console.log("📤 Uploading file:", file.name, file.type, file.size);
      
      const res = await uploadAPI.uploadLogo(file);
      
      console.log("✅ Server response:", res);
      console.log("📦 Response data:", res.data);
      
      const uploadedUrl = res.data?.url || res.data?.data?.url;
      
      if (uploadedUrl) {
        setLogoUrl(uploadedUrl);
        message.success("Logo uploaded successfully");
        console.log("✅ Logo uploaded to:", uploadedUrl);
        if (onSuccess) onSuccess(res.data);
      } else {
        console.error("❌ No URL in response:", res.data);
        message.error("Server did not return file URL");
        onError(new Error("No URL in response"));
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Logo upload failed";
      message.error(errorMsg);
      onError(err);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = { ...values, logoUrl: logoUrl || null };

      if (editingOrg) {
        await useraccessAPI.updateOrganization(editingOrg.tenantId, payload);
        message.success("Organization updated");
      } else {
        await useraccessAPI.createOrganization(payload);
        message.success("Organization created");
      }
      setModalOpen(false);
      fetchOrgs();
    } catch (err) {
      if (err?.response?.data?.error) {
        message.error(err.response.data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredOrgs = useMemo(() => {
    let data = orgs;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (o) =>
          o.name?.toLowerCase().includes(q) ||
          o.tenantId?.toLowerCase().includes(q) ||
          o.contactEmail?.toLowerCase().includes(q),
      );
    }
    if (typeFilter) data = data.filter((o) => o.type === typeFilter);
    if (statusFilter !== "") data = data.filter((o) => String(o.isActive) === statusFilter);
    if (managerFilter) {
      const qm = managerFilter.toLowerCase();
      data = data.filter(
        (o) =>
          o.creator?.name?.toLowerCase().includes(qm) ||
          o.creator?.email?.toLowerCase().includes(qm),
      );
    }
    return data;
  }, [orgs, search, typeFilter, statusFilter, managerFilter]);

  // Open credential management modal for an org
  const openCredModal = async (org) => {
    setCredModalOrg(org);
    setCredAccount(null);
    setOtpResult(null);
    createAccountForm.resetFields();
    setCredLoadingOrg(org.tenantId);
    try {
      const res = await useraccessAPI.getTenantAccount(org.tenantId);
      setCredAccount(res.data.data);
    } catch {
      message.error("Failed to load tenant account info");
    } finally {
      setCredLoadingOrg(null);
    }
  };

  const handleCreateTenantAccount = async () => {
    try {
      const values = await createAccountForm.validateFields();
      setCredSaving(true);
      const res = await useraccessAPI.createTenantAccount(credModalOrg.tenantId, values);
      const data = res.data.data;
      setOtpResult({ email: data.email, generatedPassword: data.generatedPassword });
      setCredAccount({ name: data.name, email: data.email, isActive: true, mustChangePassword: true });
      message.success("Tenant account created");
    } catch (err) {
      if (err?.response?.data?.error) message.error(err.response.data.error);
    } finally {
      setCredSaving(false);
    }
  };

  const handleResetCredentials = async () => {
    try {
      setCredSaving(true);
      const res = await useraccessAPI.resetCredentials(credModalOrg.tenantId);
      const data = res.data.data;
      setOtpResult({ email: data.email, generatedPassword: data.generatedPassword });
      setCredAccount((prev) => ({ ...prev, mustChangePassword: true, isActive: true }));
      message.success("Password reset successfully");
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to reset password");
    } finally {
      setCredSaving(false);
    }
  };

  const handleDeactivate = async (tenantId) => {
    setStatusUpdatingOrgId(tenantId);
    try {
      await useraccessAPI.deleteOrganization(tenantId);
      message.success("Organization deactivated");
      fetchOrgs();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to deactivate");
    } finally {
      setStatusUpdatingOrgId(null);
    }
  };

  const handleActivate = async (tenantId) => {
    setStatusUpdatingOrgId(tenantId);
    try {
      await useraccessAPI.updateOrganization(tenantId, { isActive: true });
      message.success("Organization activated");
      fetchOrgs();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to activate");
    } finally {
      setStatusUpdatingOrgId(null);
    }
  };

  const columns = [
    {
      title: "Logo",
      dataIndex: "logoUrl",
      width: 70,
      render: (url) =>
        url ? (
          <Avatar src={`${API_BASE}${url}`} shape="square" size={40} />
        ) : (
          <Avatar shape="square" size={40} icon={<EyeOutlined />} />
        ),
    },
    {
      title: "ID",
      dataIndex: "tenantId",
      render: (v) => <code>{v}</code>,
      sorter: (a, b) => a.tenantId.localeCompare(b.tenantId),
    },
    {
      title: "Name",
      dataIndex: "name",
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (v) => <Tag>{v}</Tag>,
      sorter: (a, b) => (a.type || "").localeCompare(b.type || ""),
    },
    {
      title: "Contact Email",
      dataIndex: "contactEmail",
      ellipsis: true,
      sorter: (a, b) => a.contactEmail.localeCompare(b.contactEmail),
    },
    ...(isAdmin
      ? [
          {
            title: "Manager",
            key: "manager",
            ellipsis: true,
            render: (_, record) =>
              record.creator ? (
                <Tooltip title={record.creator.email}>
                  <span>{record.creator.name}</span>
                </Tooltip>
              ) : (
                <span style={{ color: "#aaa" }}>—</span>
              ),
          },
        ]
      : []),
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
      render: (_, record) => (
        <Space>
          <Tooltip title="View card holders">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                navigate(
                  `${isAdmin ? "/admin" : "/manager"}/organizations/${record.tenantId}`,
                )
              }
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Manage Login">
            <Button
              size="small"
              icon={<KeyOutlined />}
              loading={credLoadingOrg === record.tenantId}
              onClick={() => openCredModal(record)}
            />
          </Tooltip>
          {isAdmin && record.isActive && (
            <Popconfirm
              title="Deactivate this organization?"
              onConfirm={() => handleDeactivate(record.tenantId)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Deactivate">
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  loading={statusUpdatingOrgId === record.tenantId}
                />
              </Tooltip>
            </Popconfirm>
          )}
          {isAdmin && !record.isActive && (
            <Popconfirm
              title="Activate this organization?"
              onConfirm={() => handleActivate(record.tenantId)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Activate">
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<CheckCircleOutlined />}
                  loading={statusUpdatingOrgId === record.tenantId}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Organizations
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New Organization
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          placeholder="Search name, ID..."
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 220 }}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          placeholder="All types"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setTypeFilter(v || "")}
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
          onChange={(v) => setStatusFilter(v ?? "")}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
        {isAdmin && (
          <Input
            placeholder="Filter by manager…"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 180 }}
            onChange={(e) => setManagerFilter(e.target.value)}
          />
        )}
      </Space>
      <Table
        columns={columns}
        dataSource={filteredOrgs}
        rowKey="tenantId"
        loading={loading}
        pagination={{ pageSize: 10 }}
        tableLayout="fixed"
        scroll={{ x: "max-content", y: isMobile ? 420 : 560 }}
        size={isMobile ? "small" : "middle"}
      />

      <Modal
        title={editingOrg ? "Edit Organization" : "New Organization"}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editingOrg ? "Save Changes" : "Create"}
        width={isMobile ? "95%" : 560}
      >        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Organization ID"
            name="tenantId"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input
              placeholder="e.g. ACME_CORP"
              disabled={!!editingOrg}
              style={{ textTransform: "uppercase" }}
            />
          </Form.Item>

          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="Organization display name" />
          </Form.Item>

          <Form.Item
            label="Type"
            name="type"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select placeholder="Select type">
              <Option value="SCHOOL">School</Option>
              <Option value="HOSPITAL">Hospital</Option>
              <Option value="BUSINESS">Business</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Contact Email"
            name="contactEmail"
            rules={[
              { required: true, message: "Required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input placeholder="contact@org.com" />
          </Form.Item>

          <Form.Item label="Logo">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {logoUrl && (
                <Avatar
                  src={`${API_BASE}${logoUrl}`}
                  shape="square"
                  size={48}
                  style={{ border: "1px solid #e0e0e0" }}
                />
              )}
              <Upload
                accept="image/*"
                showUploadList={false}
                maxCount={1}
                  customRequest={handleLogoUpload}
              >
                <Button icon={<UploadOutlined />} loading={logoUploading}>
                  {logoUrl ? "Change Logo" : "Upload Logo"}
                </Button>
              </Upload>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Credential Management Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined />
            <span>
              Login Credentials — {credModalOrg?.name}
            </span>
          </Space>
        }
        open={!!credModalOrg}
        onCancel={() => { setCredModalOrg(null); setOtpResult(null); }}
        footer={null}
        width={isMobile ? "95%" : 500}
        destroyOnClose
      >
        {/* Show generated password result */}
        {otpResult && (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            message="Password generated — share this with the organization"
            description={
              <div>
                <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
                  <Descriptions.Item label="Email">
                    <Text copyable>{otpResult.email}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="One-Time Password">
                    <Text
                      strong
                      copyable
                      style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 2 }}
                    >
                      {otpResult.generatedPassword}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  The organization will be prompted to change this password on first login.
                </Text>
              </div>
            }
          />
        )}

        {/* Existing account info */}
        {credAccount ? (
          <div>
            <Descriptions
              title="Current Tenant Account"
              size="small"
              column={1}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="Name">{credAccount.name}</Descriptions.Item>
              <Descriptions.Item label="Email">{credAccount.email}</Descriptions.Item>
              <Descriptions.Item label="Status">
                {credAccount.isActive ? (
                  <Tag color="green">Active</Tag>
                ) : (
                  <Tag color="red">Inactive</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Must Change Password">
                {credAccount.mustChangePassword ? (
                  <Tag color="orange">Yes — awaiting first login</Tag>
                ) : (
                  <Tag color="green">No</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Popconfirm
              title="Reset password?"
              description="A new one-time password will be generated. The previous password will no longer work."
              onConfirm={handleResetCredentials}
              okText="Reset"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<KeyOutlined />}
                loading={credSaving}
                block
              >
                Generate New One-Time Password
              </Button>
            </Popconfirm>
          </div>
        ) : (
          /* No account yet — show create form */
          <div>
            <Alert
              type="info"
              showIcon
              message="No login account exists for this organization yet."
              style={{ marginBottom: 16 }}
            />
            <Form
              form={createAccountForm}
              layout="vertical"
              onFinish={handleCreateTenantAccount}
            >
              <Form.Item
                label="Contact Name"
                name="name"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input placeholder="Full name of the account holder" />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Required" },
                  { type: "email", message: "Invalid email" },
                ]}
              >
                <Input placeholder="login@organization.com" />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={credSaving}
                icon={<UserAddOutlined />}
                block
              >
                Create Tenant Login &amp; Generate Password
              </Button>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Organizations;
