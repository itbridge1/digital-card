import { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { authAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

function Login() {
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
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      message.success("Login successful");

      // Redirect based on role
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (user.role === "manager") {
        navigate("/manager/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
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


      </Card>
    </div>
  );
}

export default Login;
