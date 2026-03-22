import React, { useEffect, useState } from "react";
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  EyeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useraccessAPI, uploadAPI } from "../../services/api";

const { Title } = Typography;
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

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser.role === "admin";
  console.log("orgs", orgs);

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

  const handleDeactivate = async (tenantId) => {
    try {
      await useraccessAPI.deleteOrganization(tenantId);
      message.success("Organization deactivated");
      fetchOrgs();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to deactivate");
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
    },
    { title: "Name", dataIndex: "name", ellipsis: true },
    {
      title: "Type",
      dataIndex: "type",
      render: (v) => <Tag>{v}</Tag>,
    },
    { title: "Contact Email", dataIndex: "contactEmail", ellipsis: true },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (v) => (
        <Tag color={v ? "success" : "default"}>{v ? "Active" : "Inactive"}</Tag>
      ),
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
          {isAdmin && record.isActive && (
            <Popconfirm
              title="Deactivate this organization?"
              onConfirm={() => handleDeactivate(record.tenantId)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Deactivate">
                <Button size="small" danger icon={<StopOutlined />} />
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

      <Table
        columns={columns}
        dataSource={orgs}
        rowKey="tenantId"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingOrg ? "Edit Organization" : "New Organization"}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editingOrg ? "Save Changes" : "Create"}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
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
    </div>
  );
}

export default Organizations;
