import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
  Popconfirm,
  Avatar,
  Upload,
  Tag,
  Breadcrumb,
  Spin,
  Tooltip,
  Alert,
  Descriptions,
  Grid,
  Divider,
  Switch,
  Badge,
  Slider,
  Card as AntCard,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  EyeOutlined,
  CopyOutlined,
  ShareAltOutlined,
  InboxOutlined,
  FolderOpenOutlined,
  FileImageOutlined,
  SearchOutlined,
  AppstoreOutlined,
  AppstoreAddOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams, Link } from "react-router-dom";
import QRCode from "qrcode";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import {
  useraccessAPI,
  uploadAPI,
  cardAPI,
  cardTemplateAPI,
} from "../../services/api";
import ExcelImportWizard from "../../components/ExcelImportWizard";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";

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

function OrganizationDetail() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userPrefix = currentUser.role === "admin" ? "/admin" : "/manager";

  const [organization, setOrganization] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingZipSheet, setExportingZipSheet] = useState(false);
  const [nfcTags, setNfcTags] = useState([]);
  const [nfcTagsLoading, setNfcTagsLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [zipImportModalOpen, setZipImportModalOpen] = useState(false);
  const [zipImportFile, setZipImportFile] = useState(null);
  const [zipImporting, setZipImporting] = useState(false);
  const [zipImportResult, setZipImportResult] = useState(null);
  const [photosZipModalOpen, setPhotosZipModalOpen] = useState(false);
  const [photosZipFile, setPhotosZipFile] = useState(null);
  const [photosZipUploading, setPhotosZipUploading] = useState(false);
  const [photosZipResult, setPhotosZipResult] = useState(null);
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // Search / filter state
  const [cardSearch, setCardSearch] = useState("");
  const [cardStatusFilter, setCardStatusFilter] = useState("");
  const [filterHouse, setFilterHouse] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterDept, setFilterDept] = useState("");

  // Bulk design state
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDesignOpen, setBulkDesignOpen] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkTheme, setBulkTheme] = useState(DEFAULT_BULK_THEME);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [templateImportOpen, setTemplateImportOpen] = useState(false);

  // Credential verification modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'single' | 'bulk', id?: number }
  const [deleteExecuting, setDeleteExecuting] = useState(false);
  const [orgTemplates, setOrgTemplates] = useState([]);
  const [tablePagination, setTablePagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [statusUpdatingIds, setStatusUpdatingIds] = useState([]);

  // Bulk data edit state
  const [bulkDataEditOpen, setBulkDataEditOpen] = useState(false);
  const [bulkDataCards, setBulkDataCards] = useState([]);
  const [bulkDataSaving, setBulkDataSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await useraccessAPI.getOrganizationCards(tenantId);
      setCards(res.data.data || []);
      setOrganization(res.data.tenant || null);
      setOrgTemplates(res.data.templates || []);
    } catch {
      message.error("Failed to load card holders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const openCreate = async () => {
    setEditingCard(null);
    setProfileUrl("");
    form.resetFields();
    setNfcTagsLoading(true);
    try {
      const res = await useraccessAPI.getAvailableNfcTags(tenantId);
      setNfcTags(res.data.data || []);
    } catch {
      message.error("Failed to load NFC tags");
    } finally {
      setNfcTagsLoading(false);
    }
    setModalOpen(true);
  };

  const openEdit = (card) => {
    setEditingCard(card);
    setProfileUrl(card.profileImageUrl || "");
    const m = card.metadata || {};
    // Split merged grade "One(A)" back to grade + section for the edit form
    let editGrade = m.grade || "";
    let editSection = "";
    const sectionMatch = editGrade.match(/^(.+)\((.+)\)$/);
    if (sectionMatch) {
      editGrade = sectionMatch[1];
      editSection = sectionMatch[2];
    }
    form.setFieldsValue({
      tagId: card.tagId,
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
      guardianPhone: m.guardianPhone || "",
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

  const handleProfileUpload = async (info) => {
    const { file, onSuccess, onError } = info;
    const rawFile = file?.originFileObj || file;
    setProfileUploading(true);

    try {
      if (!rawFile) {
        const err = new Error("No file selected");
        message.error(err.message);
        if (onError) onError(err);
        return;
      }

      if (!rawFile.type?.startsWith("image/")) {
        const err = new Error("Please select an image file");
        message.error(err.message);
        if (onError) onError(err);
        return;
      }

      if (rawFile.size > 5 * 1024 * 1024) {
        const err = new Error("Image must be smaller than 5MB");
        message.error(err.message);
        if (onError) onError(err);
        return;
      }

      const res = await uploadAPI.uploadProfile(rawFile, tenantId);
      const uploadedUrl = res.data?.url || res.data?.data?.url;

      if (!uploadedUrl) {
        const err = new Error("Server did not return uploaded file URL");
        message.error(err.message);
        if (onError) onError(err);
        return;
      }

      setProfileUrl(uploadedUrl);
      message.success("Profile photo uploaded");
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      message.error(
        err?.response?.data?.error || err.message || "Profile upload failed",
      );
      if (onError) onError(err);
    } finally {
      setProfileUploading(false);
    }
  };

  const handleSave = async () => {
    if (profileUploading) {
      message.warning("Please wait for image upload to finish");
      return;
    }

    try {
      const values = await form.validateFields();
      setSaving(true);
      const orgType = organization?.type;

      const metadata = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
      };

      if (orgType === "SCHOOL") {
        // Merge section into grade: "One(A)" or "One"
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
        // drop email/phone/address from base metadata for SCHOOL
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

      const payload = {
        profileImageUrl: profileUrl || null,
        metadata,
      };

      if (editingCard) {
        await useraccessAPI.updateCard(tenantId, editingCard.id, payload);
        message.success("Card holder updated");
      } else {
        await useraccessAPI.addCard(tenantId, {
          tagId: values.tagId,
          ...payload,
        });
        message.success("Card holder added");
      }
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

  const handleDelete = (cardId) => {
    setDeleteTarget({ type: "single", id: cardId });
    setDeleteModalOpen(true);
  };

  const executeSingleDelete = async () => {
    setDeleteExecuting(true);
    try {
      await useraccessAPI.deleteCard(tenantId, deleteTarget.id);
      message.success("Card holder removed");
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to remove");
    } finally {
      setDeleteExecuting(false);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Select at least one card first");
      return;
    }
    setDeleteTarget({ type: "bulk" });
    setDeleteModalOpen(true);
  };

  const executeBulkDelete = async () => {
    setBulkDeleting(true);
    setDeleteExecuting(true);
    try {
      const res = await useraccessAPI.bulkDeleteCards(tenantId, selectedRowKeys);
      message.success(res.data.message || "Selected card holders removed");
      setSelectedRowKeys([]);
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to remove selected card holders");
    } finally {
      setBulkDeleting(false);
      setDeleteExecuting(false);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleDeleteConfirmed = () => {
    if (deleteTarget?.type === "bulk") executeBulkDelete();
    else executeSingleDelete();
  };

  const handleInlineStatusChange = async (card, isActive) => {
    if (statusUpdatingIds.includes(card.id)) return;
    setStatusUpdatingIds((prev) => [...prev, card.id]);
    try {
      await useraccessAPI.updateCard(tenantId, card.id, { isActive });
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, isActive } : c)),
      );
      message.success(`Card marked as ${isActive ? "active" : "inactive"}`);
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to update status");
    } finally {
      setStatusUpdatingIds((prev) => prev.filter((id) => id !== card.id));
    }
  };

  const handleExport = async () => {
    if (cards.length === 0) {
      message.warning("No card holders to export");
      return;
    }

    setExporting(true);
    const zip = new JSZip();

    try {
      for (const card of cards) {
        // 👉 1. Create your card URL (public view)
        const cardUrl = `${window.location.origin}/view/${card.tagId}`;
        // change this if your route is different

        // 👉 2. Generate QR as data URL
        const qrDataUrl = await QRCode.toDataURL(cardUrl, {
          width: 500,
          margin: 2,
        });

        // 👉 3. Convert dataURL → blob
        const blob = await fetch(qrDataUrl).then((res) => res.blob());

        // 👉 4. Determine filename (priority: metadata.photo → profileImageUrl → name)
        const safeName = (card.metadata?.name || card.tagId)
          .replace(/[^a-zA-Z0-9_\- ]/g, "_")
          .trim();
        let exportFilename;
        if (card.metadata?.photo) {
          // ZIP-import cards: use stored original filename (swap extension to .png)
          const photoBase = card.metadata.photo.replace(/\.[^.]+$/, "");
          exportFilename = `${photoBase}.png`;
        } else if (card.profileImageUrl) {
          const basename = card.profileImageUrl.split("/").pop() || "";
          let nameBase;
          if (basename.length > 36 && basename[36] === "_") {
            // ZIP-import storage format: {uuid(36)}_{originalname.ext}
            nameBase = basename.slice(37).replace(/\.[^.]+$/, "").trim();
          } else {
            // Direct-upload format: {uuid}.ext — use card name
            nameBase = safeName;
          }
          exportFilename = nameBase ? `${nameBase}.png` : `${safeName}.png`;
        } else {
          exportFilename = `${safeName}.png`;
        }

        // 👉 5. Add to zip
        zip.file(exportFilename, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });

      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${organization?.name || tenantId}_qr_codes.zip`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      message.success(`Exported ${cards.length} QR codes`);
    } catch (err) {
      console.error(err);
      message.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  /**
   * Export ZIP as Sheet
   * Produces a ZIP containing:
   *   - card_holders.xlsx  (all metadata + a "Photo" column = original filename)
   *   - one image file per card that has a profileImageUrl (fetched from the server)
   * Mirror image of what import-zip expects.
   */
  const handleExportZipSheet = async () => {
    if (cards.length === 0) {
      message.warning("No card holders to export");
      return;
    }
    setExportingZipSheet(true);
    const zip = new JSZip();
    try {
      const rows = [];
      for (const card of cards) {
        const meta = card.metadata || {};
        // Build row matching the import-zip column expectations
        const row = {
          "Tag ID": card.tagId || "",
          Name: meta.name || "",
          Title: meta.title || "",
          Email: meta.email || "",
          Phone: meta.phone || "",
          Address: meta.address || "",
          // School
          "Roll No": meta.studentId || "",
          Class: meta.grade || "",
          Section: meta.section || "",
          House: meta.house || "",
          Guardian: meta.guardianName || "",
          "Guardian Phone": meta.guardianPhone || "",
          // Hospital
          "Employee ID": meta.employeeId || "",
          Department: meta.department || "",
          Specialization: meta.specialization || "",
          "License Number": meta.licenseNumber || "",
          "Emergency Contact": meta.emergencyContact || "",
          // Business
          Company: meta.company || "",
          Position: meta.position || "",
          LinkedIn: meta.linkedIn || "",
          Website: meta.website || "",
          "Business URL": card.businessUrl || "",
          Photo: "",
        };

        // Any extra metadata keys not already captured
        const knownKeys = new Set([
          "name", "title", "email", "phone", "address", "studentId", "grade",
          "section", "house", "guardianName", "guardianPhone", "employeeId",
          "department", "specialization", "licenseNumber", "emergencyContact",
          "company", "position", "linkedIn", "website", "photo", "_design",
          "__templateId", "shortCode", "createdBy",
        ]);
        Object.entries(meta).forEach(([k, v]) => {
          if (!knownKeys.has(k) && v) row[k] = v;
        });

        // Resolve photo filename and fetch the image
        if (card.profileImageUrl) {
          let photoFilename;
          if (meta.photo) {
            // ZIP-import cards store the original filename in metadata.photo
            photoFilename = meta.photo;
          } else {
            const basename = card.profileImageUrl.split("/").pop() || "";
            const safeName = (meta.name || card.tagId).replace(/[^a-zA-Z0-9_\- ]/g, "_").trim();
            if (basename.length > 36 && basename[36] === "_") {
              // ZIP-import storage format: {uuid(36)}_{originalname.ext}
              photoFilename = basename.slice(37) || `${safeName}.jpg`;
            } else {
              // Direct-upload storage format: {uuid(36)}.ext  — keep name + original extension
              const ext = basename.match(/\.([^.]+)$/)?.[1] || "jpg";
              photoFilename = `${safeName}.${ext}`;
            }
          }
          row["Photo"] = photoFilename;
          try {
            // Use a relative URL so the request goes through the Vite proxy
            // (avoids cross-origin fetch failures to the backend port)
            const imgUrl = card.profileImageUrl.startsWith("http")
              ? card.profileImageUrl
              : card.profileImageUrl;
            const imgResp = await fetch(imgUrl);
            if (imgResp.ok) {
              const imgBlob = await imgResp.blob();
              zip.file(photoFilename, imgBlob);
            }
          } catch (fetchErr) {
            console.warn("Could not fetch profile image:", card.profileImageUrl, fetchErr);
          }
        }

        rows.push(row);
      }

      // Build Excel sheet
      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Card Holders");
      const xlsxBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
      zip.file("card_holders.xlsx", xlsxBuffer);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      const safeOrgName = (organization?.name || tenantId || "organization")
        .replace(/[^a-zA-Z0-9_\- ]/g, "_")
        .trim();
      a.download = `${safeOrgName}_card_holders_sheet.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success(`Exported ${rows.length} card holder(s) with images`);
    } catch (err) {
      console.error(err);
      message.error("Export ZIP as Sheet failed");
    } finally {
      setExportingZipSheet(false);
    }
  };

  const handleImportOpen = () => {
    setImportFile(null);
    setImportResult(null);
    setImportModalOpen(true);
  };

  const handleZipImportOpen = () => {
    setZipImportFile(null);
    setZipImportResult(null);
    setZipImportModalOpen(true);
  };

  const handleZipImportConfirm = async () => {
    if (!zipImportFile) {
      message.warning("Please select a ZIP file first");
      return;
    }
    setZipImporting(true);
    try {
      const res = await cardAPI.importZip(tenantId, zipImportFile);
      setZipImportResult(res.data);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || "ZIP import failed");
    } finally {
      setZipImporting(false);
    }
  };

  const handlePhotosZipOpen = () => {
    setPhotosZipFile(null);
    setPhotosZipResult(null);
    setPhotosZipModalOpen(true);
  };

  const handlePhotosZipConfirm = async () => {
    if (!photosZipFile) {
      message.warning("Please select a ZIP file first");
      return;
    }
    setPhotosZipUploading(true);
    try {
      const res = await useraccessAPI.uploadPhotosZip(tenantId, photosZipFile);
      setPhotosZipResult(res.data);
      fetchData();
    } catch (err) {
      const data = err.response?.data;
      if (data?.unmatched) {
        // 422 — validation rejection: show unmatched list inside the modal
        setPhotosZipResult({ _rejected: true, error: data.error, unmatched: data.unmatched });
      } else {
        message.error(data?.error || "Photo upload failed");
      }
    } finally {
      setPhotosZipUploading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) {
      message.warning("Please select a file first");
      return;
    }
    setImporting(true);
    try {
      const res = await cardAPI.importCards(tenantId, importFile);
      setImportResult(res.data);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleExcelExport = () => {
    const exportData = filteredCards;
    if (exportData.length === 0) {
      message.warning("No card holders to export");
      return;
    }

    setExportingExcel(true);
    try {
      const rows = exportData.map((card) => {
        const row = {};
        dataColumns.forEach((col) => {
          const key = col.key;
          if (!key) return;
          const title = typeof col.title === "string" ? col.title : key;
          row[title] = card.metadata?.[key] ?? "";
        });
        row["Tag ID"] = card.tagId || "";
        row["Status"] = card.isActive ? "Active" : "Inactive";
        row["Public URL"] = `${window.location.origin}/view/${card.tagId}`;
        return row;
      });

      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Card Holders");

      const safeOrgName = (organization?.name || tenantId || "organization")
        .replace(/[^a-zA-Z0-9_\- ]/g, "_")
        .trim();
      XLSX.writeFile(workbook, `${safeOrgName}_card_holders.xlsx`);

      message.success(`Exported ${rows.length} card holder(s) to Excel`);
    } catch (err) {
      console.error(err);
      message.error("Excel export failed");
    } finally {
      setExportingExcel(false);
    }
  };

  const orgType = organization?.type;

  const openBulkDataEdit = () => {
    const cloned = cards
      .filter((c) => selectedRowKeys.includes(c.id))
      .map((c) => {
        const metadata = { ...(c.metadata || {}) };
        if (orgType === "SCHOOL") {
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
      prev.map((card) => {
        if (card.id !== cardId) return card;
        if (fieldKey === "__isActive") {
          return { ...card, isActive: value };
        }
        return {
          ...card,
          metadata: {
            ...(card.metadata || {}),
            [fieldKey]: value,
          },
        };
      }),
    );
  };

  const handleBulkDataSaveAll = async () => {
    setBulkDataSaving(true);
    try {
      await Promise.all(
        bulkDataCards.map((card) => {
          const metadata = { ...(card.metadata || {}) };
          if (orgType === "SCHOOL") {
            metadata.grade = mergeGradeSection(
              metadata.grade,
              metadata.section,
            );
            delete metadata.section;
          }
          return useraccessAPI.updateCard(tenantId, card.id, {
            profileImageUrl: card.profileImageUrl || null,
            metadata,
            isActive: card.isActive,
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

  // Pick the template to drive column display:
  // prefer the default template, else the first one available
  const activeTemplate =
    orgTemplates.find((t) => t.isDefault) || orgTemplates[0] || null;

  // Only truly internal / system keys — never visible as table columns
  const INTERNAL_META_KEYS = new Set([
    "_design",
    "__templateId",
    "shortCode",
    "createdBy",
  ]);

  // ── bulk design handler ──────────────────────────────────────────
  const handleBulkDesignApply = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Select at least one card first");
      return;
    }
    setBulkApplying(true);
    try {
      const res = await useraccessAPI.bulkUpdateDesign(
        tenantId,
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

  // ── distinct filter options ──────────────────────────────────────
  const houseOptions = useMemo(
    () =>
      [...new Set(cards.map((c) => c.metadata?.house).filter(Boolean))].map(
        (v) => ({ value: v, label: v }),
      ),
    [cards],
  );

  const gradeOptions = useMemo(
    () =>
      [...new Set(cards.map((c) => c.metadata?.grade).filter(Boolean))].map(
        (v) => ({ value: v, label: v }),
      ),
    [cards],
  );

  const deptOptions = useMemo(
    () =>
      [
        ...new Set(cards.map((c) => c.metadata?.department).filter(Boolean)),
      ].map((v) => ({ value: v, label: v })),
    [cards],
  );

  const filteredCards = useMemo(() => {
    let data = cards;
    if (cardSearch) {
      const q = cardSearch.toLowerCase();
      data = data.filter((c) => {
        if (c.tagId?.toLowerCase().includes(q)) return true;
        const m = c.metadata || {};
        return Object.values(m).some(
          (v) => v && String(v).toLowerCase().includes(q),
        );
      });
    }
    if (cardStatusFilter !== "")
      data = data.filter((c) => String(c.isActive) === cardStatusFilter);
    if (filterHouse)
      data = data.filter((c) => c.metadata?.house === filterHouse);
    if (filterGrade)
      data = data.filter((c) => c.metadata?.grade === filterGrade);
    if (filterDept)
      data = data.filter((c) => c.metadata?.department === filterDept);
    return data;
  }, [
    cards,
    cardSearch,
    cardStatusFilter,
    filterHouse,
    filterGrade,
    filterDept,
  ]);

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(filteredCards.length / tablePagination.pageSize),
    );
    if (tablePagination.current > maxPage) {
      setTablePagination((prev) => ({ ...prev, current: maxPage }));
    }
  }, [filteredCards.length, tablePagination.current, tablePagination.pageSize]);

  useEffect(() => {
    setTablePagination((prev) => ({ ...prev, current: 1 }));
  }, [cardSearch, cardStatusFilter, filterHouse, filterGrade, filterDept]);

  // ── Build table columns ───────────────────────────────────────────
  // Priority: 1) active template fields  2) keys discovered from card metadata
  // 3) legacy hardcoded columns per orgType
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
      // Append any extra keys in card data not part of the template definition
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

    // ── Helper: build a column def for any metadata key ────────────
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

    // ── Find extra keys in card metadata not covered by standard cols ──
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

    // 2. Standard columns + extra keys appended at end
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
  }, [activeTemplate, orgType, cards]);

  const columns = [
    {
      title: "Photo",
      dataIndex: "profileImageUrl",
      width: 84,
      render: (url) =>
        url ? (
          <Avatar src={`${API_BASE}${url}`} size={40} />
        ) : (
          <Avatar icon={<UserOutlined />} size={40} />
        ),
    },
    ...dataColumns,
    {
      title: "Tag ID",
      dataIndex: "tagId",
      width: 150,
      ellipsis: true,
      render: (v) => <code style={{ fontSize: 11 }}>{v}</code>,
      sorter: (a, b) => a.tagId.localeCompare(b.tagId),
    },
    {
      title: "Public URL",
      key: "publicUrl",
      width: 220,
      ellipsis: true,
      render: (_, record) => {
        const url = `${window.location.origin}/view/${record.tagId}`;
        return (
          <Space size={4}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                maxWidth: 150,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-block",
                verticalAlign: "middle",
              }}
            >
              /view/{record.tagId}
            </a>
            <Tooltip title="Copy public URL">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  message.success("Public URL copied!");
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 110,
      render: (v, record) => (
        <Space size={6}>
          <Switch
            size="small"
            checked={Boolean(v)}
            loading={statusUpdatingIds.includes(record.id)}
            onChange={(checked) => handleInlineStatusChange(record, checked)}
          />
          <Tag color={v ? "success" : "default"}>
            {v ? "Active" : "Inactive"}
          </Tag>
        </Space>
      ),
      sorter: (a, b) => Number(b.isActive) - Number(a.isActive),
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Card (internal)">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                navigate(`/card/${record.tagId}?tenantId=${tenantId}`)
              }
            />
          </Tooltip>
          <Tooltip title="View Public Card">
            <Button
              size="small"
              icon={<ShareAltOutlined />}
              onClick={() => window.open(`/view/${record.tagId}`, "_blank")}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Remove">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
            </Tooltip>
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
      render: (v) => <code style={{ fontSize: 11 }}>{v}</code>,
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
      if (orgType === "SCHOOL" && col.key === "grade" && !hasSectionColumn) {
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
    {
      title: "Status",
      key: "isActive",
      width: 110,
      fixed: "right",
      sorter: (a, b) =>
        Number(Boolean(b.isActive)) - Number(Boolean(a.isActive)),
      render: (_, record) => (
        <Switch
          size="small"
          checked={Boolean(record.isActive)}
          onChange={(checked) =>
            handleBulkDataFieldChange(record.id, "__isActive", checked)
          }
        />
      ),
    },
  ];

  if (loading) return <Spin style={{ display: "block", marginTop: 80 }} />;

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: (
              <Link to={`${userPrefix}/organizations`}>Organizations</Link>
            ),
          },
          { title: organization?.name || tenantId },
        ]}
      />

      {/* Org header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* {organization?.logoUrl && (
          <Avatar
            src={`${API_BASE}${organization.logoUrl}`}
            shape="square"
            size={56}
            style={{ border: "1px solid #e0e0e0" }}
          />
        )} */}
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {organization?.name}
          </Title>
          <Text type="secondary">
            {organization?.type} · {organization?.contactEmail}
          </Text>
        </div>
      </div>

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Text strong>
          {cards.length} card holder{cards.length !== 1 ? "s" : ""}
        </Text>
        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExcelExport}
            loading={exportingExcel}
          >
            Export to Excel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
          >
            Export ZIP as QR
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportZipSheet}
            loading={exportingZipSheet}
          >
            Export ZIP as Sheet
          </Button>
          <Button icon={<UploadOutlined />} onClick={handleImportOpen}>
            Import from Excel
          </Button>
          {orgTemplates.length > 0 && (
            <Button
              icon={<AppstoreAddOutlined />}
              type="primary"
              ghost
              onClick={() => setTemplateImportOpen(true)}
            >
              Import with Template
            </Button>
          )}
          <Button icon={<FolderOpenOutlined />} onClick={handleZipImportOpen}>
            Import ZIP
          </Button>
          <Button icon={<FileImageOutlined />} onClick={handlePhotosZipOpen}>
            Upload Photos ZIP
          </Button>
          {selectedRowKeys.length > 0 && (
            <Badge count={selectedRowKeys.length} size="small">
              <Button
                icon={<AppstoreOutlined />}
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
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={bulkDeleting}
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Card Holder
          </Button>
        </Space>
      </div>

      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          placeholder={`Search name, tag${orgType === "SCHOOL" ? ", class, house" : orgType === "HOSPITAL" ? ", dept, specialization" : ", company, position"}…`}
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 280 }}
          onChange={(e) => setCardSearch(e.target.value)}
        />
        <Select
          placeholder="All statuses"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setCardStatusFilter(v ?? "")}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
        {orgType === "SCHOOL" && houseOptions.length > 0 && (
          <Select
            placeholder="House"
            allowClear
            style={{ width: 130 }}
            onChange={(v) => setFilterHouse(v || "")}
            options={houseOptions}
          />
        )}
        {orgType === "SCHOOL" && gradeOptions.length > 0 && (
          <Select
            placeholder="Class / Grade"
            allowClear
            style={{ width: 150 }}
            onChange={(v) => setFilterGrade(v || "")}
            options={gradeOptions}
          />
        )}
        {orgType === "HOSPITAL" && deptOptions.length > 0 && (
          <Select
            placeholder="Department"
            allowClear
            style={{ width: 160 }}
            onChange={(v) => setFilterDept(v || "")}
            options={deptOptions}
          />
        )}
        {selectedRowKeys.length > 0 && (
          <Button size="small" onClick={() => setSelectedRowKeys([])}>
            Clear selection ({selectedRowKeys.length})
          </Button>
        )}
      </Space>
      <Table
        columns={columns}
        dataSource={filteredCards}
        rowKey="id"
        tableLayout="fixed"
        pagination={{
          current: tablePagination.current,
          pageSize: tablePagination.pageSize,
          total: filteredCards.length,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: (page, pageSize) => {
            setTablePagination({ current: page, pageSize });
          },
        }}
        scroll={{ x: "max-content", y: isMobile ? 420 : 560 }}
        size={isMobile ? "small" : "middle"}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          preserveSelectedRowKeys: true,
        }}
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
          <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
            Card Design
          </Typography.Text>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 12 }}
          >
            Select a design to preview instantly.
          </Typography.Text>
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
              <Typography.Text style={{ fontSize: 13 }}>
                Dark Mode
              </Typography.Text>
            </div>
            <Switch
              size="small"
              checked={bulkTheme.isDark}
              onChange={(v) => setBulkTheme((prev) => ({ ...prev, isDark: v }))}
            />
          </div>

          {/* Theme Preset */}
          <div style={{ marginBottom: 14 }}>
            <Typography.Text
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Theme Preset
            </Typography.Text>
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
              <Typography.Text
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {label}
              </Typography.Text>
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
            <Typography.Text
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Font Family
            </Typography.Text>
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
              <Typography.Text style={{ fontSize: 12, color: "#64748b" }}>
                Contrast
              </Typography.Text>
              <Typography.Text style={{ fontSize: 12, color: "#64748b" }}>
                {bulkTheme.contrast}%
              </Typography.Text>
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

      {/* Add / Edit modal */}
      <Modal
        title={editingCard ? "Edit Card Holder" : "Add Card Holder"}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving || profileUploading}
        okText={editingCard ? "Save Changes" : "Add"}
        width={isMobile ? "95%" : 520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editingCard && (
            <Form.Item
              label="NFC Tag ID"
              name="tagId"
              tooltip="Select a registered NFC tag to assign to this card holder, or leave as None to assign later"
            >
              <Select
                showSearch
                allowClear
                loading={nfcTagsLoading}
                placeholder={
                  nfcTagsLoading ? "Loading tags..." : "None (assign tag later)"
                }
                optionFilterProp="label"
                notFoundContent={
                  nfcTagsLoading ? (
                    <Spin size="small" />
                  ) : (
                    "No registered NFC tags available"
                  )
                }
                options={[
                  { value: null, label: "None (assign tag later)" },
                  ...nfcTags
                    .filter(
                      (t) => !t.tagId.toUpperCase().startsWith("PENDING-"),
                    )
                    .map((t) => ({
                      value: t.tagId,
                      label: t.tagId,
                    })),
                ]}
              />
            </Form.Item>
          )}

          <Form.Item label="Profile Photo">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {profileUrl ? (
                <Avatar src={`${API_BASE}${profileUrl}`} size={56} />
              ) : (
                <Avatar icon={<UserOutlined />} size={56} />
              )}
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={handleProfileUpload}
              >
                <Button icon={<UploadOutlined />} loading={profileUploading}>
                  {profileUrl ? "Change Photo" : "Upload Photo"}
                </Button>
              </Upload>
            </div>
          </Form.Item>

          {/* Non-SCHOOL: Full Name shown here; SCHOOL has it inside its own block */}
          {orgType !== "SCHOOL" && (
            <Form.Item
              label="Full Name"
              name="name"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input placeholder="Full name" />
            </Form.Item>
          )}

          {/* SCHOOL fields */}
          {orgType === "SCHOOL" && (
            <>
              <Form.Item label="Roll No" name="studentId">
                <Input placeholder="2" />
              </Form.Item>
              <Form.Item
                label="Full Name"
                name="name"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input placeholder="Full name" />
              </Form.Item>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <Form.Item
                  label="Class"
                  name="grade"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="One" />
                </Form.Item>
                <Form.Item
                  label="Section (optional)"
                  name="section"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="A" />
                </Form.Item>
              </div>
              <Form.Item label="House" name="house" style={{ marginTop: 12 }}>
                <Input placeholder="Blue" />
              </Form.Item>
              <Form.Item label="Guardian" name="guardianName">
                <Input />
              </Form.Item>
              <Form.Item label="Address" name="address">
                <Input placeholder="City / Address" />
              </Form.Item>
              <Form.Item label="Contact" name="phone">
                <Input placeholder="9800000000" />
              </Form.Item>
            </>
          )}

          {/* HOSPITAL fields */}
          {orgType === "HOSPITAL" && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <Form.Item
                  label="Employee ID"
                  name="employeeId"
                  style={{ marginBottom: 0 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label="Department"
                  name="department"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="e.g. Cardiology" />
                </Form.Item>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <Form.Item
                  label="Specialization"
                  name="specialization"
                  style={{ marginBottom: 0 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label="License Number"
                  name="licenseNumber"
                  style={{ marginBottom: 0 }}
                >
                  <Input />
                </Form.Item>
              </div>
              <Form.Item
                label="Emergency Contact"
                name="emergencyContact"
                style={{ marginTop: 12 }}
              >
                <Input />
              </Form.Item>
              <Form.Item label="Address" name="address">
                <Input placeholder="City / Address" />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ type: "email", message: "Invalid email" }]}
              >
                <Input placeholder="email@org.com" />
              </Form.Item>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="+1 555 000 0000" />
              </Form.Item>
            </>
          )}

          {/* BUSINESS / default fields */}
          {orgType !== "SCHOOL" && orgType !== "HOSPITAL" && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <Form.Item
                  label="Position / Title"
                  name="position"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="e.g. Senior Developer" />
                </Form.Item>
                <Form.Item
                  label="Company"
                  name="company"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="Company name" />
                </Form.Item>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <Form.Item
                  label="LinkedIn"
                  name="linkedIn"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="linkedin.com/in/..." />
                </Form.Item>
                <Form.Item
                  label="Website"
                  name="website"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="https://..." />
                </Form.Item>
              </div>
              <Form.Item
                label="Address"
                name="address"
                style={{ marginTop: 12 }}
              >
                <Input placeholder="City / Address" />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ type: "email", message: "Invalid email" }]}
              >
                <Input placeholder="email@org.com" />
              </Form.Item>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="+1 555 000 0000" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Import ZIP (Excel + Photos) modal */}
      <Modal
        title="Import Card Holders + Photos (ZIP)"
        open={zipImportModalOpen}
        onCancel={() => {
          if (!zipImporting) setZipImportModalOpen(false);
        }}
        width={isMobile ? "95%" : 560}
        footer={
          zipImportResult ? (
            <Button type="primary" onClick={() => setZipImportModalOpen(false)}>
              Close
            </Button>
          ) : (
            <Space>
              <Button
                onClick={() => setZipImportModalOpen(false)}
                disabled={zipImporting}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                loading={zipImporting}
                onClick={handleZipImportConfirm}
              >
                Import
              </Button>
            </Space>
          )
        }
      >
        {zipImportResult ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Alert
              type={zipImportResult.summary.failed > 0 ? "warning" : "success"}
              message={zipImportResult.message}
              showIcon
            />
            <Descriptions size="small" bordered column={3}>
              <Descriptions.Item label="Created">
                {zipImportResult.summary.created}
              </Descriptions.Item>
              <Descriptions.Item label="Skipped">
                {zipImportResult.summary.skipped}
              </Descriptions.Item>
              <Descriptions.Item label="Failed">
                {zipImportResult.summary.failed}
              </Descriptions.Item>
            </Descriptions>
            {zipImportResult.details.failed.length > 0 && (
              <div style={{ fontSize: 12, color: "#cf1322" }}>
                <strong>Failed rows:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {zipImportResult.details.failed.map((f, i) => (
                    <li key={i}>
                      Row {f.row}
                      {f.tagId ? ` (${f.tagId})` : ""}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {zipImportResult.details.skipped.length > 0 && (
              <div style={{ fontSize: 12, color: "#d46b08" }}>
                <strong>Skipped rows:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {zipImportResult.details.skipped.map((s, i) => (
                    <li key={i}>
                      Row {s.row}
                      {s.tagId ? ` (${s.tagId})` : ""}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Alert
              type="info"
              showIcon
              message="ZIP file structure"
              description={
                <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                  Create a ZIP containing:
                  <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                    <li>
                      One <strong>.xlsx / .xls / .csv</strong> spreadsheet (same
                      columns as Excel import)
                    </li>
                    <li>
                      Profile photo images (
                      <strong>.jpg / .png / .webp …</strong>) at the same root
                      level
                    </li>
                    <li>
                      Add a <strong>Photo</strong> column in the spreadsheet
                      with the image filename (e.g. <code>_DSC0036.jpg</code>)
                    </li>
                  </ul>
                </div>
              }
            />
            <Upload.Dragger
              accept=".zip"
              beforeUpload={(file) => {
                setZipImportFile(file);
                return false;
              }}
              onRemove={() => setZipImportFile(null)}
              maxCount={1}
              fileList={zipImportFile ? [zipImportFile] : []}
            >
              <p className="ant-upload-drag-icon">
                <FolderOpenOutlined />
              </p>
              <p className="ant-upload-text">Click or drag ZIP file here</p>
              <p className="ant-upload-hint">
                .zip containing Excel + photos — max 50 MB
              </p>
            </Upload.Dragger>
          </div>
        )}
      </Modal>

      {/* Upload Photos ZIP modal */}
      <Modal
        title="Upload Photos ZIP"
        open={photosZipModalOpen}
        onCancel={() => {
          if (!photosZipUploading) setPhotosZipModalOpen(false);
        }}
        width={isMobile ? "95%" : 560}
        footer={
          photosZipResult ? (
            photosZipResult._rejected ? (
              // Rejection — let user fix their ZIP and try again
              <Space>
                <Button onClick={() => setPhotosZipResult(null)}>
                  Try Again
                </Button>
                <Button onClick={() => setPhotosZipModalOpen(false)}>
                  Close
                </Button>
              </Space>
            ) : (
              <Button type="primary" onClick={() => setPhotosZipModalOpen(false)}>
                Close
              </Button>
            )
          ) : (
            <Space>
              <Button
                onClick={() => setPhotosZipModalOpen(false)}
                disabled={photosZipUploading}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                loading={photosZipUploading}
                onClick={handlePhotosZipConfirm}
              >
                Upload
              </Button>
            </Space>
          )
        }
      >
        {photosZipResult ? (
          photosZipResult._rejected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Alert
                type="error"
                showIcon
                message="Upload rejected — unmatched images"
                description={photosZipResult.error}
              />
              <div style={{ fontSize: 12, color: "#cf1322" }}>
                <strong>
                  The following images have no matching card holder (fix your ZIP
                  and try again):
                </strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {photosZipResult.unmatched.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Alert
                type="success"
                message={photosZipResult.message}
                showIcon
              />
              <Descriptions size="small" bordered column={2}>
                <Descriptions.Item label="Linked">
                  {photosZipResult.summary.linked}
                </Descriptions.Item>
                <Descriptions.Item label="Skipped (no image in ZIP)">
                  {photosZipResult.summary.skipped}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Alert
              type="info"
              showIcon
              message="Photos-only ZIP upload"
              description={
                <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                  Upload a ZIP containing only profile photos. Each image will
                  be matched to an existing card holder by its filename:
                  <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                    <li>
                      The image filename must match the{" "}
                      <strong>Photo</strong> column value used during import
                      (e.g. <code>_DSC0036.jpg</code>)
                    </li>
                    <li>
                      Existing profile photos for matched cards will be
                      replaced
                    </li>
                    <li>
                      Cards with no matching image in the ZIP are left
                      unchanged
                    </li>
                  </ul>
                </div>
              }
            />
            <Upload.Dragger
              accept=".zip"
              beforeUpload={(file) => {
                setPhotosZipFile(file);
                return false;
              }}
              onRemove={() => setPhotosZipFile(null)}
              maxCount={1}
              fileList={photosZipFile ? [photosZipFile] : []}
            >
              <p className="ant-upload-drag-icon">
                <FileImageOutlined />
              </p>
              <p className="ant-upload-text">Click or drag photos ZIP here</p>
              <p className="ant-upload-hint">
                .zip containing images only — max 100 MB
              </p>
            </Upload.Dragger>
          </div>
        )}
      </Modal>

      {/* Template-based Excel Import Wizard */}
      <ExcelImportWizard
        open={templateImportOpen}
        onClose={() => setTemplateImportOpen(false)}
        onSuccess={() => {
          setTemplateImportOpen(false);
          fetchData();
        }}
        tenantId={tenantId}
        templates={orgTemplates}
      />

      {/* Bulk Data Edit modal */}
      <Modal
        title={`Edit in Bulk (${bulkDataCards.length} selected)`}
        open={bulkDataEditOpen}
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

      {/* Import from Excel modal */}
      <Modal
        title="Import Card Holders from Excel"
        open={importModalOpen}
        onCancel={() => {
          if (!importing) setImportModalOpen(false);
        }}
        width={isMobile ? "95%" : 520}
        footer={
          importResult ? (
            <Button type="primary" onClick={() => setImportModalOpen(false)}>
              Close
            </Button>
          ) : (
            <Space>
              <Button
                onClick={() => setImportModalOpen(false)}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                loading={importing}
                onClick={handleImportConfirm}
              >
                Import
              </Button>
            </Space>
          )
        }
      >
        {importResult ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Alert
              type={importResult.summary.failed > 0 ? "warning" : "success"}
              message={importResult.message}
              showIcon
            />
            <Descriptions size="small" bordered column={3}>
              <Descriptions.Item label="Created">
                {importResult.summary.created}
              </Descriptions.Item>
              <Descriptions.Item label="Skipped">
                {importResult.summary.skipped}
              </Descriptions.Item>
              <Descriptions.Item label="Failed">
                {importResult.summary.failed}
              </Descriptions.Item>
            </Descriptions>
            {importResult.details.failed.length > 0 && (
              <div style={{ fontSize: 12, color: "#cf1322" }}>
                <strong>Failed rows:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {importResult.details.failed.map((f, i) => (
                    <li key={i}>
                      Row {f.row}
                      {f.tagId ? ` (${f.tagId})` : ""}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {importResult.details.skipped.length > 0 && (
              <div style={{ fontSize: 12, color: "#d46b08" }}>
                <strong>Skipped rows:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {importResult.details.skipped.map((s, i) => (
                    <li key={i}>
                      Row {s.row}
                      {s.tagId ? ` (${s.tagId})` : ""}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, color: "#555", fontSize: 13 }}>
              Upload an <strong>.xlsx</strong>, <strong>.xls</strong>, or{" "}
              <strong>.csv</strong> file. The first row must be a header row.
              {orgType && (
                <>
                  {" "}
                  Columns for <strong>{orgType}</strong>:
                </>
              )}
            </p>
            <div
              style={{
                fontSize: 12,
                background: "#f5f5f5",
                borderRadius: 6,
                padding: "8px 12px",
                lineHeight: 1.8,
              }}
            >
              {orgType === "SCHOOL" && (
                <>
                  <strong>Tag ID:</strong> Optional (auto-assigned if missing)
                  <br />
                  <strong>Columns:</strong> Roll No, Name, Class, Section
                  (optional), House, Guardian, Address, Contact
                </>
              )}
              {orgType === "HOSPITAL" && (
                <>
                  <strong>Tag ID:</strong> Optional (auto-assigned if missing)
                  <br />
                  <strong>Columns:</strong> Name, Employee ID, Department,
                  Specialization, License Number, Emergency Contact, Address,
                  Email, Phone
                </>
              )}
              {orgType !== "SCHOOL" && orgType !== "HOSPITAL" && (
                <>
                  <strong>Tag ID:</strong> Optional (auto-assigned if missing)
                  <br />
                  <strong>Columns:</strong> Name, Position / Designation,
                  Company, LinkedIn, Website, Address, Email, Phone
                </>
              )}
            </div>
            <Upload.Dragger
              accept=".xlsx,.xls,.csv"
              beforeUpload={(file) => {
                setImportFile(file);
                return false;
              }}
              onRemove={() => setImportFile(null)}
              maxCount={1}
              fileList={importFile ? [importFile] : []}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Click or drag file here to upload
              </p>
              <p className="ant-upload-hint">.xlsx / .xls / .csv — max 10 MB</p>
            </Upload.Dragger>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deleteModalOpen}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        loading={deleteExecuting}
        title="Confirm Deletion"
        description={
          deleteTarget?.type === "bulk"
            ? `Permanently remove ${selectedRowKeys.length} selected card holder(s)? This cannot be undone.`
            : "Permanently remove this card holder? This cannot be undone."
        }
      />
    </div>
  );
}

export default OrganizationDetail;
