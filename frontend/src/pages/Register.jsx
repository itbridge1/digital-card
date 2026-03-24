// import { useState, useEffect } from "react";
// import {
//   Form,
//   Input,
//   Button,
//   Card,
//   Typography,
//   Select,
//   message,
//   Divider,
//   Spin,
// } from "antd";
// import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
// import { authAPI, tenantAPI } from "../services/api";
// import { useNavigate } from "react-router-dom";

// const { Title, Text } = Typography;
// const { Option } = Select;

// function Register({ onLoginSuccess }) {
//   const [tenants, setTenants] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [formLoading, setFormLoading] = useState(true);
//   const [form] = Form.useForm();
//   const navigate = useNavigate();

//   useEffect(() => {
//     loadTenants();
//   }, []);

//   const loadTenants = async () => {
//     try {
//       const res = await tenantAPI.getAll();
//       setTenants(res.data.data);
//     } catch (err) {
//       message.error("Failed to load organizations");
//     } finally {
//       setFormLoading(false);
//     }
//   };

//   const onFinish = async (values) => {
//     setLoading(true);
//     try {
//       const res = await authAPI.register(values);
//       const { token, ...user } = res.data.data;

//       localStorage.setItem("token", token);
//       localStorage.setItem("user", JSON.stringify(user));

//       message.success("Registration successful!");

//       if (user.role === "admin") navigate("/admin/dashboard");
//       else if (user.role === "manager") navigate("/manager/dashboard");
//       else navigate("/");

//       onLoginSuccess?.(user, token);
//     } catch (err) {
//       message.error(err.response?.data?.error || "Registration failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
//       <Card
//         className="w-full max-w-md rounded-2xl shadow-md border border-gray-200"
//         bodyStyle={{ padding: "28px" }}
//       >
//         {/* Header */}
//         <div className="text-center mb-6">
//           <Title level={3} className="mb-1!">
//             Create Account
//           </Title>
//           <Text type="secondary" className="text-sm">
//             Register to access NFC Card Platform
//           </Text>
//         </div>

//         {/* Form */}
//         <Spin spinning={formLoading}>
//           <Form
//             form={form}
//             layout="vertical"
//             onFinish={onFinish}
//             autoComplete="off"
//           >
//             <Form.Item
//               label="Full Name"
//               name="name"
//               rules={[{ required: true, message: "Full name is required" }]}
//             >
//               <Input
//                 size="large"
//                 placeholder="John Doe"
//                 prefix={<UserOutlined />}
//               />
//             </Form.Item>

//             <Form.Item
//               label="Email Address"
//               name="email"
//               rules={[
//                 { required: true, message: "Email is required" },
//                 { type: "email", message: "Enter a valid email" },
//               ]}
//             >
//               <Input
//                 size="large"
//                 placeholder="your@email.com"
//                 prefix={<MailOutlined />}
//               />
//             </Form.Item>

//             <Form.Item
//               label="Organization"
//               name="tenantId"
//               rules={[
//                 { required: true, message: "Please select an organization" },
//               ]}
//             >
//               <Select
//                 size="large"
//                 placeholder="Select your organization"
//                 disabled={!tenants.length}
//                 showSearch
//                 optionFilterProp="children"
//               >
//                 {tenants.map((t) => (
//                   <Option key={t.tenantId} value={t.tenantId}>
//                     {t.name} ({t.type})
//                   </Option>
//                 ))}
//               </Select>
//             </Form.Item>

//             <Form.Item
//               label="Password"
//               name="password"
//               rules={[
//                 { required: true, message: "Password is required" },
//                 { min: 6, message: "Minimum 6 characters" },
//               ]}
//             >
//               <Input.Password
//                 size="large"
//                 placeholder="Enter password"
//                 prefix={<LockOutlined />}
//               />
//             </Form.Item>

//             <Button
//               type="primary"
//               htmlType="submit"
//               loading={loading}
//               size="large"
//               className="w-full mt-2 rounded-lg"
//             >
//               {loading ? "Creating..." : "Create Account"}
//             </Button>
//           </Form>
//         </Spin>

//         <Divider plain className="my-5 text-xs">
//           OR
//         </Divider>

//         {/* Footer */}
//         <div className="text-center">
//           <Text className="text-sm text-gray-500">
//             Already have an account?{" "}
//           </Text>
//           <span
//             onClick={() => navigate("/login")}
//             className="text-blue-600 font-medium cursor-pointer hover:underline"
//           >
//             Sign in
//           </span>
//         </div>
//       </Card>
//     </div>
//   );
// }

// export default Register;
