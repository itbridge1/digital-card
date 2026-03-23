import React, { useEffect, useRef, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, Typography,
  message, Popconfirm, Avatar, Upload, Tag, Breadcrumb, Spin, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  DownloadOutlined, ArrowLeftOutlined, UserOutlined, EyeOutlined,
  CopyOutlined, ShareAltOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { useraccessAPI, uploadAPI } from '../../services/api';
import SelectCard from '../cardView/components/SelectCard';

const EXPORT_THEME = {
  primaryColor: "#1890ff",
  secondaryColor: "#52c41a",
  accentColor: "#ff6b6b",
  surfaceColor: "#f0f2f5",
  isDark: false,
  contrast: 100,
  hexToRgba: (hex, opacity) => {
    if (!hex) return `rgba(0,0,0,${opacity})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  },
};

const formatFieldName = (fieldName) =>
  fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

const { Title, Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function OrganizationDetail() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPrefix = currentUser.role === 'admin' ? '/admin' : '/manager';

  const [organization, setOrganization] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUrl, setProfileUrl] = useState('');
  const [exporting, setExporting] = useState(false);
  const [nfcTags, setNfcTags] = useState([]);
  const [nfcTagsLoading, setNfcTagsLoading] = useState(false);
  const [form] = Form.useForm();

  // Hidden container for card export rendering
  const exportContainerRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await useraccessAPI.getOrganizationCards(tenantId);
      setCards(res.data.data || []);
      setOrganization(res.data.tenant || null);
    } catch {
      message.error('Failed to load card holders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const openCreate = async () => {
    setEditingCard(null);
    setProfileUrl('');
    form.resetFields();
    setNfcTagsLoading(true);
    try {
      const res = await useraccessAPI.getAvailableNfcTags(tenantId);
      setNfcTags(res.data.data || []);
    } catch {
      message.error('Failed to load NFC tags');
    } finally {
      setNfcTagsLoading(false);
    }
    setModalOpen(true);
  };

  const openEdit = (card) => {
    setEditingCard(card);
    setProfileUrl(card.profileImageUrl || '');
    form.setFieldsValue({
      tagId: card.tagId,
      name: card.metadata?.name || '',
      position: card.metadata?.position || '',
      department: card.metadata?.department || '',
      email: card.metadata?.email || '',
      phone: card.metadata?.phone || '',
    });
    setModalOpen(true);
  };

  const handleProfileUpload = async (info) => {
    const { file, onSuccess, onError } = info;
    const rawFile = file?.originFileObj || file;
    setProfileUploading(true);

    try {
      if (!rawFile) {
        const err = new Error('No file selected');
        message.error(err.message);
        if (onError) onError(err);
        return;
      }

      if (!rawFile.type?.startsWith('image/')) {
        const err = new Error('Please select an image file');
        message.error(err.message);
        if (onError) onError(err);
        return;
      }

      if (rawFile.size > 5 * 1024 * 1024) {
        const err = new Error('Image must be smaller than 5MB');
        message.error(err.message);
        if (onError) onError(err);
        return;
      }

      const res = await uploadAPI.uploadProfile(rawFile);
      const uploadedUrl = res.data?.url || res.data?.data?.url;

      if (!uploadedUrl) {
        const err = new Error('Server did not return uploaded file URL');
        message.error(err.message);
        if (onError) onError(err);
        return;
      }

      setProfileUrl(uploadedUrl);
      message.success('Profile photo uploaded');
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      message.error(err?.response?.data?.error || err.message || 'Profile upload failed');
      if (onError) onError(err);
    } finally {
      setProfileUploading(false);
    }
  };

  const handleSave = async () => {
    if (profileUploading) {
      message.warning('Please wait for image upload to finish');
      return;
    }

    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        profileImageUrl: profileUrl || null,
        metadata: {
          name: values.name,
          position: values.position,
          department: values.department,
          email: values.email,
          phone: values.phone,
        },
      };

      if (editingCard) {
        await useraccessAPI.updateCard(tenantId, editingCard.id, payload);
        message.success('Card holder updated');
      } else {
        await useraccessAPI.addCard(tenantId, { tagId: values.tagId, ...payload });
        message.success('Card holder added');
      }
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

  const handleDelete = async (cardId) => {
    try {
      await useraccessAPI.deleteCard(tenantId, cardId);
      message.success('Card holder removed');
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to remove');
    }
  };

  // Export all cards as images bundled in a ZIP file
  const handleExport = async () => {
    if (cards.length === 0) {
      message.warning('No card holders to export');
      return;
    }
    setExporting(true);
    const zip = new JSZip();

    try {
      for (const card of cards) {
        const el = document.getElementById(`card-export-${card.id}`);
        if (!el) continue;

        const canvas = await html2canvas(el, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          backgroundColor: null,
          logging: false,
        });

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );
        const safeName = (card.metadata?.name || card.tagId)
          .replace(/[^a-zA-Z0-9_\- ]/g, '_')
          .trim();
        zip.file(`${safeName}.png`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${organization?.name || tenantId}_cards.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success(`Exported ${cards.length} cards`);
    } catch (err) {
      console.error(err);
      message.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: 'Photo',
      dataIndex: 'profileImageUrl',
      render: (url) =>
        url ? (
          <Avatar src={`${API_BASE}${url}`} size={40} />
        ) : (
          <Avatar icon={<UserOutlined />} size={40} />
        ),
    },
    {
      title: 'Name',
      render: (_, r) => r.metadata?.name || <Text type="secondary">—</Text>,
    },
    {
      title: 'Position',
      render: (_, r) => r.metadata?.position || <Text type="secondary">—</Text>,
    },
    {
      title: 'Department',
      render: (_, r) => r.metadata?.department || <Text type="secondary">—</Text>,
    },
    {
      title: 'Email',
      render: (_, r) => r.metadata?.email || <Text type="secondary">—</Text>,
      ellipsis: true,
    },
    {
      title: 'Phone',
      render: (_, r) => r.metadata?.phone || <Text type="secondary">—</Text>,
    },
    {
      title: 'Tag ID',
      dataIndex: 'tagId',
      render: (v) => <code style={{ fontSize: 11 }}>{v}</code>,
    },
    {
      title: 'Public URL',
      key: 'publicUrl',
      render: (_, record) => {
        const url = `${window.location.origin}/view/${record.tagId}`;
        return (
          <Space size={4}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11 }}>
              /view/{record.tagId}
            </a>
            <Tooltip title="Copy public URL">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  message.success('Public URL copied!');
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (v) => (
        <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Card (internal)">
            <Button 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => navigate(`/card/${record.tagId}?tenantId=${tenantId}`)}
            />
          </Tooltip>
          <Tooltip title="View Public Card">
            <Button
              size="small"
              icon={<ShareAltOutlined />}
              onClick={() => window.open(`/view/${record.tagId}`, '_blank')}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Remove this card holder?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Remove">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to={`${userPrefix}/organizations`}>Organizations</Link> },
          { title: organization?.name || tenantId },
        ]}
      />

      {/* Org header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        {organization?.logoUrl && (
          <Avatar
            src={`${API_BASE}${organization.logoUrl}`}
            shape="square"
            size={56}
            style={{ border: '1px solid #e0e0e0' }}
          />
        )}
        <div>
          <Title level={4} style={{ margin: 0 }}>{organization?.name}</Title>
          <Text type="secondary">{organization?.type} · {organization?.contactEmail}</Text>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>{cards.length} card holder{cards.length !== 1 ? 's' : ''}</Text>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
          >
            Export as ZIP
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Card Holder
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={cards}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      {/* Hidden export templates — rendered off-screen for html2canvas */}
      <div
        ref={exportContainerRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {cards.map((card) => (
          <div key={card.id} id={`card-export-${card.id}`} style={{ marginBottom: 8 }}>
            <SelectCard
              design="one"
              card={card}
              tenant={organization}
              formatFieldName={formatFieldName}
              theme={EXPORT_THEME}
            />
          </div>
        ))}
      </div>

      {/* Add / Edit modal */}
      <Modal
        title={editingCard ? 'Edit Card Holder' : 'Add Card Holder'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving || profileUploading}
        okText={editingCard ? 'Save Changes' : 'Add'}
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editingCard && (
            <Form.Item
              label="NFC Tag ID"
              name="tagId"
              rules={[{ required: true, message: 'Tag ID is required' }]}
              tooltip="Select a registered NFC tag to assign to this card holder"
            >
              <Select
                showSearch
                loading={nfcTagsLoading}
                placeholder={nfcTagsLoading ? 'Loading tags...' : nfcTags.length === 0 ? 'No available tags' : 'Select an NFC tag'}
                optionFilterProp="label"
                notFoundContent={nfcTagsLoading ? <Spin size="small" /> : 'No registered NFC tags available'}
                options={nfcTags.map((t) => ({ value: t.tagId, label: t.tagId }))}
              />
            </Form.Item>
          )}

          <Form.Item label="Profile Photo">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {profileUrl ? (
                <Avatar src={`${API_BASE}${profileUrl}`} size={56} />
              ) : (
                <Avatar icon={<UserOutlined />} size={56} />
              )}
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={handleProfileUpload}
              >
                <Button icon={<UploadOutlined />} loading={profileUploading}>
                  {profileUrl ? 'Change Photo' : 'Upload Photo'}
                </Button>
              </Upload>
            </div>
          </Form.Item>

          <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Full name" />
          </Form.Item>

          <Form.Item label="Position / Title" name="position">
            <Input placeholder="e.g. Senior Developer" />
          </Form.Item>

          <Form.Item label="Department" name="department">
            <Input placeholder="e.g. Engineering" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Invalid email' }]}
          >
            <Input placeholder="email@org.com" />
          </Form.Item>

          <Form.Item label="Phone" name="phone">
            <Input placeholder="+1 555 000 0000" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default OrganizationDetail;
