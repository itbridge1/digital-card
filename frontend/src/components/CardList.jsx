import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cardAPI } from "../services/api";
import { Button, Table, Tag, Popconfirm, message, Space, Modal, Form, Input, Typography } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined, EditFilled, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { ExclamationCircleFilled } from "@ant-design/icons";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

const { Text } = Typography;

export default function CardList({ tenantId, onEdit, refreshTrigger }) {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Bulk selection state
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Credential verification modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'single' | 'bulk', tagId?: string }
  const [deleteExecuting, setDeleteExecuting] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditIndex, setBulkEditIndex] = useState(0);
  const [bulkEditCards, setBulkEditCards] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm] = Form.useForm();

  useEffect(() => {
    if (tenantId) {
      fetchCards();
    }
  }, [tenantId, refreshTrigger]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await cardAPI.getAll();
      setCards(response.data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch cards");
    } finally {
      setLoading(false);
    }
  };

  // Populate bulk form when card index or open state changes
  useEffect(() => {
    if (bulkEditOpen && bulkEditCards.length > 0) {
      const card = bulkEditCards[bulkEditIndex];
      bulkForm.resetFields();
      bulkForm.setFieldsValue({
        businessUrl: card.businessUrl || "",
        ...(card.metadata || {}),
      });
    }
  }, [bulkEditIndex, bulkEditOpen, bulkEditCards]);

  const openBulkEdit = () => {
    const cloned = selectedCards.map((c) => ({
      ...c,
      metadata: { ...(c.metadata || {}) },
    }));
    setBulkEditCards(cloned);
    setBulkEditIndex(0);
    setBulkEditOpen(true);
  };

  const saveCurrentToState = async () => {
    const values = await bulkForm.validateFields();
    const { businessUrl, ...metadataValues } = values;
    const updated = [...bulkEditCards];
    updated[bulkEditIndex] = {
      ...updated[bulkEditIndex],
      businessUrl,
      metadata: {
        ...updated[bulkEditIndex].metadata,
        ...metadataValues,
      },
    };
    setBulkEditCards(updated);
    return updated;
  };

  const handleBulkPrev = async () => {
    await saveCurrentToState();
    setBulkEditIndex((i) => i - 1);
  };

  const handleBulkNext = async () => {
    await saveCurrentToState();
    setBulkEditIndex((i) => i + 1);
  };

  const handleBulkSaveAll = async () => {
    const updated = await saveCurrentToState();
    setBulkSaving(true);
    try {
      await Promise.all(
        updated.map((card) =>
          cardAPI.update(card.tagId, {
            businessUrl: card.businessUrl,
            metadata: card.metadata,
          })
        )
      );
      message.success(`${updated.length} card(s) updated successfully`);
      setBulkEditOpen(false);
      setSelectedRowKeys([]);
      setSelectedCards([]);
      fetchCards();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to update cards");
    } finally {
      setBulkSaving(false);
    }
  };

  const renderBulkFormFields = () => {
    if (!bulkEditCards.length) return null;
    const card = bulkEditCards[bulkEditIndex];
    const meta = card.metadata || {};
    const keys = Object.keys(meta).filter((k) => !k.startsWith("__"));
    return keys.map((key) => (
      <Form.Item
        key={key}
        label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
        name={key}
      >
        <Input />
      </Form.Item>
    ));
  };

  const handleBulkDelete = () => {
    setDeleteTarget({ type: "bulk" });
    setDeleteModalOpen(true);
  };

  const executeBulkDelete = async () => {
    setBulkDeleting(true);
    setDeleteExecuting(true);
    try {
      const tagIds = selectedCards.map((c) => c.tagId);
      const res = await cardAPI.bulkDelete(tagIds);
      message.success(res.data.message || `${tagIds.length} card(s) deleted`);
      setSelectedRowKeys([]);
      setSelectedCards([]);
      fetchCards();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to delete cards");
    } finally {
      setBulkDeleting(false);
      setDeleteExecuting(false);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleDelete = (tagId) => {
    setDeleteTarget({ type: "single", tagId });
    setDeleteModalOpen(true);
  };

  const executeSingleDelete = async () => {
    setDeleteExecuting(true);
    try {
      await cardAPI.delete(deleteTarget.tagId);
      message.success("Card deleted successfully");
      fetchCards();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to delete card");
    } finally {
      setDeleteExecuting(false);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleDeleteConfirmed = () => {
    if (deleteTarget?.type === "bulk") executeBulkDelete();
    else executeSingleDelete();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success("Copied to clipboard!");
  };

  const handleView = (tagId) => {
    const encodedTagId = encodeURIComponent(tagId);
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    navigate(`/card/${encodedTagId}${query}`);
  };

  if (loading) return <div className="text-center py-8">Loading cards...</div>;
  if (error)
    return <div className="text-center py-8 text-red-600">{error}</div>;
  if (cards.length === 0)
    return (
      <div className="text-center py-8 text-gray-500">
        <h3>No cards registered yet</h3>
        <p>Click "Register New Card" to get started</p>
      </div>
    );

  const columns = [
    {
      title: "Tag ID",
      dataIndex: "tagId",
      key: "tagId",
      width: isMobile ? 120 : 150,
      render: (tagId) => (
        <span className="tag-id text-xs sm:text-sm truncate">{tagId}</span>
      ),
    },
    ...(isMobile ? [] : [
      {
        title: "Name",
        key: "name",
        width: 120,
        render: (_, record) => (
          <span className="text-xs sm:text-sm truncate">{record.metadata?.name || "-"}</span>
        ),
      },
    ]),
    ...(isMobile ? [] : [
      {
        title: "Title",
        key: "title",
        width: 120,
        render: (_, record) => (
          <span className="text-xs sm:text-sm truncate">{record.metadata?.title || "-"}</span>
        ),
      },
    ]),
    {
      title: "Taps",
      dataIndex: "tapCount",
      key: "tapCount",
      width: 80,
      render: (tapCount) => <span className="text-xs sm:text-sm">{tapCount}</span>,
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_, record) => (
        <Tag color={record.isActive ? "green" : "red"} className="text-xs">
          {record.isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    ...(isMobile ? [] : [
      {
        title: "Short URL",
        key: "shortUrl",
        width: 100,
        render: (_, record) => (
          <Button
            size="small"
            type="link"
            className="text-xs"
            onClick={() =>
              copyToClipboard(`http://localhost:5000/t/${record.tagId}`)
            }
          >
            Copy URL
          </Button>
        ),
      },
    ]),
    {
      title: "Actions",
      key: "actions",
      width: isMobile ? 100 : 140,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleView(record.tagId)}
            className="text-xs"
            title="View"
          />

          <Button
            size="small"
            type="default"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            className="text-xs"
            title="Edit"
          />

          <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              className="text-xs"
              title="Delete"
              onClick={() => handleDelete(record.tagId)}
            />
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedCards(rows);
    },
  };

  return (
    <div className="cards-table-container overflow-x-auto">
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
        <Button
          danger
          icon={<DeleteOutlined />}
          disabled={selectedRowKeys.length === 0}
          loading={bulkDeleting}
          onClick={handleBulkDelete}
        >
          Delete Selected{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ""}
        </Button>
        <Button
          type="primary"
          icon={<EditFilled />}
          disabled={selectedRowKeys.length === 0}
          onClick={openBulkEdit}
        >
          Edit in Bulk{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ""}
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={cards}
        rowKey="id"
        rowSelection={rowSelection}
        bordered
        size={isMobile ? "small" : "middle"}
        scroll={{ x: isMobile ? 400 : "auto" }}
        pagination={{ 
          pageSize: isMobile ? 5 : 10,
          size: "small"
        }}
      />

      <Modal
        title={
          bulkEditCards.length > 0
            ? `Edit Card ${bulkEditIndex + 1} of ${bulkEditCards.length} — ${bulkEditCards[bulkEditIndex]?.tagId || ""}`
            : "Edit in Bulk"
        }
        open={bulkEditOpen}
        onCancel={() => setBulkEditOpen(false)}
        width={600}
        footer={[
          <Button
            key="prev"
            icon={<LeftOutlined />}
            disabled={bulkEditIndex === 0}
            onClick={handleBulkPrev}
          >
            Previous
          </Button>,
          <Text key="counter" style={{ padding: "0 12px", lineHeight: "32px" }}>
            {bulkEditCards.length > 0 ? `${bulkEditIndex + 1} / ${bulkEditCards.length}` : ""}
          </Text>,
          <Button
            key="next"
            icon={<RightOutlined />}
            iconPosition="end"
            disabled={bulkEditIndex === bulkEditCards.length - 1}
            onClick={handleBulkNext}
          >
            Next
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={bulkSaving}
            onClick={handleBulkSaveAll}
            style={{ marginLeft: 8 }}
          >
            Save All
          </Button>,
        ]}
      >
        <Form form={bulkForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Business URL" name="businessUrl">
            <Input placeholder="https://" />
          </Form.Item>
          {renderBulkFormFields()}
        </Form>
      </Modal>

      <ConfirmDeleteModal
        open={deleteModalOpen}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        loading={deleteExecuting}
        title="Confirm Deletion"
        description={
          deleteTarget?.type === "bulk"
            ? `Permanently delete ${selectedCards.length} selected card(s)? This cannot be undone.`
            : "Permanently delete this card? This cannot be undone."
        }
      />
    </div>
  );
}
