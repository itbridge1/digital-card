import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cardAPI } from "../services/api";
import { Button, Table, Tag, Popconfirm, message, Space } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";

export default function CardList({ tenantId, onEdit, refreshTrigger }) {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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

  const handleDelete = async (tagId) => {
    try {
      await cardAPI.delete(tagId);
      message.success("Card deactivated successfully");
      fetchCards();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to delete card");
    }
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

          <Popconfirm
            title="Are you sure you want to deactivate this card?"
            onConfirm={() => handleDelete(record.tagId)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              className="text-xs"
              title="Delete"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="cards-table-container overflow-x-auto">
      <Table
        columns={columns}
        dataSource={cards}
        rowKey="id"
        bordered
        size={isMobile ? "small" : "middle"}
        scroll={{ x: isMobile ? 400 : "auto" }}
        pagination={{ 
          pageSize: isMobile ? 5 : 10,
          size: "small"
        }}
      />
    </div>
  );
}
