/**
 * ExcelImportWizard
 * -----------------
 * A three-step modal for importing card holders from an Excel / CSV file
 * using a dynamic CardTemplate field mapping.
 *
 * Steps:
 *  1. Pick a template + upload file  → parse columns & preview
 *  2. Map Excel columns → template fields
 *  3. Confirm & import  → show results
 *
 * Props:
 *  open         {boolean}
 *  onClose      {() => void}
 *  onSuccess    {() => void}   – called after a successful import
 *  tenantId     {string}
 *  templates    {array}        – list of CardTemplate objects for the tenant
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Divider,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  FileExcelOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { cardTemplateAPI } from "../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

const STEP_LABELS = ["Choose Template & File", "Map Columns", "Import"];

// Sentinel value that means "ignore this column"
const IGNORE = "__ignore__";

export default function ExcelImportWizard({ open, onClose, onSuccess, tenantId, templates = [] }) {
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState(null);
  const [file, setFile] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { columns, preview, totalRows }
  const [mapping, setMapping] = useState({}); // { excelColumn: templateFieldKey | IGNORE }
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // import response summary

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setStep(0);
      setTemplateId(null);
      setFile(null);
      setPreviewData(null);
      setMapping({});
      setResult(null);
    }
  }, [open]);

  const selectedTemplate = templates.find((t) => t.id === templateId) || null;

  // ── Step 1: preview Excel ──────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    if (!file) return message.warning("Please select a file");
    if (!templateId) return message.warning("Please select a template");

    setPreviewing(true);
    try {
      const res = await cardTemplateAPI.previewExcel(file);
      const data = res.data;
      setPreviewData(data);

      // Auto-map columns to template fields by fuzzy label match
      const norm = (s) => String(s || "").toLowerCase().replace(/[\s_\-\.]+/g, "");
      const initialMapping = {};

      data.columns.forEach((col) => {
        const colNorm = norm(col);

        // Check "tagId" / "Tag ID" first
        if (/tag[\s_]?id|tagid|tag/i.test(col)) {
          initialMapping[col] = "tagId";
          return;
        }

        // Try to match against template field keys/labels
        if (selectedTemplate) {
          for (const f of selectedTemplate.fields) {
            if (norm(f.label) === colNorm || norm(f.key) === colNorm) {
              initialMapping[col] = f.key;
              return;
            }
          }
        }

        initialMapping[col] = IGNORE;
      });

      setMapping(initialMapping);
      setStep(1);
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to parse file");
    } finally {
      setPreviewing(false);
    }
  }, [file, templateId, selectedTemplate]);

  // ── Step 2: execute import ─────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    if (!file || !templateId) return;

    // Check at least one non-ignore mapping exists
    const activeMapping = Object.fromEntries(
      Object.entries(mapping).filter(([, v]) => v && v !== IGNORE),
    );
    if (Object.keys(activeMapping).length === 0) {
      return message.warning("Map at least one column before importing");
    }

    setImporting(true);
    try {
      const res = await cardTemplateAPI.importFromExcel(templateId, tenantId, file, activeMapping);
      setResult(res.data);
      setStep(2);
      onSuccess?.();
    } catch (err) {
      message.error(err.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  }, [file, templateId, tenantId, mapping, onSuccess]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const fieldOptions = selectedTemplate
    ? [
        { key: "tagId", label: "Tag ID (NFC tag identifier)" },
        ...selectedTemplate.fields.map((f) => ({ key: f.key, label: f.label })),
      ]
    : [];

  const renderStep0 = () => (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <div>
        <Text strong>1. Select a card template</Text>
        <Select
          value={templateId}
          onChange={setTemplateId}
          placeholder="Choose template…"
          style={{ width: "100%", marginTop: 8 }}
        >
          {templates.map((t) => (
            <Option key={t.id} value={t.id}>
              {t.name}
              {t.isDefault && <Tag color="gold" style={{ marginLeft: 8 }}>Default</Tag>}
            </Option>
          ))}
        </Select>
        {selectedTemplate && (
          <div style={{ marginTop: 6 }}>
            <Text type="secondary">Fields: </Text>
            {selectedTemplate.fields.map((f) => (
              <Tag key={f.key} color="blue" style={{ margin: 2 }}>{f.label}</Tag>
            ))}
          </div>
        )}
      </div>

      <div>
        <Text strong>2. Upload your Excel / CSV file</Text>
        <Upload.Dragger
          accept=".xlsx,.xls,.csv"
          beforeUpload={(f) => { setFile(f); return false; }}
          fileList={file ? [file] : []}
          onRemove={() => setFile(null)}
          style={{ marginTop: 8 }}
          maxCount={1}
        >
          <p className="ant-upload-drag-icon">
            <FileExcelOutlined style={{ fontSize: 32, color: "#52c41a" }} />
          </p>
          <p>Click or drag .xlsx / .xls / .csv file here</p>
          <p><Text type="secondary">Max 15 MB</Text></p>
        </Upload.Dragger>
      </div>

      <div style={{ textAlign: "right" }}>
        <Button
          type="primary"
          icon={<CloudUploadOutlined />}
          loading={previewing}
          onClick={handlePreview}
          disabled={!file || !templateId}
        >
          Parse File & Continue
        </Button>
      </div>
    </Space>
  );

  const renderStep1 = () => {
    if (!previewData) return null;
    const { columns, preview, totalRows } = previewData;

    const mappingTableCols = [
      {
        title: "Excel Column",
        dataIndex: "col",
        width: "40%",
        render: (col) => <Text code>{col}</Text>,
      },
      {
        title: "Sample Data",
        dataIndex: "col",
        width: "25%",
        render: (col) => (
          <Text type="secondary" ellipsis style={{ maxWidth: 120 }}>
            {preview[0]?.[col] || "—"}
          </Text>
        ),
      },
      {
        title: "Maps to field →",
        dataIndex: "col",
        render: (col) => (
          <Select
            value={mapping[col] || IGNORE}
            onChange={(v) => setMapping((m) => ({ ...m, [col]: v }))}
            style={{ width: "100%" }}
          >
            <Option value={IGNORE}><Text type="secondary">— Ignore —</Text></Option>
            {fieldOptions.map((f) => (
              <Option key={f.key} value={f.key}>{f.label}</Option>
            ))}
          </Select>
        ),
      },
    ];

    return (
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          message={`${totalRows} rows detected in "${file?.name}". Map each Excel column to a template field or ignore it.`}
          type="info"
          showIcon
        />

        <Table
          dataSource={columns.map((c) => ({ col: c, key: c }))}
          columns={mappingTableCols}
          pagination={false}
          size="small"
          scroll={{ y: 320 }}
        />

        <Divider orientation="left">Preview (first 5 rows)</Divider>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} style={{ border: "1px solid #d9d9d9", padding: "4px 8px", background: "#fafafa" }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c} style={{ border: "1px solid #d9d9d9", padding: "4px 8px" }}>
                      {String(row[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Row justify="space-between" style={{ marginTop: 8 }}>
          <Button onClick={() => setStep(0)}>Back</Button>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            loading={importing}
            onClick={handleImport}
          >
            Import {totalRows} rows
          </Button>
        </Row>
      </Space>
    );
  };

  const renderStep2 = () => {
    if (!result) return null;
    const { summary, details } = result;

    return (
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div style={{ textAlign: "center" }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: "#52c41a" }} />
          <Title level={4} style={{ marginTop: 12 }}>Import Complete</Title>
        </div>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: "center", padding: 16, background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#52c41a" }}>{summary.created}</div>
              <div>Created</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: "center", padding: 16, background: "#fffbe6", borderRadius: 8, border: "1px solid #ffe58f" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#faad14" }}>{summary.skipped}</div>
              <div>Skipped</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: "center", padding: 16, background: "#fff1f0", borderRadius: 8, border: "1px solid #ffa39e" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#f5222d" }}>{summary.failed}</div>
              <div>Failed</div>
            </div>
          </Col>
        </Row>

        {(details.skipped.length > 0 || details.failed.length > 0) && (
          <details>
            <summary style={{ cursor: "pointer", color: "#1677ff" }}>View skipped / failed rows</summary>
            <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 8 }}>
              {details.skipped.map((r) => (
                <div key={r.row} style={{ fontSize: 12, color: "#faad14" }}>
                  Row {r.row} ({r.tagId}): {r.reason}
                </div>
              ))}
              {details.failed.map((r) => (
                <div key={r.row} style={{ fontSize: 12, color: "#f5222d" }}>
                  Row {r.row} ({r.tagId}): {r.reason}
                </div>
              ))}
            </div>
          </details>
        )}

        <div style={{ textAlign: "right" }}>
          <Button type="primary" onClick={onClose}>Close</Button>
        </div>
      </Space>
    );
  };

  return (
    <Modal
      title="Import Cards from Excel"
      open={open}
      onCancel={onClose}
      footer={null}
      width={Math.min(window.innerWidth - 32, 800)}
      destroyOnHidden
    >
      <Steps
        current={step}
        items={STEP_LABELS.map((label) => ({ title: label }))}
        style={{ marginBottom: 24 }}
        size="small"
      />

      <Spin spinning={previewing || importing}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </Spin>
    </Modal>
  );
}
