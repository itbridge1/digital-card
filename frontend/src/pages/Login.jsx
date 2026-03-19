import { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { authAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);

    try {
      // Call login API
      const res = await authAPI.login(values.email, values.password);

      console.log("LOGIN RESPONSE:", res);

      const data = res?.data?.data;

      if (!data || !data.token) {
        throw new Error("Invalid response from server");
      }

      const { token, ...user } = data;

      // Save to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Show success message
      message.success("Login successful");

      // Call parent callback safely
      if (onLoginSuccess) {
        try {
          onLoginSuccess(user, token);
        } catch (err) {
          console.error("onLoginSuccess error:", err);
        }
      }

      // Navigate to dashboard
      navigate("/");
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      // Only one message will show
      message.error(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-theme-page-bg min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-xl rounded-xl">
        <Title level={3} className="text-center">
          NFC Platform Login
        </Title>

        <Form layout="vertical" onFinish={onFinish}>
          {/* Email */}
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input placeholder="your@email.com" />
          </Form.Item>

          {/* Password */}
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          {/* Submit */}
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full"
          >
            Login
          </Button>
        </Form>

        {/* Switch to Register */}
        <div className="text-center mt-4">
          <Text>
            Don’t have an account?{" "}
            <span
              className="app-theme-link cursor-pointer"
              onClick={onSwitchToRegister}
            >
              Register
            </span>
          </Text>
        </div>
      </Card>
    </div>
  );
}

export default Login;
