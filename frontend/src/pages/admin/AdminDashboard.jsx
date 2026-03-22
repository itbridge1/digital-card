import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Statistic, Button, Modal, Form,
  Input, Select, Typography, message, Table, Tag, Space, Popconfirm, Tooltip, Avatar,
} from 'antd';
import {
  PlusOutlined, UserOutlined, ApartmentOutlined,
  DeleteOutlined, StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useraccessAPI, authAPI, managerAPI } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const currentUserId = () => JSON.parse(localStorage.getItem('user') || '{}').id;

function AdminDashboard() {
  const [orgs, setOrgs] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const fetchOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const res = await useraccessAPI.getOrganizations();
      setOrgs(res.data.data || []);
    } catch {
      message.error('Failed to load organizations');
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
      message.error('Failed to load manager accounts');
    } finally {
      setLoadingManagers(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
    fetchManagers();
  }, []);

  const activeOrgs = orgs.filter((o) => o.isActive).length;
  const activeManagers = managers.filter((m) => m.isActive && m.role === 'manager').length;

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await authAPI.register(values);
      message.success('Account created successfully');
      setCreateModalOpen(false);
      form.resetFields();
      fetchManagers();
    } catch (err) {
      if (err?.response?.data?.error) {
        message.error(err.response.data.error);
      } else if (err?.response?.data?.errors) {
        message.error(err.response.data.errors[0]?.msg || 'Validation failed');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await managerAPI.deactivate(id);
      message.success('Account deactivated');
      fetchManagers();
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to deactivate');
    }
  };

  const handleActivate = async (id) => {
    try {
      await managerAPI.activate(id);
      message.success('Account activated');
      fetchManagers();
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to activate');
    }
  };

  const handleDelete = async (id) => {
    try {
      await managerAPI.remove(id);
      message.success('Account deleted');
      fetchManagers();
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to delete');
    }
  };

  const orgColumns = [
    { title: 'ID', dataIndex: 'tenantId', render: (v) => <code>{v}</code> },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Type', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (v) => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  const managerColumns = [
    {
      title: '',
      width: 40,
      render: () => <Avatar size={28} icon={<UserOutlined />} />,
    },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email', ellipsis: true },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (v) => (
        <Tag color={v === 'admin' ? 'gold' : 'blue'}>{v.charAt(0).toUpperCase() + v.slice(1)}</Tag>
      ),
    },
    {
      title: 'Organization',
      render: (_, r) => r.Tenant?.name || <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (v) => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
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
                <Tooltip title={isSelf ? 'Cannot deactivate yourself' : 'Deactivate'}>
                  <Button size="small" icon={<StopOutlined />} disabled={isSelf} />
                </Tooltip>
              </Popconfirm>
            ) : (
              <Tooltip title="Activate">
                <Button
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleActivate(record.id)}
                  style={{ color: '#3f8600', borderColor: '#3f8600' }}
                />
              </Tooltip>
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
              <Tooltip title={isSelf ? 'Cannot delete yourself' : 'Delete permanently'}>
                <Button size="small" danger icon={<DeleteOutlined />} disabled={isSelf} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Admin Dashboard</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Total Organizations" value={orgs.length} prefix={<ApartmentOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Organizations"
              value={activeOrgs}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ApartmentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Managers"
              value={activeManagers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Managers table */}
      <Card
        title="Manager Accounts"
        style={{ marginBottom: 24 }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Add Manager
          </Button>
        }
        loading={loadingManagers}
      >
        <Table
          columns={managerColumns}
          dataSource={managers}
          rowKey="id"
          pagination={{ pageSize: 8 }}
          size="small"
        />
      </Card>

      {/* Organizations table */}
      <Card title="Organizations" loading={loadingOrgs}>
        <Table
          columns={orgColumns}
          dataSource={orgs}
          rowKey="tenantId"
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>

      {/* Create manager modal */}
      <Modal
        title="Add Manager Account"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateModalOpen(false); form.resetFields(); }}
        confirmLoading={creating}
        okText="Create Account"
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Manager accounts can manage organizations and card holders.
        </Text>
        <Form form={form} layout="vertical">
          <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Full name" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Required' }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Required' }, { min: 6, message: 'Min 6 characters' }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Form.Item label="Organization" name="tenantId" rules={[{ required: true, message: 'Required' }]}>
            <Select placeholder="Assign to organization">
              {orgs.filter((o) => o.isActive).map((o) => (
                <Option key={o.tenantId} value={o.tenantId}>
                  {o.name} ({o.tenantId})
                </Option>
              ))}
            </Select>
          </Form.Item>
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

