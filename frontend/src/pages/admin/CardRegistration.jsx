import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { EditOutlined, LinkOutlined, PlusOutlined, WifiOutlined } from '@ant-design/icons';
import { io } from 'socket.io-client';
import { cardAPI, tenantAPI, SOCKET_BASE_URL, managerAPI } from '../../services/api';

const { Title, Text } = Typography;

function CardRegistration() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState('');
  const [autoRegisterOnScan, setAutoRegisterOnScan] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [lastScan, setLastScan] = useState('');
  const [socketState, setSocketState] = useState('connecting');
  const watchedTagId = Form.useWatch('tagId', form);
  const socketRef = useRef(null);
  const lastEventRef = useRef({ tagId: null, ts: 0 });
  const autoRegisterRef = useRef(autoRegisterOnScan);
  const modalOpenRef = useRef(modalOpen);
  const selectedTenantRef = useRef(selectedTenant);

  useEffect(() => {
    autoRegisterRef.current = autoRegisterOnScan;
  }, [autoRegisterOnScan]);

  useEffect(() => {
    modalOpenRef.current = modalOpen;
  }, [modalOpen]);

  useEffect(() => {
    selectedTenantRef.current = selectedTenant;
  }, [selectedTenant]);

  const loadTenants = async () => {
    try {
      const res = await managerAPI.getAll();
      const tenantList = res.data.data || [];
      setTenants(tenantList);

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const preferredTenant = tenantList.find((t) => t.tenantId === currentUser.tenantId) || tenantList[0];

      if (preferredTenant) {
        setSelectedTenant(preferredTenant.tenantId);
        selectedTenantRef.current = preferredTenant.tenantId;
        await loadRegistrations(preferredTenant.tenantId);
      }
    } catch {
      message.error('Failed to load tenants');
    }
  };

  const loadRegistrations = async (tenantId) => {
    try {
      const res = await cardAPI.getRegistrations(tenantId);
      setRegistrations(res.data.data || []);
    } catch {
      message.error('Failed to load registrations');
    }
  };

  useEffect(() => {
    loadTenants();
    loadRegistrations();
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    const extractTagId = (payload) => {
      const value = payload?.tag_id || payload?.tagId || payload?.uid || payload?.card_uid;
      return String(value || '').trim().toUpperCase();
    };

    const handleIncomingTag = async (rawTagId) => {
      const incomingTag = String(rawTagId || '').trim().toUpperCase();
      if (!incomingTag) return;

      const now = Date.now();
      if (lastEventRef.current.tagId === incomingTag && now - lastEventRef.current.ts < 1200) {
        return;
      }
      lastEventRef.current = { tagId: incomingTag, ts: now };

      setLastScan(incomingTag);
      form.setFieldValue('tagId', incomingTag);

      if (autoRegisterRef.current) {
        await registerCard(incomingTag, {
          openEditOnSuccess: true,
          closeRegistrationModal: true,
        });
        return;
      }

      if (!modalOpenRef.current) {
        setModalOpen(true);
      }
    };

    socket.on('connect', () => {
      setSocketState('connected');
    });

    socket.on('disconnect', () => {
      setSocketState('connecting');
    });

    socket.on('connect_error', () => {
      setSocketState('failed');
    });

    socket.on('nfc_scan', (payload) => {
      handleIncomingTag(extractTagId(payload));
    });

    socket.on('nfc_update', (payload) => {
      const eventName = String(payload?.event || '').trim();

      if (eventName === 'card_registered' || eventName === 'card_updated' || eventName === 'card_deleted') {
        loadRegistrations(selectedTenantRef.current || undefined);
        return;
      }

      // Only trigger auto-sync from actual scan-like events.
      const scanLikeEvents = new Set(['nfc_scanned', 'nfc_scan', 'scan', 'card_detected']);
      if (eventName && !scanLikeEvents.has(eventName)) {
        return;
      }

      const incomingTag = extractTagId(payload);
      if (incomingTag) {
        handleIncomingTag(incomingTag);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const tenantDropdownOptions = useMemo(() => {
    return [
      { value: '__SELECT_TENANT__', label: 'Select tenant', disabled: true },
      ...tenants.map((t) => ({ value: t.id, label: `${t.name} ` })),
    ];
  }, [tenants]);

  const autoBusinessUrl = useMemo(() => {
    const base = (
      import.meta.env.TAG_WRITE_BASE_URL ||
      import.meta.env.VITE_TAG_WRITE_BASE_URL ||
      `${window.location.origin.replace(/\/$/, '')}/card`
    ).replace(/\/$/, '');
    const tag = String(watchedTagId || lastScan || '').trim().toUpperCase();
    if (!tag) return 'Auto generated after tag scan';
    return `${base}/${encodeURIComponent(tag)}`;
  }, [watchedTagId, lastScan]);

  const onTenantChange = async (tenantId) => {
    setSelectedTenant(tenantId || null);
    selectedTenantRef.current = tenantId || null;
    form.setFieldValue('tenantId', tenantId || undefined);
    await loadRegistrations(tenantId || undefined);
  };

  const registerCard = async (forcedTagId, options = {}) => {
    const { openEditOnSuccess = true, closeRegistrationModal = true } = options;

    try {
      const values = await form.validateFields(['tagId']);
      const allValues = form.getFieldsValue();
      const tagId = (forcedTagId || values.tagId || '').toUpperCase().trim();
      if (!tagId) {
        message.error('Tag ID is required');
        return;
      }

      setSaving(true);
      const payload = {
        tagId,
        tenantId: allValues.tenantId || undefined,
        status: 'active',
        redirectUrl: allValues.redirectUrl || undefined,
      };

      const res = await cardAPI.upsertOnScan(payload);
      const updatedRow = res?.data?.data;
      message.success(`Synced: ${updatedRow?.tagId || tagId} → ${updatedRow?.url || ''}`);

      await loadRegistrations(allValues.tenantId || selectedTenantRef.current || undefined);

      if (updatedRow && openEditOnSuccess) {
        openEditModal(updatedRow);
      }

      form.setFieldValue('tagId', '');
      if (closeRegistrationModal) {
        setModalOpen(false);
      }
    } catch (err) {
      if (err?.response?.data?.error) {
        message.error(err.response.data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    editForm.setFieldsValue({
      tagId: row.tagId,
      tenantId: row.tenantId || undefined,
      status:
        row.status === 'registered'
          ? 'active'
          : row.status === 'blocked'
            ? 'blocked'
            : 'inactive',
      redirectUrl: row.redirectUrl || '',
      businessUrl: row?.Card?.businessUrl || '',
    });
    setEditModalOpen(true);
  };

  const updateRegistration = async () => {
    if (!editingRow?.tagId) return;

    try {
      const values = await editForm.validateFields();
      setEditing(true);

      await cardAPI.updateRegistration(editingRow.tagId, {
        status: values.status,
        redirectUrl: values.redirectUrl || null,
        tenantId: values.tenantId || undefined,
      });

      message.success(`Updated tag: ${editingRow.tagId}`);
      setEditModalOpen(false);
      setEditingRow(null);
      await loadRegistrations(selectedTenantRef.current || undefined);
    } catch (err) {
      if (err?.response?.data?.error) {
        message.error(err.response.data.error);
      }
    } finally {
      setEditing(false);
    }
  };

  const deleteRegistration = async (row) => {
    const tagId = String(row?.tagId || '').trim().toUpperCase();
    if (!tagId) return;

    try {
      setDeletingTagId(tagId);
      await cardAPI.deleteRegistration(tagId);
      message.success(`Deleted tag: ${tagId}`);

      if (editingRow?.tagId === tagId) {
        setEditModalOpen(false);
        setEditingRow(null);
      }

      await loadRegistrations(selectedTenantRef.current || undefined);
    } catch (err) {
      if (err?.response?.data?.error) {
        message.error(err.response.data.error);
      }
    } finally {
      setDeletingTagId('');
    }
  };

  const registrationColumns = [
    { title: 'Tag ID', dataIndex: 'tagId', key: 'tagId' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => {
        if (v === 'registered') return <Tag color="green">ACTIVE</Tag>;
        if (v === 'blocked') return <Tag color="red">BLOCKED</Tag>;
        return <Tag color="gold">INACTIVE</Tag>;
      },
    },
    { title: 'URL', dataIndex: 'url', key: 'url' },
    {
      title: 'Business URL',
      key: 'businessUrl',
      render: (_, row) => {
        const value = row?.Card?.businessUrl;
        if (!value) return <Text type="secondary">N/A</Text>;
        return (
          <a href={value} target="_blank" rel="noreferrer">
            <Space size={6}>
              <LinkOutlined />
              <span>{value}</span>
            </Space>
          </a>
        );
      },
    },
    {
      title: 'Redirect URL',
      dataIndex: 'redirectUrl',
      key: 'redirectUrl',
      render: (v) => v || <Text type="secondary">NULL</Text>,
    },
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_, row) => row.Tenant?.name || row.tenantId,
    },
    {
      title: 'User',
      key: 'user',
      render: (_, row) => row.User?.name || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: 'Action',
      key: 'actions',
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(row)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete registration?"
            description="This will remove registration by tag ID."
            okText="Delete"
            okButtonProps={{ danger: true, loading: deletingTagId === row.tagId }}
            onConfirm={() => deleteRegistration(row)}
          >
            <Button danger loading={deletingTagId === row.tagId}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isBusy = saving || editing;

  return (
    <Spin spinning={isBusy} tip="Syncing card data...">
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Card Registration</Title>
        <Space>
          {socketState === 'connecting' && (
            <Tag color="processing">
              <Space size={6}>
                <Spin size="small" />
                Connecting realtime...
              </Space>
            </Tag>
          )}

          {socketState === 'connected' && (
            <Tag icon={<WifiOutlined />} color={lastScan ? 'blue' : 'green'}>
              {lastScan ? `Last scan: ${lastScan}` : 'Realtime connected'}
            </Tag>
          )}

          {socketState === 'failed' && (
            <Tag color="error">Realtime connection failed</Tag>
          )}

          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Register Card
          </Button>
        </Space>
      </Space>

      {socketState === 'failed' && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Realtime connection failed"
          description="Reader events are not reaching admin panel. Check VITE_SOCKET_URL and reader server status."
        />
      )}

      <Card title="Registrations" style={{ marginBottom: 16 }}>
        <Table
          rowKey="id"
          columns={registrationColumns}
          dataSource={registrations}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      
     
      <Modal
        title="Register NFC Card"
        open={modalOpen}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        onOk={() => registerCard()}
        okText="Register"
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'registered' }}>
          <Form.Item label="Tenant (optional)" name="tenantId">
            <Select
              allowClear
              placeholder="Select tenant (optional)"
              onChange={onTenantChange}
              options={tenantDropdownOptions}
            />
          </Form.Item>

          <Form.Item label="Tag ID" name="tagId" rules={[{ required: true, message: 'Tag ID required' }]}>
            <Input placeholder="Scan NFC or type tag id" />
          </Form.Item>

          <Form.Item label="Business URL (auto generated)">
            <Input value={autoBusinessUrl} disabled readOnly />
          </Form.Item>

          <Form.Item label="Redirect URL (nullable)" name="redirectUrl">
            <Input placeholder="t/STUDENT001 (leave empty to auto-generate)" />
          </Form.Item>

          <Form.Item label="Auto register on websocket scan">
            <Switch checked={autoRegisterOnScan} onChange={setAutoRegisterOnScan} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Card Registration"
        open={editModalOpen}
        confirmLoading={editing}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingRow(null);
        }}
        onOk={updateRegistration}
        okText="Save"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="Tag ID" name="tagId">
            <Input disabled readOnly />
          </Form.Item>

          <Form.Item label="Tenant (optional)" name="tenantId">
            <Select
              allowClear
              placeholder="Select tenant (optional)"
              options={tenantDropdownOptions}
            />
          </Form.Item>

          <Form.Item label="Business URL (auto generated)" name="businessUrl">
            <Input disabled readOnly />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Select status' }]}
          >
            <Select
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'blocked', label: 'Blocked' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Redirect URL" name="redirectUrl">
            <Input placeholder="t/STUDENT001 or https://example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </Spin>
  );
}

export default CardRegistration;
