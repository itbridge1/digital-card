import { useEffect } from "react";
import {
  DatePicker,
  Form,
  Input,
  Button,
  Row,
  Col,
  Select,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { cardAPI } from "../services/api";

const { Title } = Typography;
const { Option } = Select;

/**
 * Render a single Ant Design form control for the given field definition.
 * field: { key, label, type, required, options? }
 */
function DynamicField({ field }) {
  const rules = field.required ? [{ required: true, message: `${field.label} is required` }] : [];

  let control;
  switch (field.type) {
    case "email":
      control = (
        <Input
          type="email"
          placeholder={field.label}
          autoComplete="off"
        />
      );
      break;
    case "phone":
      control = <Input type="tel" placeholder={field.label} />;
      break;
    case "url":
      control = <Input type="url" placeholder="https://" />;
      break;
    case "textarea":
      control = <Input.TextArea rows={3} placeholder={field.label} />;
      break;
    case "number":
      control = <Input type="number" placeholder={field.label} />;
      break;
    case "date":
      control = <DatePicker style={{ width: "100%" }} />;
      break;
    case "select":
      control = (
        <Select placeholder={`Select ${field.label}`}>
          {(field.options || []).map((opt) => (
            <Option key={opt} value={opt}>{opt}</Option>
          ))}
        </Select>
      );
      break;
    default:
      control = <Input placeholder={field.label} />;
  }

  return (
    <Form.Item label={field.label} name={field.key} rules={rules}>
      {control}
    </Form.Item>
  );
}

export default function CardForm({
  onSuccess,
  onCancel,
  card = null,
  tenantId,
  tenantType,
  /** Optional CardTemplate object. When provided, fields are rendered dynamically. */
  template = null,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (card) {
      // For date fields: convert ISO string → dayjs so DatePicker works
      const meta = typeof card.metadata === "object" && card.metadata !== null
        ? card.metadata
        : {};
      const dateFields = template
        ? template.fields.filter((f) => f.type === "date").map((f) => f.key)
        : [];
      const converted = { ...meta };
      dateFields.forEach((k) => {
        if (converted[k]) converted[k] = dayjs(converted[k]);
      });

      form.setFieldsValue({
        tagId: card.tagId,
        businessUrl: card.businessUrl,
        ...converted,
      });
    } else {
      form.resetFields();
    }
  }, [card, form, template]);

  const onFinish = async (values) => {
    try {
      const { tagId, businessUrl, ...rest } = values;

      // Normalise date fields back to ISO strings
      const dateFields = template
        ? template.fields.filter((f) => f.type === "date").map((f) => f.key)
        : [];

      const metadata = {};
      Object.entries(rest).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        if (dateFields.includes(k) && v?.toISOString) {
          metadata[k] = v.toISOString();
        } else {
          metadata[k] = v;
        }
      });

      // ── Legacy hardcoded fields (when no template is provided) ────────────
      if (!template) {
        Object.assign(metadata, {
          name: values.name,
          title: values.title,
          email: values.email,
          phone: values.phone,
          address: values.address,
        });

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
      }

      // Retain __templateId when editing a template-based card
      if (template) metadata.__templateId = template.id;

      if (card) {
        await cardAPI.update(card.tagId, { businessUrl, metadata }, tenantId);
        message.success("Card updated successfully");
      } else {
        await cardAPI.create({ tagId, businessUrl, metadata }, tenantId);
        message.success("Card created successfully");
      }

      onSuccess();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to save card");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const initialValues = {
    tagId: card?.tagId,
    businessUrl: card?.businessUrl,
    ...(typeof card?.metadata === "object" && card?.metadata !== null
      ? card.metadata
      : {}),
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={initialValues}
      className="p-4"
    >
      {/* Tag ID + Business URL */}
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

      {/* ── Dynamic template fields ─────────────────────────────────────────── */}
      {template ? (
        <>
          <Title level={5} className="mt-4 text-sm sm:text-base">
            {template.name}
          </Title>
          <Row gutter={[12, 12]}>
            {(template.fields || []).map((field) => (
              <Col xs={24} md={12} key={field.key}>
                <DynamicField field={field} />
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <>
          {/* ── Legacy hardcoded fields ──────────────────────────────────── */}
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
                  <Form.Item name="studentId" label="Roll No"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="grade" label="Class"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="section" label="Section"><Input /></Form.Item>
                </Col>
              </Row>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Form.Item name="house" label="House"><Input /></Form.Item>
                </Col>
              </Row>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Form.Item name="guardianName" label="Guardian"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="guardianPhone" label="Guardian Phone"><Input /></Form.Item>
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
                  <Form.Item name="employeeId" label="Employee ID"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="department" label="Department"><Input /></Form.Item>
                </Col>
              </Row>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Form.Item name="specialization" label="Specialization"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="licenseNumber" label="License Number"><Input /></Form.Item>
                </Col>
              </Row>
              <Form.Item name="emergencyContact" label="Emergency Contact"><Input /></Form.Item>
            </>
          )}

          {/* BUSINESS */}
          {tenantType === "BUSINESS" && (
            <>
              <Title level={5} className="text-sm sm:text-base">Business Information</Title>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Form.Item name="company" label="Company"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="position" label="Position / Designation"><Input /></Form.Item>
                </Col>
              </Row>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Form.Item name="linkedIn" label="LinkedIn"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="website" label="Website"><Input /></Form.Item>
                </Col>
              </Row>
            </>
          )}
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

