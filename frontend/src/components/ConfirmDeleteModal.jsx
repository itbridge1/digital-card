import { useState } from "react";
import { Modal, Form, Input, Typography, Alert } from "antd";
import { ExclamationCircleFilled, LockOutlined } from "@ant-design/icons";
import { authAPI } from "../services/api";

const { Text } = Typography;

/**
 * ConfirmDeleteModal – prompts the current user to re-enter their password
 * before a destructive delete action is executed.
 *
 * Props:
 *   open       {boolean}  – controls modal visibility
 *   onConfirm  {function} – called (with no args) after credentials are verified
 *   onCancel   {function} – called when the modal is dismissed
 *   title      {string}   – optional modal title
 *   description {string}  – optional description text shown below the title
 *   loading    {boolean}  – shows spinner on the OK button while the parent is working
 */
export default function ConfirmDeleteModal({
  open,
  onConfirm,
  onCancel,
  title = "Confirm Deletion",
  description,
  loading = false,
}) {
  const [form] = Form.useForm();
  const [verifying, setVerifying] = useState(false);
  const [credError, setCredError] = useState("");

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const handleOk = async () => {
    try {
      const { password } = await form.validateFields();
      setCredError("");
      setVerifying(true);
      await authAPI.verify(password);
      form.resetFields();
      onConfirm();
    } catch (err) {
      if (err?.response) {
        // Axios error – wrong password or network issue
        setCredError(err.response.data?.error || "Incorrect password");
      }
      // Form validation errors are already shown inline – no extra handling needed
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCredError("");
    onCancel();
  };

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleFilled style={{ color: "#ff4d4f", marginRight: 8 }} />
          {title}
        </span>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Confirm Delete"
      okButtonProps={{ danger: true, loading: verifying || loading }}
      cancelButtonProps={{ disabled: verifying || loading }}
      maskClosable={false}
      width={420}
      afterClose={() => {
        form.resetFields();
        setCredError("");
      }}
    >
      {description && (
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          {description}
        </Text>
      )}

      <Text style={{ display: "block", marginBottom: 16 }}>
        Enter your password to confirm this action.
      </Text>

      <Form form={form} layout="vertical" onFinish={handleOk}>
        <Form.Item label="Email">
          <Input value={currentUser.email || ""} disabled />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please enter your password" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Your password"
            autoFocus
            autoComplete="current-password"
          />
        </Form.Item>
      </Form>

      {credError && (
        <Alert
          type="error"
          message={credError}
          showIcon
          style={{ marginTop: 4 }}
        />
      )}
    </Modal>
  );
}
