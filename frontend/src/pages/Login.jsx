import { useState } from "react";
import { Form, Input, Button, Typography, message } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { authAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

function Logo() {
  return (
    <div className="nfc-auth-logo-wrap">
      {/* <img
        src="/logo.png"
        alt="IT Bridge"
        className="nfc-auth-logo-img"
        onError={(e) => {
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "flex";
        }}
      /> */}
      <div className="nfc-auth-logo-fallback" style={{ display: "none" }}>
        Tirupati
      </div>
      <Title
        level={4}
        style={{ margin: 0, letterSpacing: "-0.03em", color: "#09090b" }}
      >
        Tirupati
      </Title>
      <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
        Digital Identity Platform
      </Text>
    </div>
  );
}

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

      if (user.mustChangePassword) {
        navigate("/change-password");
        return;
      }

      if (user.role === "admin") navigate("/admin/dashboard");
      else if (user.role === "manager") navigate("/manager/dashboard");
      else if (user.role === "tenant") navigate("/tenant/dashboard");
      else navigate("/");
    } catch (err) {
      console.log("err", err);
      message.error(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nfc-auth-bg">
      {/* <Logo /> */}
      <h1 className="text-2xl py-10">TIRUPATI</h1>

      <div className="nfc-auth-card">
        <div style={{ padding: "32px 32px 28px" }}>
          <div style={{ marginBottom: 24 }}>
            <Title
              level={5}
              style={{
                margin: "0 0 4px",
                letterSpacing: "-0.02em",
                color: "#09090b",
              }}
            >
              Sign in to your account
            </Title>
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>
              Enter your credentials to continue
            </Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              label={
                <span
                  style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}
                >
                  Email Address
                </span>
              }
              name="email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input
                size="large"
                placeholder="your@email.com"
                prefix={<MailOutlined style={{ color: "#cbd5e1" }} />}
              />
            </Form.Item>

            <Form.Item
              label={
                <span
                  style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}
                >
                  Password
                </span>
              }
              name="password"
              rules={[{ required: true, message: "Password is required" }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                size="large"
                placeholder="Enter your password"
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
                letterSpacing: "0.01em",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
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

export default Login;
