import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Typography,
  message,
  Popconfirm,
  Avatar,
  Upload,
  Tag,
  Spin,
  Tooltip,
  Alert,
  Grid,
  Select,
  Switch,
  Divider,
  Badge,
  Slider,
  Card as AntCard,
  Descriptions,
} from "antd";
import {
  EditOutlined,
  StopOutlined,
  UndoOutlined,
  UploadOutlined,
  UserOutlined,
  EyeOutlined,
  CopyOutlined,
  SearchOutlined,
  BgColorsOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  tenantPortalAPI,
  uploadAPI,
  cardTemplateAPI,
} from "../../services/api";
import ExcelImportWizard from "../../components/ExcelImportWizard";

const THEME_PRESETS = {
  ocean: {
    primaryColor: "#1890ff",
    secondaryColor: "#52c41a",
    accentColor: "#ff6b6b",
    surfaceColor: "#f0f2f5",
    textColor: "#1f2937",
    nameTextColor: "#1f2937",
    valueTextColor: "#1f2937",
  },
  sunset: {
    primaryColor: "#f97316",
    secondaryColor: "#facc15",
    accentColor: "#dc2626",
    surfaceColor: "#fff7ed",
    textColor: "#3f2a1d",
    nameTextColor: "#3f2a1d",
    valueTextColor: "#3f2a1d",
  },
  royal: {
    primaryColor: "#4f46e5",
    secondaryColor: "#06b6d4",
    accentColor: "#db2777",
    surfaceColor: "#eef2ff",
    textColor: "#1e1b4b",
    nameTextColor: "#1e1b4b",
    valueTextColor: "#1e1b4b",
  },
  forest: {
    primaryColor: "#166534",
    secondaryColor: "#22c55e",
    accentColor: "#b45309",
    surfaceColor: "#f0fdf4",
    textColor: "#1f2937",
    nameTextColor: "#1f2937",
    valueTextColor: "#1f2937",
  },
};

