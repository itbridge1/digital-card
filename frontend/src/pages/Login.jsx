import { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Divider,
} from "antd";
import {
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { authAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

function Login() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await authAPI.login(values.email, values.password);
      const data = res?.data?.data;

      if (!data || !data.token) {
        throw new Error("Invalid response from server");
      }

      const { token, ...user } = data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      message.success("Login successful");

      if (user.role === "admin") navigate("/admin/dashboard");
      else if (user.role === "manager") navigate("/manager/dashboard");
      else navigate("/");
    } catch (err) {
      message.error(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Center Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <Card
          className="w-full max-w-md rounded-2xl shadow-md border border-gray-200"
          bodyStyle={{ padding: "28px" }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <Title level={3} className="!mb-1">
              Welcome Back
            </Title>
            <Text type="secondary" className="text-sm">
              Sign in to your NFC account
            </Text>
          </div>

         

          {/* Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
          >
            <Form.Item
              label="Email Address"
              name="email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input
                size="large"
                placeholder="your@email.com"
                prefix={<MailOutlined />}
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password
                size="large"
                placeholder="Enter your password"
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
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Form>

        
        </Card>
      </div>

      {/* Bottom Footer */}
      <div className="text-center pb-4">
        <Text type="secondary" className="text-xs">
          © 2026 IT Bridge NFC Platform
        </Text>
      </div>
    </div>
  );
}

export default Login;