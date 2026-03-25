import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Typography,
  message,
  Popconfirm,
  Avatar,
  Upload,
  Tag,
  Spin,
  Tooltip,
  Alert,
  Grid,
} from "antd";
import {
  EditOutlined,
  StopOutlined,
  UndoOutlined,
  UploadOutlined,
  UserOutlined,
  EyeOutlined,
  CopyOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { tenantPortalAPI, uploadAPI } from "../../services/api";

const { Title, Text } = Typography;
const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function TenantCardHolders() {
  const [cards, setCards] = useState([]);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [search, setSearch] = useState("");
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cardsRes, meRes] = await Promise.all([
        tenantPortalAPI.getCards(),
        tenantPortalAPI.getMe(),
      ]);
      setCards(cardsRes.data.data || []);
      setOrg(meRes.data.data || null);
    } catch {
      message.error("Failed to load card holders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── edit modal ──────────────────────────────────────────────────
  const openEdit = (card) => {
    setEditingCard(card);
    setProfileUrl(card.profileImageUrl || "");
    const m = card.metadata || {};

    // Decompose merged "Grade(Section)" back to separate fields for editing
    let editGrade = m.grade || "";
    let editSection = "";
    const sectionMatch = editGrade.match(/^(.+)\((.+)\)$/);
    if (sectionMatch) {
      editGrade = sectionMatch[1];
      editSection = sectionMatch[2];
    }

    form.setFieldsValue({
      name: m.name || "",
      email: m.email || "",
      phone: m.phone || "",
      address: m.address || "",
      // SCHOOL
      studentId: m.studentId || "",
      grade: editGrade,
      section: editSection,
      house: m.house || "",
      guardianName: m.guardianName || "",
      // HOSPITAL
      employeeId: m.employeeId || "",
      department: m.department || "",
      specialization: m.specialization || "",
      licenseNumber: m.licenseNumber || "",
      emergencyContact: m.emergencyContact || "",
      // BUSINESS
      company: m.company || "",
      position: m.position || "",
      linkedIn: m.linkedIn || "",
      website: m.website || "",
    });
    setModalOpen(true);
  };

  // ── profile upload ───────────────────────────────────────────────
  const handleProfileUpload = async (info) => {
    const { file, onSuccess, onError } = info;
    const rawFile = file?.originFileObj || file;
    setProfileUploading(true);
    try {
      if (!rawFile || !rawFile.type?.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }
      if (rawFile.size > 5 * 1024 * 1024) {
        throw new Error("Image must be smaller than 5MB");
      }
      const res = await uploadAPI.uploadProfile(rawFile);
      const url = res.data?.url || res.data?.data?.url;
      if (!url) throw new Error("Server did not return uploaded file URL");
      setProfileUrl(url);
      message.success("Profile photo uploaded");
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      message.error(err?.response?.data?.error || err.message || "Upload failed");
      if (onError) onError(err);
    } finally {
      setProfileUploading(false);
    }
  };

  // ── save edit ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (profileUploading) {
      message.warning("Please wait for the image upload to finish");
      return;
    }
    try {
      const values = await form.validateFields();
      setSaving(true);
      const orgType = org?.type;

      const metadata = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
      };

      if (orgType === "SCHOOL") {
        const rawGrade = (values.grade || "").trim();
        const rawSection = (values.section || "").trim();
        const mergedGrade =
          rawGrade && rawSection ? `${rawGrade}(${rawSection})` : rawGrade;
        Object.assign(metadata, {
          studentId: values.studentId,
          grade: mergedGrade,
          house: values.house,
          guardianName: values.guardianName,
        });
        delete metadata.email;
      } else if (orgType === "HOSPITAL") {
        Object.assign(metadata, {
          employeeId: values.employeeId,
          department: values.department,
          specialization: values.specialization,
          licenseNumber: values.licenseNumber,
          emergencyContact: values.emergencyContact,
        });
      } else {
        Object.assign(metadata, {
          company: values.company,
          position: values.position,
          linkedIn: values.linkedIn,
          website: values.website,
        });
      }

      await tenantPortalAPI.updateCard(editingCard.id, {
        profileImageUrl: profileUrl || null,
        metadata,
      });
      message.success("Card holder updated");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      if (err?.response?.data?.error) {
        message.error(err.response.data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── soft deactivate ──────────────────────────────────────────────
  const handleDeactivate = async (cardId) => {
    try {
      await tenantPortalAPI.deactivateCard(cardId);
      message.success("Card holder deactivated");
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to deactivate");
    }
  };

  // ── restore ──────────────────────────────────────────────────────
  const handleRestore = async (cardId) => {
    try {
      await tenantPortalAPI.restoreCard(cardId);
      message.success("Card holder restored");
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to restore");
    }
  };

  // ── filtered cards ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return cards;
    const q = search.toLowerCase();
    return cards.filter((c) => {
      const m = c.metadata || {};
      return (
        (m.name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.studentId || "").toLowerCase().includes(q) ||
        (m.employeeId || "").toLowerCase().includes(q) ||
        (c.tagId || "").toLowerCase().includes(q)
      );
    });
  }, [cards, search]);

  // ── table columns ────────────────────────────────────────────────
  const columns = [
    {
      title: "Photo",
      key: "photo",
      width: 56,
      render: (_, record) =>
        record.profileImageUrl ? (
          <Avatar
            src={`${API_BASE}${record.profileImageUrl}`}
            size="default"
          />
        ) : (
          <Avatar icon={<UserOutlined />} size="default" />
        ),
    },
    {
      title: "Name",
      key: "name",
      render: (_, r) => {
        const m = r.metadata || {};
        return <Text strong>{m.name || <Text type="secondary">—</Text>}</Text>;
      },
      sorter: (a, b) =>
        (a.metadata?.name || "").localeCompare(b.metadata?.name || ""),
    },
    {
      title: "Tag ID",
      dataIndex: "tagId",
      key: "tagId",
      render: (v) => (
        <Space size={4}>
          <Text code style={{ fontSize: 11 }}>
            {v}
          </Text>
          <Tooltip title="Copy tag ID">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(v);
                message.success("Copied");
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Details",
      key: "details",
      render: (_, r) => {
        const m = r.metadata || {};
        const orgType = org?.type;
        if (orgType === "SCHOOL") {
          return (
            <Space direction="vertical" size={0}>
              {m.studentId && <Text type="secondary">ID: {m.studentId}</Text>}
              {m.grade && <Text type="secondary">Grade: {m.grade}</Text>}
            </Space>
          );
        }
        if (orgType === "HOSPITAL") {
          return (
            <Space direction="vertical" size={0}>
              {m.employeeId && <Text type="secondary">EID: {m.employeeId}</Text>}
              {m.department && <Text type="secondary">{m.department}</Text>}
            </Space>
          );
        }
        return (
          <Space direction="vertical" size={0}>
            {m.email && <Text type="secondary">{m.email}</Text>}
            {m.phone && <Text type="secondary">{m.phone}</Text>}
          </Space>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_, r) =>
        r.isActive ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: isMobile ? 100 : 160,
      render: (_, record) => (
        <Space>
          {record.publicUrl && (
            <Tooltip title="View public card">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => window.open(record.publicUrl, "_blank")}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          {record.isActive ? (
            <Popconfirm
              title="Deactivate this card holder?"
              description="The record is kept but the card will be marked inactive."
              onConfirm={() => handleDeactivate(record.id)}
              okText="Deactivate"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Deactivate">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<StopOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Restore this card holder?"
              onConfirm={() => handleRestore(record.id)}
              okText="Restore"
            >
              <Tooltip title="Restore">
                <Button
                  type="text"
                  size="small"
                  icon={<UndoOutlined />}
                  style={{ color: "#1677ff" }}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── org-type-specific form fields ────────────────────────────────
  const renderTypeFields = () => {
    const orgType = org?.type;
    if (orgType === "SCHOOL") {
      return (
        <>
          <Form.Item label="Student ID" name="studentId">
            <Input />
          </Form.Item>
          <Form.Item label="Grade" name="grade">
            <Input />
          </Form.Item>
          <Form.Item label="Section" name="section">
            <Input />
          </Form.Item>
          <Form.Item label="House" name="house">
            <Input />
          </Form.Item>
          <Form.Item label="Guardian Name" name="guardianName">
            <Input />
          </Form.Item>
        </>
      );
    }
    if (orgType === "HOSPITAL") {
      return (
        <>
          <Form.Item label="Employee ID" name="employeeId">
            <Input />
          </Form.Item>
          <Form.Item label="Department" name="department">
            <Input />
          </Form.Item>
          <Form.Item label="Specialization" name="specialization">
            <Input />
          </Form.Item>
          <Form.Item label="License No." name="licenseNumber">
            <Input />
          </Form.Item>
          <Form.Item label="Emergency Contact" name="emergencyContact">
            <Input />
          </Form.Item>
        </>
      );
    }
    return (
      <>
        <Form.Item label="Company" name="company">
          <Input />
        </Form.Item>
        <Form.Item label="Position" name="position">
          <Input />
        </Form.Item>
        <Form.Item label="LinkedIn" name="linkedIn">
          <Input />
        </Form.Item>
        <Form.Item label="Website" name="website">
          <Input />
        </Form.Item>
      </>
    );
  };

  if (loading) return <Spin style={{ display: "block", marginTop: 80 }} />;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>
        Card Holders
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        {org ? `${org.name} — ${org.type}` : "Your organization"}
      </Text>

      <Alert
        type="info"
        showIcon
        message="You can edit card holder details and deactivate / restore cards. Adding or permanently deleting cards is managed by your administrator."
        style={{ marginBottom: 16 }}
        closable
      />

      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <Input
          placeholder="Search by name, email, ID or tag…"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 300 }}
        />
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: true }}
        rowClassName={(r) => (!r.isActive ? "row-inactive" : "")}
      />

      {/* Edit Modal */}
      <Modal
        open={modalOpen}
        title="Edit Card Holder"
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Save"
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small">
          {/* Profile photo upload */}
          <Form.Item label="Profile Photo">
            <Space align="start">
              {profileUrl ? (
                <Avatar
                  src={`${API_BASE}${profileUrl}`}
                  size={56}
                />
              ) : (
                <Avatar icon={<UserOutlined />} size={56} />
              )}
              <Upload
                showUploadList={false}
                customRequest={handleProfileUpload}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} loading={profileUploading} size="small">
                  {profileUploading ? "Uploading…" : "Change Photo"}
                </Button>
              </Upload>
            </Space>
          </Form.Item>

          <Form.Item
            label="Full Name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input />
          </Form.Item>

          {org?.type !== "SCHOOL" && (
            <Form.Item label="Email" name="email">
              <Input type="email" />
            </Form.Item>
          )}

          <Form.Item label="Phone" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="Address" name="address">
            <Input />
          </Form.Item>

          {renderTypeFields()}
        </Form>
      </Modal>

      <style>{`
        .row-inactive td {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
