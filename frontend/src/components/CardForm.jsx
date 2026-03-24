import { useEffect } from "react";
import { Form, Input, Button, Row, Col, Typography, message } from "antd";
import { cardAPI } from "../services/api";

const { Title } = Typography;

export default function CardForm({
  onSuccess,
  onCancel,
  card = null,
  tenantId,
  tenantType,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (card) {
      form.setFieldsValue({
        tagId: card.tagId,
        businessUrl: card.businessUrl,
        ...(typeof card.metadata === "object" && card.metadata !== null
          ? card.metadata
          : {}),
      });
    } else {
      form.resetFields();
    }
  }, [card, form]);

  const onFinish = async (values) => {
    try {
      const metadata = {
        name: values.name,
        title: values.title,
        email: values.email,
        phone: values.phone,
        address: values.address,
      };

      // Dynamic fields
      if (tenantType === "SCHOOL") {
        Object.assign(metadata, {
          studentId: values.studentId,
          grade: values.grade,
          section: values.section,
          house: values.house,
          guardianName: values.guardianName,
          guardianPhone: values.guardianPhone,
        });
      }

      if (tenantType === "HOSPITAL") {
        Object.assign(metadata, {
          employeeId: values.employeeId,
          department: values.department,
          specialization: values.specialization,
          licenseNumber: values.licenseNumber,
          emergencyContact: values.emergencyContact,
        });
      }

      if (tenantType === "BUSINESS") {
        Object.assign(metadata, {
          company: values.company,
          position: values.position,
          linkedIn: values.linkedIn,
          website: values.website,
        });
      }

      if (card) {
        await cardAPI.update(
          card.tagId,
          {
            businessUrl: values.businessUrl,
            metadata,
          },
          tenantId,
        );
        message.success("Card updated successfully");
      } else {
        await cardAPI.create(
          {
            tagId: values.tagId,
            businessUrl: values.businessUrl,
            metadata,
          },
          tenantId,
        );
        message.success("Card created successfully");
      }

      onSuccess();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to save card");
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        tagId: card?.tagId,
        businessUrl: card?.businessUrl,
        ...(typeof card?.metadata === "object" && card?.metadata !== null
          ? card.metadata
          : {}),
      }}
      className="p-4"
    >
      {/* Top Fields */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Tag ID"
            name="tagId"
            rules={[{ required: true, message: "Tag ID is required" }]}
          >
            <Input disabled={!!card} placeholder="A1B2C3D4" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Business URL"
            name="businessUrl"
            rules={[{ required: true, message: "URL is required" }]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>
        </Col>
      </Row>

      {/* Common Info */}
      <Title level={5} className="mt-4 text-sm sm:text-base">
        {tenantType === "SCHOOL" ? "Student Information" : "Common Information"}
      </Title>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Form.Item name="name" label="Full Name">
            <Input placeholder="John Doe" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Form.Item name="phone" label={tenantType === "SCHOOL" ? "Contact" : "Phone"}>
            <Input />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item name="address" label="Address">
            <Input placeholder="City / Address" />
          </Form.Item>
        </Col>
      </Row>

      {/* SCHOOL */}
      {tenantType === "SCHOOL" && (
        <>
          <Title level={5} className="text-sm sm:text-base">School Information</Title>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Form.Item name="studentId" label="Roll No">
                <Input placeholder="2" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="grade" label="Class">
                <Input placeholder="Two" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="section" label="Section">
                <Input placeholder="A" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="house" label="House">
                <Input placeholder="Blue" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="guardianName" label="Guardian">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="guardianPhone" label="Guardian Phone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {/* HOSPITAL */}
      {tenantType === "HOSPITAL" && (
        <>
          <Title level={5} className="text-sm sm:text-base">Hospital Information</Title>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="employeeId" label="Employee ID">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="department" label="Department">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="specialization" label="Specialization">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="licenseNumber" label="License Number">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="emergencyContact" label="Emergency Contact">
            <Input />
          </Form.Item>
        </>
      )}

      {/* BUSINESS */}
      {tenantType === "BUSINESS" && (
        <>
          <Title level={5} className="text-sm sm:text-base">Business Information</Title>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="company" label="Company">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="position" label="Position / Designation">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="linkedIn" label="LinkedIn">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="website" label="Website">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
        <Button type="primary" htmlType="submit" className="w-full sm:w-auto text-sm sm:text-base">
          {card ? "Update Card" : "Register Card"}
        </Button>

        <Button onClick={onCancel} className="w-full sm:w-auto text-sm sm:text-base">
          Cancel
        </Button>
      </div>
    </Form>
  );
}
