import { useState } from "react";
import { Form, Input, Button, Card, Typography, message, Alert } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { tenantPortalAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

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

      // Update stored user to clear the flag
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4">
        <Card
          className="w-full max-w-md rounded-2xl shadow-md border border-gray-200"
          bodyStyle={{ padding: "28px" }}
        >
          <div className="text-center mb-6">
            <Title level={3} className="!mb-1">
              Set Your Password
            </Title>
            <Text type="secondary" className="text-sm">
              Welcome, {user.name}. You must set a new password before continuing.
            </Text>
          </div>

          <Alert
            type="warning"
            showIcon
            message="You are using a temporary password. Please set a permanent one now."
            style={{ marginBottom: 20 }}
          />

          <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item
              label="Temporary / Current Password"
              name="currentPassword"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input.Password
                size="large"
                placeholder="Enter the password you received"
                prefix={<LockOutlined />}
              />
            </Form.Item>

            <Form.Item
              label="New Password"
              name="newPassword"
              rules={[
                { required: true, message: "Required" },
                { min: 8, message: "Must be at least 8 characters" },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="Choose a strong password"
                prefix={<LockOutlined />}
              />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              name="confirmPassword"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input.Password
                size="large"
                placeholder="Re-enter new password"
                prefix={<LockOutlined />}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              className="w-full mt-2 rounded-lg"
            >
              {loading ? "Saving…" : "Save Password & Continue"}
            </Button>
          </Form>
        </Card>
      </div>

      <div className="text-center pb-4">
        <Text type="secondary" className="text-xs">
          © 2026 IT Bridge NFC Platform
        </Text>
      </div>
    </div>
  );
}

export default ChangePassword;
