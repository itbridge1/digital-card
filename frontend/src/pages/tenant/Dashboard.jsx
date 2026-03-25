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
      <Title level={4} style={{ marginBottom: 4 }}>
        Welcome, {user.name}
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        View and manage card holders in your organization.
      </Text>

      {org && (
        <Card style={{ marginBottom: 24 }} styles={{ body: { padding: "16px 20px" } }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Logo preview + upload */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {org.logoUrl ? (
                <img
                  src={`${API_BASE}${org.logoUrl}`}
                  alt="logo"
                  style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 6, border: "1px solid #e0e0e0" }}
                />
              ) : (
                <Avatar shape="square" size={64} style={{ fontSize: 24 }}>
                  {org.name?.[0]?.toUpperCase()}
                </Avatar>
              )}
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={handleLogoUpload}
              >
                <Button size="small" icon={<UploadOutlined />} loading={logoUploading}>
                  {org.logoUrl ? "Change" : "Upload Logo"}
                </Button>
              </Upload>
              {org.logoUrl && (
                <Button size="small" type="text" danger onClick={handleRemoveLogo}>
                  Remove
                </Button>
              )}
            </div>

            {/* Org info */}
            <div>
              <Text strong style={{ fontSize: 16 }}>
                {org.name}
              </Text>
              <br />
              <Tag color="blue" style={{ marginTop: 4 }}>
                {org.type}
              </Tag>
              <Tag color={org.isActive ? "green" : "red"}>
                {org.isActive ? "Active" : "Inactive"}
              </Tag>
            </div>
          </div>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Card Holders"
              value={cards.length}
              prefix={<IdcardOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active"
              value={activeCards}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Deactivated"
              value={inactiveCards}
              prefix={<StopOutlined />}
              valueStyle={{ color: inactiveCards > 0 ? "#cf1322" : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <Link to="/tenant/card-holders">
          <Text type="secondary" style={{ fontSize: 13 }}>
            → Go to Card Holders
          </Text>
        </Link>
      </div>
    </div>
  );
}

export default TenantDashboard;

