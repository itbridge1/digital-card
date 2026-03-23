import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, WifiOutlined } from '@ant-design/icons';
import { io } from 'socket.io-client';
import { authAPI, cardAPI, tenantAPI, SOCKET_BASE_URL } from '../../services/api';

const { Title, Text } = Typography;

function CardRegistration() {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoRegisterOnScan, setAutoRegisterOnScan] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [lastScan, setLastScan] = useState('');
  const [socketState, setSocketState] = useState('connecting');
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
      const res = await tenantAPI.getAll();
      const tenantList = res.data.data || [];
      setTenants(tenantList);

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const preferredTenant = tenantList.find((t) => t.tenantId === currentUser.tenantId) || tenantList[0];

      if (preferredTenant) {
        setSelectedTenant(preferredTenant.tenantId);
        selectedTenantRef.current = preferredTenant.tenantId;
        form.setFieldValue('tenantId', preferredTenant.tenantId);
        await loadRegistrations(preferredTenant.tenantId);
      }
    } catch {
      message.error('Failed to load tenants');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await authAPI.getUsers();
      setUsers(res.data.data || []);
    } catch {
      message.error('Failed to load users');
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
    loadUsers();
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

      if (!modalOpenRef.current) {
        setModalOpen(true);
      }

      if (!autoRegisterRef.current) return;

      const currentValues = form.getFieldsValue();
      if (!currentValues?.tenantId) {
        message.warning('Select tenant first for auto registration');
        return;
      }

      await registerCard(incomingTag);
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
      if (payload?.event === 'card_registered') {
        loadRegistrations(selectedTenantRef.current || undefined);
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

  const filteredUsers = useMemo(() => {
    const managers = users.filter((u) => u.role === 'manager');
    if (!selectedTenant) return managers;
    return managers.filter((u) => u.tenantId === selectedTenant);
  }, [users, selectedTenant]);

  const tenantDropdownOptions = useMemo(() => {
    const managerTenantIds = new Set(
      users.filter((u) => u.role === 'manager').map((u) => u.tenantId),
    );

    return tenants
      .filter((t) => managerTenantIds.has(t.tenantId))
      .map((t) => ({ value: t.tenantId, label: `${t.name} (${t.tenantId})` }));
  }, [tenants, users]);

  const onTenantChange = async (tenantId) => {
    setSelectedTenant(tenantId || null);
    await loadRegistrations(tenantId || undefined);
  };

  const registerCard = async (forcedTagId) => {
    try {
      const values = await form.validateFields();
      const tagId = (forcedTagId || values.tagId || '').toUpperCase().trim();
      if (!tagId) {
        message.error('Tag ID is required');
        return;
      }

      setSaving(true);
      const payload = {
        tagId,
        tenantId: values.tenantId,
        status: 'registered',
        redirectUrl: values.redirectUrl || null,
      };

      const res = await cardAPI.create(payload);
      message.success(`Registered: ${res.data.tag_id} → ${res.data.url}`);
      await loadRegistrations(values.tenantId);

      form.setFieldValue('tagId', '');
      setModalOpen(false);
    } catch (err) {
      if (err?.response?.data?.error) {
        message.error(err.response.data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const registrationColumns = [
    { title: 'Tag ID', dataIndex: 'tagId', key: 'tagId' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => {
        const color = v === 'registered' ? 'green' : v === 'blocked' ? 'red' : 'gold';
        return <Tag color={color}>{String(v || '').toUpperCase()}</Tag>;
      },
    },
    { title: 'URL', dataIndex: 'url', key: 'url' },
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
  ];

  return (
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
          <Form.Item label="Tenant" name="tenantId" rules={[{ required: true, message: 'Select tenant' }]}>
            <Select
              placeholder="Select tenant"
              onChange={onTenantChange}
              options={tenantDropdownOptions}
            />
          </Form.Item>

          <Form.Item label="Tag ID" name="tagId" rules={[{ required: true, message: 'Tag ID required' }]}>
            <Input placeholder="Scan NFC or type tag id" />
          </Form.Item>

          <Form.Item label="Redirect URL (nullable)" name="redirectUrl">
            <Input placeholder="t/STUDENT001 (leave empty to auto-generate)" />
          </Form.Item>

          <Form.Item label="Auto register on websocket scan">
            <Switch checked={autoRegisterOnScan} onChange={setAutoRegisterOnScan} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default CardRegistration;
