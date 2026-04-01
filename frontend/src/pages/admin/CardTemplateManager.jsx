import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  StarFilled,
  StarOutlined,
  AppstoreAddOutlined,
} from "@ant-design/icons";
import { cardTemplateAPI, tenantAPI } from "../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL / Link" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown (select)" },
];

// Convert a label into a safe camelCase key
function labelToKey(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[^a-z]/, "")
    .slice(0, 40) || "field";
}

// ── FieldEditor ──────────────────────────────────────────────────────────────
function FieldEditor({ fields, onChange }) {
  const addField = () => {
    onChange([
      ...fields,
      { key: `field${fields.length + 1}`, label: "", type: "text", required: false, order: fields.length },
    ]);
  };

  const remove = (idx) => onChange(fields.filter((_, i) => i !== idx));

  const moveUp = (idx) => {
    if (idx === 0) return;
    const next = [...fields];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next.map((f, i) => ({ ...f, order: i })));
  };

  const moveDown = (idx) => {
    if (idx === fields.length - 1) return;
    const next = [...fields];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next.map((f, i) => ({ ...f, order: i })));
  };

  const update = (idx, patch) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onChange(next);
  };

  const updateLabel = (idx, label) => {
    const f = fields[idx];
    // Auto-generate key only when key was derived from previous label (not manually changed)
    const prevDerived = labelToKey(f.label);
    const patch = { label };
    if (f.key === prevDerived || f.key === `field${idx + 1}`) {
      patch.key = labelToKey(label) || f.key;
    }
    update(idx, patch);
  };

  return (
    <div>
      {fields.map((field, idx) => (
        <Card
          key={idx}
          size="small"
          style={{ marginBottom: 10, background: "#fafafa" }}
          styles={{ body: { padding: "10px 12px" } }}
        >
          <Row gutter={[8, 8]} align="middle">
            {/* Label */}
            <Col xs={24} sm={8}>
              <Input
                placeholder="Field label *"
                value={field.label}
                onChange={(e) => updateLabel(idx, e.target.value)}
                status={!field.label ? "error" : ""}
              />
            </Col>
            {/* Key */}
            <Col xs={24} sm={6}>
              <Input
                placeholder="Field key"
                value={field.key}
                onChange={(e) =>
                  update(idx, {
                    key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40),
                  })
                }
                addonBefore="key:"
                style={{ fontFamily: "monospace" }}
              />
            </Col>
            {/* Type */}
            <Col xs={24} sm={5}>
              <Select
                value={field.type}
                onChange={(v) => update(idx, { type: v })}
                style={{ width: "100%" }}
              >
                {FIELD_TYPES.map((t) => (
                  <Option key={t.value} value={t.value}>{t.label}</Option>
                ))}
              </Select>
            </Col>
            {/* Required */}
            <Col xs={8} sm={2} style={{ textAlign: "center" }}>
              <Tooltip title="Required">
                <Checkbox
                  checked={field.required}
                  onChange={(e) => update(idx, { required: e.target.checked })}
                />
              </Tooltip>
            </Col>
            {/* Actions */}
            <Col xs={16} sm={3} style={{ textAlign: "right" }}>
              <Space size={4}>
                <Tooltip title="Move up">
                  <Button
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={idx === 0}
                    onClick={() => moveUp(idx)}
                  />
                </Tooltip>
                <Tooltip title="Move down">
                  <Button
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={idx === fields.length - 1}
                    onClick={() => moveDown(idx)}
                  />
                </Tooltip>
                <Popconfirm
                  title="Remove this field?"
                  onConfirm={() => remove(idx)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </Col>
          </Row>
          {/* Select options input */}
          {field.type === "select" && (
            <Row style={{ marginTop: 6 }}>
              <Col span={24}>
                <Input
                  placeholder="Options (comma-separated): Option A, Option B, Option C"
                  value={(field.options || []).join(", ")}
                  onChange={(e) =>
                    update(idx, {
                      options: e.target.value
                        .split(",")
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Col>
            </Row>
          )}
        </Card>
      ))}

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={addField}
        block
        style={{ marginTop: 4 }}
      >
        Add Field
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CardTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [saving, setSaving] = useState(false);

  // Form state for the drawer
  const [form] = Form.useForm();
  const [fields, setFields] = useState([]);

  // Fetch tenant list (admin sees all)
  const loadTenants = useCallback(async () => {
    try {
      const res = await tenantAPI.getAll();
      const list = res.data?.data || res.data || [];
      setTenants(list);
      if (list.length > 0 && !selectedTenant) {
        setSelectedTenant(list[0].tenantId);
      }
    } catch {
      // swallow — tenants may already be loaded from parent
    }
  }, [selectedTenant]);

  const loadTemplates = useCallback(async (tenantId) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await cardTemplateAPI.getAll(tenantId);
      setTemplates(res.data?.data || []);
    } catch {
      message.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);
  useEffect(() => { if (selectedTenant) loadTemplates(selectedTenant); }, [selectedTenant, loadTemplates]);

  // Open create drawer
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setFields([]);
    setDrawerOpen(true);
  };

  // Open edit drawer
  const openEdit = (tpl) => {
    setEditing(tpl);
    form.setFieldsValue({
      name: tpl.name,
      description: tpl.description || "",
      isDefault: tpl.isDefault,
    });
    setFields(tpl.fields || []);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue();

    // Validate fields array
    if (fields.length === 0) {
      return message.warning("Add at least one field to the template");
    }
    const emptyLabel = fields.some((f) => !f.label.trim());
    if (emptyLabel) {
      return message.warning("All fields must have a label");
    }
    const keys = fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      return message.warning("Field keys must be unique within the template");
    }

    setSaving(true);
    try {
      const payload = {
        tenantId: selectedTenant,
        name: values.name,
        description: values.description || "",
        isDefault: values.isDefault || false,
        fields: fields.map((f, i) => ({ ...f, order: i })),
      };

      if (editing) {
        await cardTemplateAPI.update(editing.id, payload);
        message.success("Template updated");
      } else {
        await cardTemplateAPI.create(payload);
        message.success("Template created");
      }

      setDrawerOpen(false);
      loadTemplates(selectedTenant);
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await cardTemplateAPI.delete(id, selectedTenant);
      message.success("Template deleted");
      loadTemplates(selectedTenant);
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to delete template");
    }
  };

  const handleSetDefault = async (tpl) => {
    try {
      await cardTemplateAPI.update(tpl.id, { tenantId: selectedTenant, isDefault: true });
      message.success(`"${tpl.name}" is now the default template`);
      loadTemplates(selectedTenant);
    } catch {
      message.error("Failed to set default");
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (name, row) => (
        <Space>
          {name}
          {row.isDefault && <Tag color="gold" icon={<StarFilled />}>Default</Tag>}
        </Space>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Fields",
      dataIndex: "fields",
      render: (fields) => (
        <Space wrap>
          {(fields || []).slice(0, 6).map((f) => (
            <Tag key={f.key} color="blue">{f.label}</Tag>
          ))}
          {(fields || []).length > 6 && (
            <Tag>+{(fields || []).length - 6} more</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Actions",
      width: 180,
      render: (_, row) => (
        <Space>
          {!row.isDefault && (
            <Tooltip title="Set as default">
              <Button
                size="small"
                icon={<StarOutlined />}
                onClick={() => handleSetDefault(row)}
              />
            </Tooltip>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
          />
          <Popconfirm
            title="Delete this template?"
            description="Cards using this template will keep their existing data."
            onConfirm={() => handleDelete(row.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <AppstoreAddOutlined style={{ marginRight: 8 }} />
            Card Templates
          </Title>
          <Text type="secondary">
            Define dynamic field schemas used when creating or importing cards
          </Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Template
          </Button>
        </Col>
      </Row>

      {/* Tenant selector */}
      {tenants.length > 1 && (
        <Select
          value={selectedTenant}
          onChange={setSelectedTenant}
          placeholder="Select organization"
          style={{ minWidth: 260, marginBottom: 16 }}
          showSearch
          optionFilterProp="children"
        >
          {tenants.map((t) => (
            <Option key={t.tenantId} value={t.tenantId}>
              {t.name} ({t.tenantId})
            </Option>
          ))}
        </Select>
      )}

      <Spin spinning={loading}>
        <Table
          dataSource={templates}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: "No templates yet. Create one to get started." }}
        />
      </Spin>

      {/* Create / Edit Drawer */}
      <Drawer
        title={editing ? "Edit Template" : "New Card Template"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={Math.min(window.innerWidth, 720)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>
              {editing ? "Save Changes" : "Create Template"}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Template Name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="e.g. Staff Card, Student Pass, Visitor Badge" maxLength={100} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Optional description" maxLength={500} />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked" label="Set as default template for this organization">
            <Switch />
          </Form.Item>
        </Form>

        <Divider orientation="left">Fields</Divider>
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          These fields appear on the card form and are used as column targets when importing from Excel.
        </Text>

        <FieldEditor fields={fields} onChange={setFields} />
      </Drawer>
    </div>
  );
}
