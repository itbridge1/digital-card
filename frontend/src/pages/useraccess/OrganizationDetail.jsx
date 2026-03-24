import React, { useEffect, useRef, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, Typography,
  message, Popconfirm, Avatar, Upload, Tag, Breadcrumb, Spin, Tooltip,
  Alert, Descriptions, Grid,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  DownloadOutlined, ArrowLeftOutlined, UserOutlined, EyeOutlined,
  CopyOutlined, ShareAltOutlined, InboxOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { useraccessAPI, uploadAPI, cardAPI } from '../../services/api';
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

import { formatFieldLabel } from '../cardView/components/SelectCard';

const formatFieldName = (key) => formatFieldLabel(key);

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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

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
    const m = card.metadata || {};
    // Split merged grade "One(A)" back to grade + section for the edit form
    let editGrade = m.grade || '';
    let editSection = '';
    const sectionMatch = editGrade.match(/^(.+)\((.+)\)$/);
    if (sectionMatch) {
      editGrade = sectionMatch[1];
      editSection = sectionMatch[2];
    }
    form.setFieldsValue({
      tagId: card.tagId,
      name: m.name || '',
      email: m.email || '',
      phone: m.phone || '',
      address: m.address || '',
      // SCHOOL
      studentId: m.studentId || '',
      grade: editGrade,
      section: editSection,
      house: m.house || '',
      guardianName: m.guardianName || '',
      guardianPhone: m.guardianPhone || '',
      // HOSPITAL
      employeeId: m.employeeId || '',
      department: m.department || '',
      specialization: m.specialization || '',
      licenseNumber: m.licenseNumber || '',
      emergencyContact: m.emergencyContact || '',
      // BUSINESS
      company: m.company || '',
      position: m.position || '',
      linkedIn: m.linkedIn || '',
      website: m.website || '',
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
      const orgType = organization?.type;

      const metadata = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
      };

      if (orgType === 'SCHOOL') {
        // Merge section into grade: "One(A)" or "One"
        const rawGrade = (values.grade || '').trim();
        const rawSection = (values.section || '').trim();
        const mergedGrade = rawGrade && rawSection
          ? `${rawGrade}(${rawSection})`
          : rawGrade;
        Object.assign(metadata, {
          studentId: values.studentId,
          grade: mergedGrade,
          house: values.house,
          guardianName: values.guardianName,
        });
        // drop email/phone/address from base metadata for SCHOOL
        delete metadata.email;
      } else if (orgType === 'HOSPITAL') {
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

      const payload = {
        profileImageUrl: profileUrl || null,
        metadata,
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

  const handleImportOpen = () => {
    setImportFile(null);
    setImportResult(null);
    setImportModalOpen(true);
  };

  const handleImportConfirm = async () => {
    if (!importFile) { message.warning('Please select a file first'); return; }
    setImporting(true);
    try {
      const res = await cardAPI.importCards(tenantId, importFile);
      setImportResult(res.data);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const orgType = organization?.type;

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
    // SCHOOL columns
    ...(orgType === 'SCHOOL' ? [
      { title: 'Roll No', render: (_, r) => r.metadata?.studentId || <Text type="secondary">—</Text> },
      { title: 'Class', render: (_, r) => r.metadata?.grade || <Text type="secondary">—</Text> },
      { title: 'House', render: (_, r) => r.metadata?.house || <Text type="secondary">—</Text> },
      { title: 'Guardian', render: (_, r) => r.metadata?.guardianName || <Text type="secondary">—</Text> },
      { title: 'Address', render: (_, r) => r.metadata?.address || <Text type="secondary">—</Text> },
      { title: 'Contact', render: (_, r) => r.metadata?.phone || <Text type="secondary">—</Text> },
    ] : []),
    // HOSPITAL columns
    ...(orgType === 'HOSPITAL' ? [
      { title: 'Employee ID', render: (_, r) => r.metadata?.employeeId || <Text type="secondary">—</Text> },
      { title: 'Department', render: (_, r) => r.metadata?.department || <Text type="secondary">—</Text> },
      { title: 'Specialization', render: (_, r) => r.metadata?.specialization || <Text type="secondary">—</Text> },
      { title: 'Phone', render: (_, r) => r.metadata?.phone || <Text type="secondary">—</Text> },
    ] : []),
    // BUSINESS & default columns
    ...(orgType !== 'SCHOOL' && orgType !== 'HOSPITAL' ? [
      { title: 'Position', render: (_, r) => r.metadata?.position || <Text type="secondary">—</Text> },
      { title: 'Company', render: (_, r) => r.metadata?.company || <Text type="secondary">—</Text> },
      { title: 'Email', render: (_, r) => r.metadata?.email || <Text type="secondary">—</Text>, ellipsis: true },
      { title: 'Phone', render: (_, r) => r.metadata?.phone || <Text type="secondary">—</Text> },
    ] : []),
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
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <Text strong>{cards.length} card holder{cards.length !== 1 ? 's' : ''}</Text>
        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
          >
            Export as ZIP
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={handleImportOpen}
          >
            Import from Excel
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
        scroll={{ x: 1300 }}
        size={isMobile ? 'small' : 'middle'}
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
        width={isMobile ? '95%' : 520}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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

          {/* Non-SCHOOL: Full Name shown here; SCHOOL has it inside its own block */}
          {orgType !== 'SCHOOL' && (
            <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Required' }]}>
              <Input placeholder="Full name" />
            </Form.Item>
          )}

          {/* SCHOOL fields */}
          {orgType === 'SCHOOL' && (
            <>
              <Form.Item label="Roll No" name="studentId">
                <Input placeholder="2" />
              </Form.Item>
              <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="Full name" />
              </Form.Item>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <Form.Item label="Class" name="grade" style={{ marginBottom: 0 }}>
                  <Input placeholder="One" />
                </Form.Item>
                <Form.Item label="Section (optional)" name="section" style={{ marginBottom: 0 }}>
                  <Input placeholder="A" />
                </Form.Item>
              </div>
              <Form.Item label="House" name="house" style={{ marginTop: 12 }}>
                <Input placeholder="Blue" />
              </Form.Item>
              <Form.Item label="Guardian" name="guardianName">
                <Input />
              </Form.Item>
              <Form.Item label="Address" name="address">
                <Input placeholder="City / Address" />
              </Form.Item>
              <Form.Item label="Contact" name="phone">
                <Input placeholder="9800000000" />
              </Form.Item>
            </>
          )}

          {/* HOSPITAL fields */}
          {orgType === 'HOSPITAL' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <Form.Item label="Employee ID" name="employeeId" style={{ marginBottom: 0 }}>
                  <Input />
                </Form.Item>
                <Form.Item label="Department" name="department" style={{ marginBottom: 0 }}>
                  <Input placeholder="e.g. Cardiology" />
                </Form.Item>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginTop: 12 }}>
                <Form.Item label="Specialization" name="specialization" style={{ marginBottom: 0 }}>
                  <Input />
                </Form.Item>
                <Form.Item label="License Number" name="licenseNumber" style={{ marginBottom: 0 }}>
                  <Input />
                </Form.Item>
              </div>
              <Form.Item label="Emergency Contact" name="emergencyContact" style={{ marginTop: 12 }}>
                <Input />
              </Form.Item>
              <Form.Item label="Address" name="address">
                <Input placeholder="City / Address" />
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
            </>
          )}

          {/* BUSINESS / default fields */}
          {orgType !== 'SCHOOL' && orgType !== 'HOSPITAL' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <Form.Item label="Position / Title" name="position" style={{ marginBottom: 0 }}>
                  <Input placeholder="e.g. Senior Developer" />
                </Form.Item>
                <Form.Item label="Company" name="company" style={{ marginBottom: 0 }}>
                  <Input placeholder="Company name" />
                </Form.Item>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginTop: 12 }}>
                <Form.Item label="LinkedIn" name="linkedIn" style={{ marginBottom: 0 }}>
                  <Input placeholder="linkedin.com/in/..." />
                </Form.Item>
                <Form.Item label="Website" name="website" style={{ marginBottom: 0 }}>
                  <Input placeholder="https://..." />
                </Form.Item>
              </div>
              <Form.Item label="Address" name="address" style={{ marginTop: 12 }}>
                <Input placeholder="City / Address" />
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
            </>
          )}
        </Form>
      </Modal>

      {/* Import from Excel modal */}
      <Modal
        title="Import Card Holders from Excel"
        open={importModalOpen}
        onCancel={() => { if (!importing) setImportModalOpen(false); }}
        width={isMobile ? '95%' : 520}
        footer={
          importResult ? (
            <Button type="primary" onClick={() => setImportModalOpen(false)}>Close</Button>
          ) : (
            <Space>
              <Button onClick={() => setImportModalOpen(false)} disabled={importing}>Cancel</Button>
              <Button type="primary" loading={importing} onClick={handleImportConfirm}>Import</Button>
            </Space>
          )
        }
      >
        {importResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Alert
              type={importResult.summary.failed > 0 ? 'warning' : 'success'}
              message={importResult.message}
              showIcon
            />
            <Descriptions size="small" bordered column={3}>
              <Descriptions.Item label="Created">{importResult.summary.created}</Descriptions.Item>
              <Descriptions.Item label="Skipped">{importResult.summary.skipped}</Descriptions.Item>
              <Descriptions.Item label="Failed">{importResult.summary.failed}</Descriptions.Item>
            </Descriptions>
            {importResult.details.failed.length > 0 && (
              <div style={{ fontSize: 12, color: '#cf1322' }}>
                <strong>Failed rows:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {importResult.details.failed.map((f, i) => (
                    <li key={i}>Row {f.row}{f.tagId ? ` (${f.tagId})` : ''}: {f.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {importResult.details.skipped.length > 0 && (
              <div style={{ fontSize: 12, color: '#d46b08' }}>
                <strong>Skipped rows:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {importResult.details.skipped.map((s, i) => (
                    <li key={i}>Row {s.row}{s.tagId ? ` (${s.tagId})` : ''}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, color: '#555', fontSize: 13 }}>
              Upload an <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> file.
              The first row must be a header row.
              {orgType && <> Columns for <strong>{orgType}</strong>:</>}
            </p>
            <div style={{ fontSize: 12, background: '#f5f5f5', borderRadius: 6, padding: '8px 12px', lineHeight: 1.8 }}>
              {orgType === 'SCHOOL' && (
                <><strong>Tag ID:</strong> Optional (auto-assigned if missing)<br /><strong>Columns:</strong> Roll No, Name, Class, Section (optional), House, Guardian, Address, Contact</>
              )}
              {orgType === 'HOSPITAL' && (
                <><strong>Tag ID:</strong> Optional (auto-assigned if missing)<br /><strong>Columns:</strong> Name, Employee ID, Department, Specialization, License Number, Emergency Contact, Address, Email, Phone</>
              )}
              {orgType !== 'SCHOOL' && orgType !== 'HOSPITAL' && (
                <><strong>Tag ID:</strong> Optional (auto-assigned if missing)<br /><strong>Columns:</strong> Name, Position / Designation, Company, LinkedIn, Website, Address, Email, Phone</>
              )}
            </div>
            <Upload.Dragger
              accept=".xlsx,.xls,.csv"
              beforeUpload={(file) => { setImportFile(file); return false; }}
              onRemove={() => setImportFile(null)}
              maxCount={1}
              fileList={importFile ? [importFile] : []}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag file here to upload</p>
              <p className="ant-upload-hint">.xlsx / .xls / .csv — max 10 MB</p>
            </Upload.Dragger>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default OrganizationDetail;
