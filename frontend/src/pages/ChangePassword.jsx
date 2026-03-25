import { useState } from "react";
import { Form, Input, Button, Typography, message, Alert } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { tenantPortalAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

function Logo() {
  return (
    <div className="nfc-auth-logo-wrap">
      <img
        src="/logo.png"
        alt="IT Bridge"
        className="nfc-auth-logo-img"
        onError={(e) => {
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "flex";
        }}
      />
      <div className="nfc-auth-logo-fallback" style={{ display: "none" }}>ITB</div>
      <Title level={4} style={{ margin: 0, letterSpacing: "-0.03em", color: "#09090b" }}>IT Bridge NFC</Title>
      <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>Digital Identity Platform</Text>
    </div>
  );
}

function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const onFinish = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await tenantPortalAPI.changePassword(values.currentPassword, values.newPassword);

      const updated = { ...user, mustChangePassword: false };
      localStorage.setItem("user", JSON.stringify(updated));

      message.success("Password changed successfully");
      navigate("/tenant/dashboard");
    } catch (err) {
      message.error(err.response?.data?.error || err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nfc-auth-bg">
      <Logo />

      <div className="nfc-auth-card">
        <div style={{ padding: "32px 32px 28px" }}>
          <div style={{ marginBottom: 20 }}>
            <Title level={5} style={{ margin: "0 0 4px", letterSpacing: "-0.02em", color: "#09090b" }}>
              Set your password
            </Title>
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>
              Welcome, {user.name}. Create a permanent password to continue.
            </Text>
          </div>

          <Alert
            type="warning"
            showIcon
            message="You are using a temporary password. Please set a permanent one now."
            style={{ marginBottom: 20, borderRadius: 8 }}
          />

          <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false}>
            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Current / Temporary Password</span>}
              name="currentPassword"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input.Password
                size="large"
                placeholder="Enter the password you received"
                prefix={<LockOutlined style={{ color: "#cbd5e1" }} />}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>New Password</span>}
              name="newPassword"
              rules={[
                { required: true, message: "Required" },
                { min: 8, message: "Must be at least 8 characters" },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="Choose a strong password"
                prefix={<LockOutlined style={{ color: "#cbd5e1" }} />}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Confirm New Password</span>}
              name="confirmPassword"
              rules={[{ required: true, message: "Required" }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                size="large"
                placeholder="Re-enter new password"
                prefix={<LockOutlined style={{ color: "#cbd5e1" }} />}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 8,
                background: "#09090b",
                border: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {loading ? "Saving..." : "Save Password & Continue"}
            </Button>
          </Form>
        </div>
      </div>

      <Text style={{ color: "#cbd5e1", fontSize: 12, marginTop: 24 }}>
        &copy; 2026 IT Bridge NFC Platform
      </Text>
    </div>
  );
}

export default ChangePassword;
