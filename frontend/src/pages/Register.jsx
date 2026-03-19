import { useState, useEffect } from "react";
import { Form, Input, Button, Card, Typography, Select, message } from "antd";
import { authAPI, tenantAPI } from "../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

function Register({ onLoginSuccess, onSwitchToLogin }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const res = await tenantAPI.getAll();
      setTenants(res.data.data);
    } catch (err) {
      message.error("Failed to load tenants");
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await authAPI.register(values);
      const { token, ...user } = res.data.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      message.success("Registration successful");
      onLoginSuccess(user, token);
    } catch (err) {
      message.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-theme-page-bg min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-xl rounded-xl">
        <Title level={3} className="text-center">
          Create Account
        </Title>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Full Name"
            name="name"
            rules={[{ required: true, message: "Name required" }]}
          >
            <Input placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Email required" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Password required" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="Select Organization"
            name="tenantId"
            rules={[{ required: true, message: "Select tenant" }]}
          >
            <Select placeholder="Select organization">
              {tenants.map((t) => (
                <Option key={t.tenantId} value={t.tenantId}>
                  {t.name} ({t.type})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full"
          >
            Register
          </Button>
        </Form>

        <div className="text-center mt-4">
          <Text>
            Already have an account?{" "}
            <span
              className="app-theme-link cursor-pointer"
              onClick={onSwitchToLogin}
            >
              Login
            </span>
          </Text>
        </div>
      </Card>
    </div>
  );
}
export default Register;