const FONT_FAMILY_OPTIONS = [
  {
    label: "Inter",
    value:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  {
    label: "Poppins",
    value: "'Poppins', 'Segoe UI', Roboto, Arial, sans-serif",
  },
  {
    label: "Montserrat",
    value: "'Montserrat', 'Segoe UI', Roboto, Arial, sans-serif",
  },
  {
    label: "Manrope",
    value: "'Manrope', 'Segoe UI', Roboto, Arial, sans-serif",
  },
  {
    label: "Raleway",
    value: "'Raleway', 'Segoe UI', Roboto, Arial, sans-serif",
  },
  {
    label: "Nunito Sans",
    value: "'Nunito Sans', 'Segoe UI', Roboto, Arial, sans-serif",
  },
  {
    label: "Trebuchet MS",
    value: "'Trebuchet MS', 'Segoe UI', Arial, sans-serif",
  },
  {
    label: "Verdana",
    value: "Verdana, Geneva, Tahoma, sans-serif",
  },
  {
    label: "Lora",
    value: "'Lora', Georgia, 'Times New Roman', serif",
  },
  {
    label: "Merriweather",
    value: "'Merriweather', Georgia, 'Times New Roman', serif",
  },
  {
    label: "Playfair Display",
    value: "'Playfair Display', Georgia, 'Times New Roman', serif",
  },
  {
    label: "Georgia",
    value: "Georgia, 'Times New Roman', Times, serif",
  },
  {
    label: "Palatino",
    value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif",
  },
  {
    label: "Nunito",
    value: "'Nunito', 'Segoe UI', Roboto, Arial, sans-serif",
  },
  {
    label: "Courier New",
    value: "'Courier New', Courier, monospace",
  },
  {
    label: "Consolas",
    value: "Consolas, 'Lucida Console', Monaco, monospace",
  },
];

const DEFAULT_FONT_FAMILY = FONT_FAMILY_OPTIONS[0].value;

const DEFAULT_BULK_THEME = {
  design: "one",
  preset: "ocean",
  ...THEME_PRESETS.ocean,
  fontFamily: DEFAULT_FONT_FAMILY,
  isDark: false,
  contrast: 100,
};

const DESIGN_OPTIONS = [
  { value: "one", label: "Design 1" },
  { value: "two", label: "Design 2" },
  { value: "three", label: "Design 3" },
  { value: "four", label: "Design 4" },
];

const PRESET_OPTIONS = [
  { value: "ocean", label: "Ocean" },
  { value: "sunset", label: "Sunset" },
  { value: "royal", label: "Royal" },
  { value: "forest", label: "Forest" },
];

const { Title, Text } = Typography;
const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

const splitGradeSection = (gradeValue) => {
  const raw = String(gradeValue || "").trim();
  const match = raw.match(/^(.*?)(?:\((.*?)\))?$/);
  return {
    grade: (match?.[1] || "").trim(),
    section: (match?.[2] || "").trim(),
  };
};

const mergeGradeSection = (gradeValue, sectionValue) => {
  const grade = String(gradeValue || "").trim();
  const section = String(sectionValue || "").trim();
  return grade && section ? `${grade}(${section})` : grade;
};

export default function TenantCardHolders() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [search, setSearch] = useState("");
  const [filterHouse, setFilterHouse] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDesignOpen, setBulkDesignOpen] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkTheme, setBulkTheme] = useState(DEFAULT_BULK_THEME);
  const [bulkDataEditOpen, setBulkDataEditOpen] = useState(false);
  const [bulkDataCards, setBulkDataCards] = useState([]);
  const [bulkDataSaving, setBulkDataSaving] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tablePagination, setTablePagination] = useState({
    current: 1,
    pageSize: 20,
  });
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const cardTenantId =
    org?.tenantId || currentUser.tenantId || currentUser.selectedTenantId;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cardsRes, meRes] = await Promise.all([
        tenantPortalAPI.getCards(),
        tenantPortalAPI.getMe(),
      ]);
      setCards(cardsRes.data.data || []);
      setTemplates(cardsRes.data.templates || []);
      setOrg(meRes.data.data || null);
    } catch {
      message.error("Failed to load card holders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── edit modal ──────────────────────────────────────────────────
  const openEdit = (card) => {
    setEditingCard(card);
    setProfileUrl(card.profileImageUrl || "");
    const m = card.metadata || {};

    // Decompose merged "Grade(Section)" back to separate fields for editing
    let editGrade = m.grade || "";
    let editSection = "";
    const sectionMatch = editGrade.match(/^(.+)\((.+)\)$/);
    if (sectionMatch) {
      editGrade = sectionMatch[1];
      editSection = sectionMatch[2];
    }

    form.setFieldsValue({
      name: m.name || "",
      email: m.email || "",
      phone: m.phone || "",
      address: m.address || "",
      // SCHOOL
      studentId: m.studentId || "",
      grade: editGrade,
      section: editSection,
      house: m.house || "",
      guardianName: m.guardianName || "",
      // HOSPITAL
      employeeId: m.employeeId || "",
      department: m.department || "",
      specialization: m.specialization || "",
      licenseNumber: m.licenseNumber || "",
      emergencyContact: m.emergencyContact || "",
      // BUSINESS
      company: m.company || "",
      position: m.position || "",
      linkedIn: m.linkedIn || "",
      website: m.website || "",
    });
    setModalOpen(true);
  };

  // ── profile upload ───────────────────────────────────────────────
  const handleProfileUpload = async (info) => {
    const { file, onSuccess, onError } = info;
    const rawFile = file?.originFileObj || file;
    setProfileUploading(true);
    try {
      if (!rawFile || !rawFile.type?.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }
      if (rawFile.size > 5 * 1024 * 1024) {
        throw new Error("Image must be smaller than 5MB");
      }
      const res = await uploadAPI.uploadProfile(rawFile);
      const url = res.data?.url || res.data?.data?.url;
      if (!url) throw new Error("Server did not return uploaded file URL");
      setProfileUrl(url);
      message.success("Profile photo uploaded");
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      message.error(
        err?.response?.data?.error || err.message || "Upload failed",
      );
      if (onError) onError(err);
    } finally {
      setProfileUploading(false);
    }
  };

  // ── save edit ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (profileUploading) {
      message.warning("Please wait for the image upload to finish");
      return;
    }
    try {
      const values = await form.validateFields();
      setSaving(true);
      const orgType = org?.type;

      const metadata = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
      };

      if (orgType === "SCHOOL") {
        const rawGrade = (values.grade || "").trim();
        const rawSection = (values.section || "").trim();
        const mergedGrade =
          rawGrade && rawSection ? `${rawGrade}(${rawSection})` : rawGrade;
        Object.assign(metadata, {
          studentId: values.studentId,
          grade: mergedGrade,
          house: values.house,
          guardianName: values.guardianName,
        });
        delete metadata.email;
      } else if (orgType === "HOSPITAL") {
        Object.assign(metadata, {
          employeeId: values.employeeId,
          department: values.department,
          specialization: values.specialization,
          licenseNumber: values.licenseNumber,
          emergencyContact: values.emergencyContact,
        });
      } else {
        Object.assign(metadata, {
          company: values.company,
          position: values.position,
          linkedIn: values.linkedIn,
          website: values.website,
        });
      }

      await tenantPortalAPI.updateCard(editingCard.id, {
        profileImageUrl: profileUrl || null,
        metadata,
      });
      message.success("Card holder updated");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      if (err?.response?.data?.error) {
        message.error(err.response.data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── bulk design apply ────────────────────────────────────────────
  const handleBulkDesignApply = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Select at least one card first");
      return;
    }
    setBulkApplying(true);
    try {
      const res = await tenantPortalAPI.bulkUpdateDesign(
        selectedRowKeys,
        bulkTheme,
      );
      message.success(res.data.message || "Design applied");
      setBulkDesignOpen(false);
      setSelectedRowKeys([]);
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to apply design");
    } finally {
      setBulkApplying(false);
    }
  };

  const openBulkDataEdit = () => {
    const cloned = cards
      .filter((c) => selectedRowKeys.includes(c.id))
      .map((c) => {
        const metadata = { ...(c.metadata || {}) };
        if (org?.type === "SCHOOL") {
          const { grade, section } = splitGradeSection(metadata.grade);
          metadata.grade = grade;
          metadata.section = metadata.section || section;
        }
        return { ...c, metadata };
      });
    setBulkDataCards(cloned);
    setBulkDataEditOpen(true);
  };

  const handleBulkDataFieldChange = (cardId, fieldKey, value) => {
    setBulkDataCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? {
              ...card,
              metadata: {
                ...(card.metadata || {}),
                [fieldKey]: value,
              },
            }
          : card,
      ),
    );
  };

  const handleBulkDataSaveAll = async () => {
    setBulkDataSaving(true);
    try {
      await Promise.all(
        bulkDataCards.map((card) => {
          const metadata = { ...(card.metadata || {}) };
          if (org?.type === "SCHOOL") {
            metadata.grade = mergeGradeSection(
              metadata.grade,
              metadata.section,
            );
            delete metadata.section;
          }
          return tenantPortalAPI.updateCard(card.id, {
            profileImageUrl: card.profileImageUrl || null,
            metadata,
          });
        }),
      );
      message.success(`${bulkDataCards.length} card(s) updated successfully`);
      setBulkDataEditOpen(false);
      setSelectedRowKeys([]);
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to update cards");
    } finally {
      setBulkDataSaving(false);
    }
  };

  // ── soft deactivate ──────────────────────────────────────────────
  const handleDeactivate = async (cardId) => {
    try {
      await tenantPortalAPI.deactivateCard(cardId);
      message.success("Card holder deactivated");
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to deactivate");
    }
  };

  // ── restore ──────────────────────────────────────────────────────
  const handleRestore = async (cardId) => {
    try {
      await tenantPortalAPI.restoreCard(cardId);
      message.success("Card holder restored");
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to restore");
    }
  };

  // ── distinct filter options ──────────────────────────────────────
  const houseOptions = useMemo(() => {
    const values = [
      ...new Set(cards.map((c) => c.metadata?.house).filter(Boolean)),
    ];
    return values.map((v) => ({ value: v, label: v }));
  }, [cards]);

  const gradeOptions = useMemo(() => {
    const values = [
      ...new Set(cards.map((c) => c.metadata?.grade).filter(Boolean)),
    ];
    return values.map((v) => ({ value: v, label: v }));
  }, [cards]);

  const deptOptions = useMemo(() => {
    const values = [
      ...new Set(cards.map((c) => c.metadata?.department).filter(Boolean)),
    ];
    return values.map((v) => ({ value: v, label: v }));
  }, [cards]);

  const activeTemplate =
    templates.find((t) => t.isDefault) || templates[0] || null;
  // Only truly internal / system keys that should never become visible table columns
  const INTERNAL_META_KEYS = new Set([
    "_design",
    "__templateId",
    "shortCode",
    "createdBy",
  ]);

  // ── filtered cards ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = cards;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((c) => {
        const m = c.metadata || {};
        return (
          (c.tagId || "").toLowerCase().includes(q) ||
          Object.values(m).some((v) => String(v).toLowerCase().includes(q))
        );
      });
    }
    if (filterHouse)
      data = data.filter((c) => c.metadata?.house === filterHouse);
    if (filterGrade)
      data = data.filter((c) => c.metadata?.grade === filterGrade);
    if (filterDept)
      data = data.filter((c) => c.metadata?.department === filterDept);
    if (filterStatus === "active") data = data.filter((c) => c.isActive);
    if (filterStatus === "inactive") data = data.filter((c) => !c.isActive);
    return data;
  }, [cards, search, filterHouse, filterGrade, filterDept, filterStatus]);

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(filtered.length / tablePagination.pageSize),
    );
    if (tablePagination.current > maxPage) {
      setTablePagination((prev) => ({ ...prev, current: maxPage }));
    }
  }, [filtered.length, tablePagination.current, tablePagination.pageSize]);

  useEffect(() => {
    setTablePagination((prev) => ({ ...prev, current: 1 }));
  }, [search, filterHouse, filterGrade, filterDept, filterStatus]);

  // ── build data columns ───────────────────────────────────────────
  // Priority: 1) active template  2) discovered from card metadata  3) legacy
  const dataColumns = useMemo(() => {
    // 1. Template-defined columns
    if (activeTemplate && activeTemplate.fields?.length > 0) {
      const tplKeys = new Set(activeTemplate.fields.map((f) => f.key));
      const toTitleT = (k) =>
        k
          .replace(/_/g, " ")
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      const tplCols = [...activeTemplate.fields]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .filter((f) => !INTERNAL_META_KEYS.has(f.key))
        .map((f) => ({
          title: f.label,
          key: f.key,
          ellipsis: true,
          render: (_, r) =>
            r.metadata?.[f.key] ? (
              <span>{r.metadata[f.key]}</span>
            ) : (
              <Text type="secondary">—</Text>
            ),
          sorter: (a, b) =>
            String(a.metadata?.[f.key] || "").localeCompare(
              String(b.metadata?.[f.key] || ""),
            ),
        }));
      // Append extra keys in card data not part of the template definition
      const extraT = new Set();
      cards.forEach((c) =>
        Object.keys(c.metadata || {}).forEach((k) => {
          if (!tplKeys.has(k) && !INTERNAL_META_KEYS.has(k)) extraT.add(k);
        }),
      );
      return [
        ...tplCols,
        ...[...extraT].map((k) => ({
          title: toTitleT(k),
          key: k,
          ellipsis: true,
          render: (_, r) =>
            r.metadata?.[k] ? (
              <span>{r.metadata[k]}</span>
            ) : (
              <Text type="secondary">—</Text>
            ),
          sorter: (a, b) =>
            String(a.metadata?.[k] || "").localeCompare(
              String(b.metadata?.[k] || ""),
            ),
        })),
      ];
    }

    // ── Helper: build a column def for any metadata key ──────────
    const toTitle = (k) =>
      k
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    const metaCol = (k, label) => ({
      title: label || toTitle(k),
      key: k,
      ellipsis: true,
      render: (_, r) =>
        r.metadata?.[k] ? (
          <span>{r.metadata[k]}</span>
        ) : (
          <Text type="secondary">—</Text>
        ),
      sorter: (a, b) =>
        String(a.metadata?.[k] || "").localeCompare(
          String(b.metadata?.[k] || ""),
        ),
    });

    // ── Find extra keys not covered by standard cols ──────────────
    const extraKeys = (() => {
      const standardKeys = new Set([
        "name",
        "title",
        "email",
        "phone",
        "address",
        "studentId",
        "grade",
        "section",
        "house",
        "guardianName",
        "guardianPhone",
        "employeeId",
        "department",
        "specialization",
        "licenseNumber",
        "emergencyContact",
        "company",
        "position",
        "linkedIn",
        "website",
        ...INTERNAL_META_KEYS,
      ]);
      const seen = new Set();
      const out = [];
      cards.forEach((c) => {
        Object.keys(c.metadata || {}).forEach((k) => {
          if (!standardKeys.has(k) && !seen.has(k)) {
            seen.add(k);
            out.push(k);
          }
        });
      });
      return out;
    })();

    // 3. Standard cols for this org type + custom keys at end
    const orgType = org?.type;
    let standard;
    if (orgType === "SCHOOL") {
      standard = [
        metaCol("name", "Name"),
        metaCol("studentId", "Roll No"),
        metaCol("grade", "Class"),
        metaCol("house", "House"),
        metaCol("guardianName", "Guardian"),
        metaCol("phone", "Contact"),
      ];
    } else if (orgType === "HOSPITAL") {
      standard = [
        metaCol("name", "Name"),
        metaCol("employeeId", "Employee ID"),
        metaCol("department", "Department"),
        metaCol("specialization", "Specialization"),
        metaCol("phone", "Phone"),
      ];
    } else {
      standard = [
        metaCol("name", "Name"),
        metaCol("position", "Position"),
        metaCol("company", "Company"),
        metaCol("email", "Email"),
        metaCol("phone", "Phone"),
      ];
    }
    return [...standard, ...extraKeys.map((k) => metaCol(k))];
  }, [activeTemplate, org?.type, cards]);

  // ── table columns ────────────────────────────────────────────────
  const columns = [
    {
      title: "Photo",
      key: "photo",
      width: 56,
      render: (_, record) =>
        record.profileImageUrl ? (
          <Avatar src={`${API_BASE}${record.profileImageUrl}`} size="default" />
        ) : (
          <Avatar icon={<UserOutlined />} size="default" />
        ),
    },
    ...dataColumns,
    {
      title: "Tag ID",
      dataIndex: "tagId",
      key: "tagId",
      render: (v) => (
        <Space size={4}>
          <Text code style={{ fontSize: 11 }}>
            {v}
          </Text>
          <Tooltip title="Copy tag ID">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(v);
                message.success("Copied");
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_, r) =>
        r.isActive ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: isMobile ? 100 : 160,
      render: (_, record) => (
        <Space>
          {record.tagId && (
            <Tooltip title="Customise card design">
              <Button
                type="text"
                size="small"
                icon={<BgColorsOutlined />}
                onClick={() =>
                  navigate(
                    cardTenantId
                      ? `/card/${encodeURIComponent(record.tagId)}?tenantId=${encodeURIComponent(cardTenantId)}`
                      : `/card/${encodeURIComponent(record.tagId)}`,
                  )
                }
              />
            </Tooltip>
          )}
          {record.tagId && (
            <Tooltip title="View public card">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() =>
                  window.open(
                    `${window.location.origin}/view/${encodeURIComponent(record.tagId)}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          {record.isActive ? (
            <Popconfirm
              title="Deactivate this card holder?"
              description="The record is kept but the card will be marked inactive."
              onConfirm={() => handleDeactivate(record.id)}
              okText="Deactivate"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Deactivate">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<StopOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Restore this card holder?"
              onConfirm={() => handleRestore(record.id)}
              okText="Restore"
            >
              <Tooltip title="Restore">
                <Button
                  type="text"
                  size="small"
                  icon={<UndoOutlined />}
                  style={{ color: "#1677ff" }}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const bulkEditColumns = [
    {
      title: "Tag ID",
      dataIndex: "tagId",
      key: "tagId",
      width: 160,
      fixed: "left",
      render: (v) => (
        <Text code style={{ fontSize: 11 }}>
          {v}
        </Text>
      ),
      sorter: (a, b) =>
        String(a.tagId || "").localeCompare(String(b.tagId || "")),
    },
    ...dataColumns.flatMap((col) => {
      if (col.key === "photo") return [];

      const cols = [
        {
          title: col.title,
          key: `meta-${col.key}`,
          width: 200,
          sorter: col.sorter,
          render: (_, record) => (
            <Input
              size="small"
              value={record.metadata?.[col.key] ?? ""}
              onChange={(e) =>
                handleBulkDataFieldChange(record.id, col.key, e.target.value)
              }
            />
          ),
        },
      ];

      const hasSectionColumn = dataColumns.some((c) => c.key === "section");
      if (org?.type === "SCHOOL" && col.key === "grade" && !hasSectionColumn) {
        cols.push({
          title: "Section",
          key: "meta-section",
          width: 140,
          sorter: (a, b) =>
            String(a.metadata?.section || "").localeCompare(
              String(b.metadata?.section || ""),
            ),
          render: (_, record) => (
            <Input
              size="small"
              value={record.metadata?.section ?? ""}
              onChange={(e) =>
                handleBulkDataFieldChange(record.id, "section", e.target.value)
              }
            />
          ),
        });
      }

      return cols;
    }),
  ];

  // ── org-type-specific form fields ────────────────────────────────
  const renderTypeFields = () => {
    const orgType = org?.type;
    if (orgType === "SCHOOL") {
      return (
        <>
          <Form.Item label="Student ID" name="studentId">
            <Input />
          </Form.Item>
          <Form.Item label="Grade" name="grade">
            <Input />
          </Form.Item>
          <Form.Item label="Section" name="section">
            <Input />
          </Form.Item>
          <Form.Item label="House" name="house">
            <Input />
          </Form.Item>
          <Form.Item label="Guardian Name" name="guardianName">
            <Input />
          </Form.Item>
        </>
      );
    }
    if (orgType === "HOSPITAL") {
      return (
        <>
          <Form.Item label="Employee ID" name="employeeId">
            <Input />
          </Form.Item>
          <Form.Item label="Department" name="department">
            <Input />
          </Form.Item>
          <Form.Item label="Specialization" name="specialization">
            <Input />
          </Form.Item>
          <Form.Item label="License No." name="licenseNumber">
            <Input />
          </Form.Item>
          <Form.Item label="Emergency Contact" name="emergencyContact">
            <Input />
          </Form.Item>
        </>
      );
    }
    return (
      <>
        <Form.Item label="Company" name="company">
          <Input />
        </Form.Item>
        <Form.Item label="Position" name="position">
          <Input />
        </Form.Item>
        <Form.Item label="LinkedIn" name="linkedIn">
          <Input />
        </Form.Item>
        <Form.Item label="Website" name="website">
          <Input />
        </Form.Item>
      </>
    );
  };

  if (loading) return <Spin style={{ display: "block", marginTop: 80 }} />;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>
        Card Holders
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        {org ? `${org.name} — ${org.type}` : "Your organization"}
      </Text>

      <Alert
        type="info"
        showIcon
        message="You can edit card holder details and deactivate / restore cards. Adding or permanently deleting cards is managed by your administrator."
        style={{ marginBottom: 16 }}
        closable
      />

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Input
          placeholder="Search by name, email, ID or tag…"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 240 }}
        />

        {/* Status filter — always visible */}
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 120 }}
          value={filterStatus || undefined}
          onChange={(v) => setFilterStatus(v || "")}
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />

        {/* SCHOOL-specific filters */}
        {org?.type === "SCHOOL" && houseOptions.length > 0 && (
          <Select
            placeholder="House"
            allowClear
            style={{ width: 130 }}
            value={filterHouse || undefined}
            onChange={(v) => setFilterHouse(v || "")}
            options={houseOptions}
          />
        )}
        {org?.type === "SCHOOL" && gradeOptions.length > 0 && (
          <Select
            placeholder="Class / Grade"
            allowClear
            style={{ width: 150 }}
            value={filterGrade || undefined}
            onChange={(v) => setFilterGrade(v || "")}
            options={gradeOptions}
          />
        )}

        {/* HOSPITAL-specific filter */}
        {org?.type === "HOSPITAL" && deptOptions.length > 0 && (
          <Select
            placeholder="Department"
            allowClear
            style={{ width: 160 }}
            value={filterDept || undefined}
            onChange={(v) => setFilterDept(v || "")}
            options={deptOptions}
          />
        )}

        {/* Bulk design button — shown when rows are selected */}
        {selectedRowKeys.length > 0 && (
          <Badge count={selectedRowKeys.length} size="small">
            <Button
              icon={<AppstoreOutlined />}
              type="primary"
              onClick={() => setBulkDesignOpen(true)}
            >
              Bulk Card Design
            </Button>
          </Badge>
        )}

        {selectedRowKeys.length > 0 && (
          <Badge count={selectedRowKeys.length} size="small">
            <Button icon={<EditOutlined />} onClick={openBulkDataEdit}>
              Edit in Bulk
            </Button>
          </Badge>
        )}

        {selectedRowKeys.length > 0 && (
          <Button size="small" onClick={() => setSelectedRowKeys([])}>
            Clear selection
          </Button>
        )}

        {/* Excel Import — visible when templates are available */}
        {templates.length > 0 && (
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => setImportWizardOpen(true)}
            style={{ marginLeft: "auto" }}
          >
            Import from Excel
          </Button>
        )}
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{
          current: tablePagination.current,
          pageSize: tablePagination.pageSize,
          total: filtered.length,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: (page, pageSize) => {
            setTablePagination({ current: page, pageSize });
          },
        }}
        scroll={{ x: "max-content", y: isMobile ? 420 : 560 }}
        rowClassName={(r) => (!r.isActive ? "row-inactive" : "")}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          preserveSelectedRowKeys: true,
        }}
      />

      {/* Excel Import Wizard */}
      <ExcelImportWizard
        open={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        onSuccess={() => {
          setImportWizardOpen(false);
          fetchData();
        }}
        tenantId={org?.tenantId}
        templates={templates}
      />

      {/* Bulk Card Design Modal */}
      <Modal
        open={bulkDesignOpen}
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingRight: 32,
            }}
          >
            <Space>
              <AppstoreOutlined />
              <span>Bulk Card Design ({selectedRowKeys.length} selected)</span>
            </Space>
            <Tooltip title="Reset to defaults">
              <Button
                size="small"
                icon={<ReloadOutlined style={{ fontSize: 10 }} />}
                onClick={() => setBulkTheme(DEFAULT_BULK_THEME)}
                style={{ borderRadius: 6 }}
              />
            </Tooltip>
          </div>
        }
        onCancel={() => setBulkDesignOpen(false)}
        onOk={handleBulkDesignApply}
        confirmLoading={bulkApplying}
        okText={`Apply to ${selectedRowKeys.length} card(s)`}
        width={460}
        styles={{
          body: { maxHeight: "72vh", overflowY: "auto", paddingRight: 4 },
        }}
        destroyOnClose
      >
        {/* ── Section 1: Card Design (mirrors CardView sidebar) ── */}
        <AntCard
          size="small"
          style={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            marginBottom: 12,
          }}
        >
          <Text strong style={{ display: "block", marginBottom: 4 }}>
            Card Design
          </Text>
          <Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 12 }}
          >
            Select a design to preview instantly.
          </Text>
          <Select
            value={bulkTheme.design}
            onChange={(v) => setBulkTheme((prev) => ({ ...prev, design: v }))}
            size="large"
            style={{ width: "100%" }}
            options={[
              { label: "Design 1", value: "one" },
              { label: "Design 2", value: "two" },
              { label: "Design 3", value: "three" },
              { label: "Design 4", value: "four" },
            ]}
          />
        </AntCard>

        {/* ── Section 2: Accessibility (mirrors CardView sidebar) ── */}
        <AntCard
          size="small"
          style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
        >
          {/* Dark Mode */}
          <div
            style={{
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>
                {bulkTheme.isDark ? "🌙" : "☀️"}
              </span>
              <Text style={{ fontSize: 13 }}>Dark Mode</Text>
            </div>
            <Switch
              size="small"
              checked={bulkTheme.isDark}
              onChange={(v) => setBulkTheme((prev) => ({ ...prev, isDark: v }))}
            />
          </div>

          {/* Theme Preset */}
          <div style={{ marginBottom: 14 }}>
            <Text
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Theme Preset
            </Text>
            <Select
              value={
                bulkTheme.preset === "custom" ? undefined : bulkTheme.preset
              }
              placeholder="Custom"
              onChange={(v) =>
                setBulkTheme((prev) => ({
                  ...prev,
                  ...THEME_PRESETS[v],
                  preset: v,
                }))
              }
              size="middle"
              style={{ width: "100%" }}
              options={[
                { label: "Ocean", value: "ocean" },
                { label: "Sunset", value: "sunset" },
                { label: "Royal", value: "royal" },
                { label: "Forest", value: "forest" },
              ]}
            />
          </div>

          {/* Individual Color Pickers */}
          {[
            { key: "primaryColor", label: "Primary Color" },
            { key: "secondaryColor", label: "Secondary Color" },
            { key: "accentColor", label: "Accent Color" },
            { key: "surfaceColor", label: "Surface Color" },
            { key: "nameTextColor", label: "Name Text Color" },
            { key: "valueTextColor", label: "Value Text Color" },
          ].map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <Text
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {label}
              </Text>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={bulkTheme[key]}
                  onChange={(e) =>
                    setBulkTheme((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                      preset: "custom",
                    }))
                  }
                  style={{
                    width: 36,
                    height: 36,
                    cursor: "pointer",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    padding: 2,
                  }}
                />
                <input
                  type="text"
                  value={bulkTheme[key]}
                  onChange={(e) =>
                    setBulkTheme((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                      preset: "custom",
                    }))
                  }
                  style={{
                    flex: 1,
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    padding: "4px 8px",
                    fontSize: 13,
                    fontFamily: "monospace",
                  }}
                />
              </div>
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <Text
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Font Family
            </Text>
            <Select
              value={bulkTheme.fontFamily || DEFAULT_FONT_FAMILY}
              onChange={(v) =>
                setBulkTheme((prev) => ({
                  ...prev,
                  fontFamily: v,
                  preset: "custom",
                }))
              }
              size="middle"
              style={{ width: "100%" }}
              options={FONT_FAMILY_OPTIONS}
            />
          </div>

          {/* Contrast Slider */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: "#64748b" }}>Contrast</Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                {bulkTheme.contrast}%
              </Text>
            </div>
            <Slider
              min={50}
              max={150}
              value={bulkTheme.contrast}
              onChange={(v) =>
                setBulkTheme((prev) => ({ ...prev, contrast: v }))
              }
            />
          </div>
        </AntCard>

        <Alert
          type="info"
          showIcon
          style={{ marginTop: 12 }}
          message={`Design settings will be applied to ${selectedRowKeys.length} card(s). Each card can still be customised individually from the card view.`}
        />
      </Modal>

      {/* Bulk Data Edit Modal */}
      <Modal
        open={bulkDataEditOpen}
        title={`Edit in Bulk (${bulkDataCards.length} selected)`}
        onCancel={() => setBulkDataEditOpen(false)}
        width={isMobile ? "98%" : 1200}
        footer={[
          <Button key="cancel" onClick={() => setBulkDataEditOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="save-all"
            type="primary"
            loading={bulkDataSaving}
            onClick={handleBulkDataSaveAll}
          >
            Save All
          </Button>,
        ]}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Edit directly in table cells and click Save All when done."
        />
        <Table
          rowKey="id"
          size="small"
          columns={bulkEditColumns}
          dataSource={bulkDataCards}
          pagination={{
            pageSize: tablePagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          scroll={{ x: "max-content", y: isMobile ? 360 : 520 }}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={modalOpen}
        title="Edit Card Holder"
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Save"
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small">
          {/* Profile photo upload */}
          <Form.Item label="Profile Photo">
            <Space align="start">
              {profileUrl ? (
                <Avatar src={`${API_BASE}${profileUrl}`} size={56} />
              ) : (
                <Avatar icon={<UserOutlined />} size={56} />
              )}
              <Upload
                showUploadList={false}
                customRequest={handleProfileUpload}
                accept="image/*"
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={profileUploading}
                  size="small"
                >
                  {profileUploading ? "Uploading…" : "Change Photo"}
                </Button>
              </Upload>
            </Space>
          </Form.Item>

          <Form.Item
            label="Full Name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input />
          </Form.Item>

          {org?.type !== "SCHOOL" && (
            <Form.Item label="Email" name="email">
              <Input type="email" />
            </Form.Item>
          )}

          <Form.Item label="Phone" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="Address" name="address">
            <Input />
          </Form.Item>

          {renderTypeFields()}
        </Form>
      </Modal>

      <style>{`
        .row-inactive td {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
