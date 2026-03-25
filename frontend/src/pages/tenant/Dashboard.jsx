import React, { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Typography, Spin, Tag, Upload, Button, message, Avatar } from "antd";
import {
  IdcardOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { tenantPortalAPI, uploadAPI } from "../../services/api";

const { Title, Text } = Typography;

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

function TenantDashboard() {
  const [cards, setCards] = useState([]);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    Promise.all([tenantPortalAPI.getCards(), tenantPortalAPI.getMe()])
      .then(([cardsRes, meRes]) => {
        setCards(cardsRes.data.data || []);
        setOrg(meRes.data.data || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogoUpload = async (info) => {
    const { file, onSuccess, onError } = info;
    const rawFile = file?.originFileObj || file;
    setLogoUploading(true);
    try {
      if (!rawFile || !rawFile.type?.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }
      if (rawFile.size > 5 * 1024 * 1024) {
        throw new Error("Image must be smaller than 5MB");
      }
      const uploadRes = await uploadAPI.uploadLogo(rawFile);
      const url = uploadRes.data?.url || uploadRes.data?.data?.url;
      if (!url) throw new Error("Server did not return uploaded file URL");
      await tenantPortalAPI.updateLogo(url);
      setOrg((prev) => ({ ...prev, logoUrl: url }));
      message.success("Logo updated successfully");
      if (onSuccess) onSuccess(uploadRes.data);
    } catch (err) {
      message.error(err?.response?.data?.error || err.message || "Logo upload failed");
      if (onError) onError(err);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await tenantPortalAPI.updateLogo(null);
      setOrg((prev) => ({ ...prev, logoUrl: null }));
      message.success("Logo removed");
    } catch {
      message.error("Failed to remove logo");
    }
  };

  if (loading) return <Spin style={{ display: "block", marginTop: 80 }} />;

  const activeCards = cards.filter((c) => c.isActive).length;
  const inactiveCards = cards.length - activeCards;

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <Title level={4} style={{ marginBottom: 2, letterSpacing: "-0.02em" }}>
          Welcome back, {user.name}
        </Title>
        <Text style={{ color: "#64748b", fontSize: 13 }}>
          View and manage card holders in your organization.
        </Text>
      </div>

      {/* Org Card */}
      {org && (
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #fafbff 0%, #f0f4ff 100%)",
          }}
          styles={{ body: { padding: "20px 24px" } }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {/* Logo */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              {org.logoUrl ? (
                <img
                  src={`${API_BASE}${org.logoUrl}`}
                  alt="logo"
                  style={{
                    width: 68,
                    height: 68,
                    objectFit: "contain",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    padding: 4,
                  }}
                />
              ) : (
                <Avatar
                  shape="square"
                  size={68}
                  style={{
                    fontSize: 26,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    fontWeight: 700,
                  }}
                >
                  {org.name?.[0]?.toUpperCase()}
                </Avatar>
              )}
              <Upload accept="image/*" showUploadList={false} customRequest={handleLogoUpload}>
                <Button size="small" icon={<UploadOutlined />} loading={logoUploading} style={{ fontSize: 11 }}>
                  {org.logoUrl ? "Change" : "Upload"}
                </Button>
              </Upload>
              {org.logoUrl && (
                <Button size="small" type="text" danger onClick={handleRemoveLogo} style={{ fontSize: 11 }}>
                  Remove
                </Button>
              )}
            </div>

            {/* Info */}
            <div>
              <Text strong style={{ fontSize: 18, letterSpacing: "-0.02em", color: "#0f172a" }}>
                {org.name}
              </Text>
              <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Tag color="blue" style={{ borderRadius: 20, fontSize: 11 }}>{org.type}</Tag>
                <Tag
                  color={org.isActive ? "green" : "default"}
                  style={{ borderRadius: 20, fontSize: 11 }}
                >
                  {org.isActive ? "Active" : "Inactive"}
                </Tag>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card className="nfc-stat-card nfc-stat-card-primary">
            <Statistic
              title={<span style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}>Total Card Holders</span>}
              value={cards.length}
              prefix={<IdcardOutlined style={{ color: "#5046e5", marginRight: 4 }} />}
              valueStyle={{ color: "#0f172a", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="nfc-stat-card nfc-stat-card-success">
            <Statistic
              title={<span style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}>Active</span>}
              value={activeCards}
              prefix={<CheckCircleOutlined style={{ color: "#10b981", marginRight: 4 }} />}
              valueStyle={{ color: "#10b981", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="nfc-stat-card nfc-stat-card-error">
            <Statistic
              title={<span style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}>Deactivated</span>}
              value={inactiveCards}
              prefix={<StopOutlined style={{ color: inactiveCards > 0 ? "#ef4444" : "#94a3b8", marginRight: 4 }} />}
              valueStyle={{ color: inactiveCards > 0 ? "#ef4444" : "#94a3b8", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <Link to="/tenant/card-holders">
          <Text style={{ fontSize: 13, color: "#5046e5", fontWeight: 500 }}>
            View all card holders &rarr;
          </Text>
        </Link>
      </div>
    </div>
  );
}

export default TenantDashboard;
