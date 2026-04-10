import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  cardAPI,
  tenantAPI,
  useraccessAPI,
  tenantPortalAPI,
  cardTemplateAPI,
} from "../../services/api";
import {
  Button,
  Card,
  Typography,
  Slider,
  Switch,
  Drawer,
  Select,
  Grid,
  Avatar,
  Tag,
  Descriptions,
  Statistic,
  Row,
  Col,
  Dropdown,
  Checkbox,
} from "antd";
import {
  FaArrowLeft,
  FaPalette,
  FaSun,
  FaMoon,
  FaRedo,
  FaSlidersH,
  FaEye,
} from "react-icons/fa";
import SelectCard from "./components/SelectCard";
import { formatFieldLabel } from "./components/SelectCard";

const { Text } = Typography;

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

const THEME_PRESETS = {
  ocean: {
    primaryColor: "#1890ff",
    secondaryColor: "#52c41a",
    accentColor: "#ff6b6b",
    surfaceColor: "#f0f2f5",
    textColor: "#1f2937",
    nameTextColor: "#1f2937",
    valueTextColor: "#1f2937",
    fontFamily: DEFAULT_FONT_FAMILY,
  },
  sunset: {
    primaryColor: "#f97316",
    secondaryColor: "#facc15",
    accentColor: "#dc2626",
    surfaceColor: "#fff7ed",
    textColor: "#3f2a1d",
    nameTextColor: "#3f2a1d",
    valueTextColor: "#3f2a1d",
    fontFamily: DEFAULT_FONT_FAMILY,
  },
  royal: {
    primaryColor: "#4f46e5",
    secondaryColor: "#06b6d4",
    accentColor: "#db2777",
    surfaceColor: "#eef2ff",
    textColor: "#1e1b4b",
    nameTextColor: "#1e1b4b",
    valueTextColor: "#1e1b4b",
    fontFamily: DEFAULT_FONT_FAMILY,
  },
  forest: {
    primaryColor: "#166534",
    secondaryColor: "#22c55e",
    accentColor: "#b45309",
    surfaceColor: "#f0fdf4",
    textColor: "#1f2937",
    nameTextColor: "#1f2937",
    valueTextColor: "#1f2937",
    fontFamily: DEFAULT_FONT_FAMILY,
  },
};

const DEFAULT_THEME = {
  ...THEME_PRESETS.ocean,
  preset: "ocean",
  isDark: false,
  contrast: 100,
  layout: {
    avatarTop: 22,
    avatarSize: 116,
    nameTop: 14,
    contentTop: 12,
    contentGap: 8,
    contentLeftPadding: 6,
    contentRightPadding: 6,
  },
};

function CardView() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState("one");
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [savingDesign, setSavingDesign] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templateFields, setTemplateFields] = useState(null);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // Field visibility — persisted inside metadata._design on the server
  const [hiddenFields, setHiddenFields] = useState(new Set());

  const toggleField = (key) => {
    setHiddenFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const applySavedDesign = (fetchedCard) => {
    const saved = fetchedCard?.metadata?._design;
    if (saved && typeof saved === "object") {
      setSelectedDesign(saved.design || "one");
      setHiddenFields(new Set(Array.isArray(saved.hiddenFields) ? saved.hiddenFields : []));
    } else {
      setSelectedDesign("one");
      setTheme(DEFAULT_THEME);
      setHiddenFields(new Set());
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = localStorage.getItem("token");
    // Unauthenticated users accessing a manager-scoped card URL
    if (params.has("tenantId") && !token) {
      navigate(`/view/${tagId}`, { replace: true });
      return;
    }

    fetchCard();
  }, [tagId]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      let tenantId =
        params.get("tenantId") || localStorage.getItem("selectedTenantId");

      if (!tenantId) {
        setError("Tenant ID is required.");
        setLoading(false);
        return;
      }

      // If tenantId is in URL params, use the protected manager endpoint
      // Otherwise use the public card endpoint
      const isFromOrganization = params.has("tenantId");

      let cardRes, tenantRes;

      if (isFromOrganization) {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

        if (currentUser.role === "tenant") {
          // Tenant users fetch their own card via the tenant portal API
          const tenantRes = await tenantPortalAPI.getCardByTag(tagId);
          const fetchedCard = tenantRes.data.data;
          setCard(fetchedCard);
          setTenant(tenantRes.data.tenant);
          if (tenantRes.data.templateFields)
            setTemplateFields(tenantRes.data.templateFields);
          setIsOwner(true); // tenants can customise their own org's cards
          applySavedDesign(fetchedCard);
        } else {
          // Fetch from organization context (admin / manager)
          cardRes = await useraccessAPI.getOrganizationCard(tenantId, tagId);
          const fetchedCard = cardRes.data.data;
          setCard(fetchedCard);
          const fetchedTenant = cardRes.data.tenant;
          setTenant(fetchedTenant);
          // Use template fields returned inline from the manager route
          if (cardRes.data.templateFields)
            setTemplateFields(cardRes.data.templateFields);

          // Only the owning manager (or an admin) may use the customization sidebar
          const owned =
            currentUser.role === "admin" ||
            fetchedTenant?.createdBy === currentUser.id;
          setIsOwner(owned);
          applySavedDesign(fetchedCard);
        }
      } else {
        // Fetch from public context
        cardRes = await cardAPI.getById(tagId);
        const fetchedCard = cardRes.data.data;
        setCard(fetchedCard);
        applySavedDesign(fetchedCard);
        tenantRes = await tenantAPI.getAll();
        const currentTenant = tenantRes.data.data.find(
          (t) => t.tenantId === tenantId.toUpperCase(),
        );
        setTenant(currentTenant);
      }

      setError("");
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("tenantId")) {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const prefix =
        currentUser.role === "admin"
          ? "/admin"
          : currentUser.role === "tenant"
            ? "/tenant"
            : "/manager";
      const backPath =
        currentUser.role === "tenant"
          ? `${prefix}/card-holders`
          : `${prefix}/organizations/${params.get("tenantId")}`;
      navigate(backPath);
    } else {
      navigate("/");
    }
  };

  const formatFieldName = (fieldName) => formatFieldLabel(fieldName);

  // Fetch template fields whenever the card has a __templateId in its metadata
  useEffect(() => {
    if (!card?.metadata?.__templateId) {
      setTemplateFields(null);
      return;
    }
    cardTemplateAPI
      .getById(card.metadata.__templateId, card.tenantId)
      .then((res) => setTemplateFields(res.data?.data?.fields || null))
      .catch(() => setTemplateFields(null));
  }, [card]);

  const handleColorChange = (type, color) => {
    setTheme((prev) => ({ ...prev, [type]: color }));
  };
  const handleContrastChange = (value) => {
    setTheme((prev) => ({ ...prev, contrast: value }));
  };
  const handleDarkModeToggle = (checked) => {
    setTheme((prev) => ({ ...prev, isDark: checked }));
  };
  const handlePresetChange = (presetName) => {
    const selectedPreset = THEME_PRESETS[presetName] || THEME_PRESETS.ocean;
    setTheme((prev) => ({
      ...prev,
      ...selectedPreset,
      preset: presetName,
    }));
  };
  const handleFontFamilyChange = (value) => {
    setTheme((prev) => ({ ...prev, fontFamily: value }));
  };
  const handleLayoutChange = (key, value) => {
    setTheme((prev) => ({
      ...prev,
      layout: {
        ...(prev.layout || DEFAULT_THEME.layout),
        [key]: value,
      },
    }));
  };
  const resetToDefault = () => setTheme(DEFAULT_THEME);

  const handleSaveDesign = async () => {
    if (!card) return;
    setSavingDesign(true);
    try {
      const designSettings = { ...theme, design: selectedDesign, hiddenFields: [...hiddenFields] };
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (currentUser.role === "tenant") {
        await tenantPortalAPI.bulkUpdateDesign([card.id], designSettings);
      } else {
        const params = new URLSearchParams(window.location.search);
        const tenantId =
          params.get("tenantId") || card?.tenantId || localStorage.getItem("selectedTenantId");
        if (!tenantId) throw new Error("Tenant ID is required to save design");
        await useraccessAPI.bulkUpdateDesign(tenantId, [card.id], designSettings);
      }

      // Patch the local card state so it reflects what was just saved,
      // without triggering a full re-fetch (which causes a loading flash
      // and risks accidentally resetting the current designer state).
      setCard((prev) => ({
        ...prev,
        metadata: {
          ...(prev?.metadata || {}),
          _design: designSettings,
        },
      }));

      const { message: msg } = await import("antd");
      msg.success("Design saved");
    } catch (error) {
      const { message: msg } = await import("antd");
      msg.error(error?.response?.data?.error || error?.message || "Failed to save design");
    } finally {
      setSavingDesign(false);
    }
  };

  const hexToRgba = (hex, opacity, contrast = 100) => {
    if (!hex) return `rgba(0,0,0,${opacity})`;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    const factor = contrast / 100;
    r = Math.min(255, Math.max(0, Math.round(r * factor)));
    g = Math.min(255, Math.max(0, Math.round(g * factor)));
    b = Math.min(255, Math.max(0, Math.round(b * factor)));
    return `rgba(${r},${g},${b},${opacity})`;
  };

  const themeContext = {
    ...theme,
    hexToRgba: (hex, opacity) => hexToRgba(hex, opacity, theme.contrast),
  };

  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card
        size="small"
        style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
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
          value={selectedDesign}
          onChange={setSelectedDesign}
          size="large"
          style={{ width: "100%" }}
          options={[
            { label: "Design 1", value: "one" },
            { label: "Design 2", value: "two" },
            { label: "Design 3", value: "three" },
            { label: "Design 4", value: "four" },
            { label: "Design 5", value: "five" },
          ]}
        />
      </Card>

      <Card
        size="small"
        style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
      >
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text strong>Accessibility</Text>
          <Button
            size="small"
            icon={<FaRedo style={{ fontSize: 10 }} />}
            onClick={resetToDefault}
            style={{ borderRadius: 6, display: "flex", alignItems: "center" }}
          />
        </div>

        <div
          style={{
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {theme.isDark ? (
              <FaMoon style={{ fontSize: 13 }} />
            ) : (
              <FaSun style={{ fontSize: 13 }} />
            )}
            <Text style={{ fontSize: 13 }}>Dark Mode</Text>
          </div>
          <Switch
            size="small"
            checked={theme.isDark}
            onChange={handleDarkModeToggle}
          />
        </div>

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
            value={theme.preset || "ocean"}
            onChange={handlePresetChange}
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
                value={theme[key]}
                onChange={(e) => handleColorChange(key, e.target.value)}
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
                value={theme[key]}
                onChange={(e) => handleColorChange(key, e.target.value)}
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
            value={theme.fontFamily || DEFAULT_FONT_FAMILY}
            onChange={handleFontFamilyChange}
            size="middle"
            style={{ width: "100%" }}
            options={FONT_FAMILY_OPTIONS}
          />
        </div>

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
              {theme.contrast}%
            </Text>
          </div>
          <Slider
            min={50}
            max={150}
            value={theme.contrast}
            onChange={handleContrastChange}
          />
        </div>

        <Card
          size="small"
          style={{ marginTop: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}
        >
          <Text strong style={{ display: "block", marginBottom: 12 }}>
            Layout
          </Text>

          {[
            { key: "avatarTop", label: "Avatar Top Spacing", min: 0, max: 60 },
            { key: "avatarSize", label: "Avatar Size", min: 80, max: 160 },
            { key: "nameTop", label: "Name Spacing", min: 0, max: 36 },
            { key: "contentTop", label: "Content Spacing", min: 0, max: 40 },
            { key: "contentGap", label: "Content Row Gap", min: 4, max: 20 },
            { key: "contentLeftPadding", label: "Content Left Padding", min: 0, max: 32 },
            { key: "contentRightPadding", label: "Content Right Padding", min: 0, max: 32 },
          ].map(({ key, label, min, max }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: "#64748b" }}>{label}</Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>{theme.layout?.[key] ?? DEFAULT_THEME.layout[key]}px</Text>
              </div>
              <Slider
                min={min}
                max={max}
                value={theme.layout?.[key] ?? DEFAULT_THEME.layout[key]}
                onChange={(value) => handleLayoutChange(key, value)}
              />
            </div>
          ))}
        </Card>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
        }}
      >
        <Text style={{ color: "#94a3b8" }}>Loading card...</Text>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          background: "#f8fafc",
        }}
      >
        <Card
          style={{
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
          }}
        >
          <Text type="danger" style={{ display: "block", marginBottom: 16 }}>
            {error || "Card not found"}
          </Text>
          <Button
            onClick={handleBackClick}
            style={{
              background: "#09090b",
              color: "#fff",
              border: "none",
              borderRadius: 8,
            }}
          >
            Back
          </Button>
        </Card>
      </div>
    );
  }

  const API_BASE =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:5000";
  const avatarSrc = card.profileImageUrl
    ? `${API_BASE}${card.profileImageUrl}`
    : null;
  const orgLogoSrc = tenant?.logoUrl ? `${API_BASE}${tenant.logoUrl}` : null;

  const INTERNAL_KEYS = [
    "name",
    "title",
    "custom",
    "shortCode",
    "createdBy",
    "section",
    "profileImageUrl",
    "_design",
  ];
  const displayRows = Object.entries(card.metadata || {}).filter(
    ([key]) => !INTERNAL_KEYS.includes(key),
  );

  // All fields toggleable in the Fields menu
  const allToggleableFields = [
    ...displayRows.map(([key]) => ({
      key,
      label: formatFieldName(key),
    })),
    { key: "_field_tagId", label: "Tag ID" },
    ...(card.businessUrl ? [{ key: "_field_businessUrl", label: "Business URL" }] : []),
  ];

  const cardholderName = card.metadata?.name || "—";
  const cardholderTitle = card.metadata?.title || "";

  const DESIGNS = ["one", "two", "three", "four", "five"];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.isDark ? "#09090b" : "#f8fafc",
      }}
    >
      {/* Sticky top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          height: 58,
          background: theme.isDark ? "#18181b" : "#ffffff",
          borderBottom: `1px solid ${theme.isDark ? "#27272a" : "#e4e4e7"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <Button
          icon={<FaArrowLeft style={{ fontSize: 11 }} />}
          onClick={handleBackClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 8,
            fontWeight: 500,
            height: 36,
          }}
        >
          Back
        </Button>

        <Text
          strong
          style={{
            color: theme.isDark ? "#f4f4f5" : "#09090b",
            fontSize: 14,
            letterSpacing: "-0.01em",
          }}
        >
          {tenant?.name || "Card View"}
        </Text>

        {isOwner ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              onClick={handleSaveDesign}
              loading={savingDesign}
              style={{ borderRadius: 8, fontWeight: 500, height: 36 }}
            >
              Save Design
            </Button>
            <Dropdown
              trigger={["click"]}
              dropdownRender={() => (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    padding: "8px 0",
                    minWidth: 200,
                    maxHeight: 360,
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      padding: "4px 12px 8px",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "#555",
                      borderBottom: "1px solid #f0f0f0",
                      marginBottom: 4,
                    }}
                  >
                    Show / hide fields
                  </div>
                  {allToggleableFields.map((f) => (
                    <div
                      key={f.key}
                      style={{
                        padding: "5px 12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onClick={() => toggleField(f.key)}
                    >
                      <Checkbox checked={!hiddenFields.has(f.key)} />
                      <span style={{ fontSize: 13 }}>{f.label}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      borderTop: "1px solid #f0f0f0",
                      marginTop: 4,
                      padding: "6px 12px 2px",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <Button
                      size="small"
                      onClick={() => {
                        setHiddenFields(new Set());
                      }}
                    >
                      Show all
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        const all = new Set(allToggleableFields.map((f) => f.key));
                        setHiddenFields(all);
                      }}
                    >
                      Hide all
                    </Button>
                  </div>
                </div>
              )}
            >
              <Button
                icon={<FaEye style={{ fontSize: 12 }} />}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 8,
                  fontWeight: 500,
                  height: 36,
                }}
              >
                Fields
              </Button>
            </Dropdown>
            <Button
              icon={<FaSlidersH style={{ fontSize: 12 }} />}
              onClick={() => setSidebarOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 8,
                fontWeight: 500,
                height: 36,
                background: "#09090b",
                color: "#fff",
                border: "none",
              }}
            >
              Customize
            </Button>
          </div>
        ) : (
          <div style={{ width: 88 }} />
        )}
      </div>

      {/* Body grid */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: isMobile ? "20px 16px" : "32px 24px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "360px 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ── Left: Card Preview ── */}
        <div style={{ position: isMobile ? "static" : "sticky", top: 74 }}>
          <SelectCard
            design={selectedDesign}
            card={card}
            tenant={tenant}
            formatFieldName={formatFieldName}
            theme={themeContext}
            templateFields={templateFields}
            hiddenFields={hiddenFields}
          />

          {/* Design switcher pills */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              justifyContent: "center",
            }}
          >
            {DESIGNS.map((d, i) => (
              <button
                key={d}
                onClick={() => setSelectedDesign(d)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  border:
                    selectedDesign === d
                      ? "2px solid #09090b"
                      : "2px solid #e4e4e7",
                  background: selectedDesign === d ? "#09090b" : "transparent",
                  color: selectedDesign === d ? "#ffffff" : "#94a3b8",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  transition: "all 0.15s",
                }}
              >
                Design {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: Info Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Cardholder */}
          <Card
            style={{
              borderRadius: 14,
              border: "1px solid #e4e4e7",
              background: theme.isDark ? "#18181b" : "#fff",
            }}
            bodyStyle={{ padding: "20px 24px" }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <Avatar
                size={72}
                src={avatarSrc || undefined}
                style={{
                  background: "#e4e4e7",
                  color: "#64748b",
                  fontSize: 24,
                  flex: "none",
                  border: "2px solid #f1f5f9",
                }}
              >
                {!avatarSrc && cardholderName.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: theme.isDark ? "#f4f4f5" : "#09090b",
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {cardholderName}
                </div>
                {cardholderTitle && (
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>
                    {cardholderTitle}
                  </div>
                )}
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <Tag
                    color={card.isActive ? "green" : "default"}
                    style={{ margin: 0, borderRadius: 6, fontWeight: 500 }}
                  >
                    {card.isActive ? "Active" : "Inactive"}
                  </Tag>
                  {tenant?.type && (
                    <Tag
                      style={{
                        margin: 0,
                        borderRadius: 6,
                        border: "1px solid #e4e4e7",
                        color: "#64748b",
                        background: "transparent",
                      }}
                    >
                      {tenant.type}
                    </Tag>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Organization */}
          {tenant && (
            <Card
              style={{
                borderRadius: 14,
                border: "1px solid #e4e4e7",
                background: theme.isDark ? "#18181b" : "#fff",
              }}
              bodyStyle={{ padding: "16px 24px" }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {/* <Avatar
                  size={44}
                  src={orgLogoSrc || undefined}
                  shape="square"
                  style={{
                    borderRadius: 10,
                    background: "#f1f5f9",
                    border: "1px solid #e4e4e7",
                    flex: "none",
                  }}
                >
                  {!orgLogoSrc && tenant.name?.charAt(0).toUpperCase()}
                </Avatar> */}
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: theme.isDark ? "#f4f4f5" : "#09090b",
                    }}
                  >
                    {tenant.name}
                  </div>
                  {tenant.website && (
                    <a
                      href={
                        tenant.website.startsWith("http")
                          ? tenant.website
                          : `https://${tenant.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        textDecoration: "none",
                      }}
                    >
                      {tenant.website}
                    </a>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Card Details */}
          <Card
            title={
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                }}
              >
                Card Details
              </span>
            }
            style={{
              borderRadius: 14,
              border: "1px solid #e4e4e7",
              background: theme.isDark ? "#18181b" : "#fff",
            }}
            bodyStyle={{ padding: "0 0 4px" }}
            headStyle={{
              borderBottom: "1px solid #f1f5f9",
              padding: "12px 24px",
              minHeight: "auto",
            }}
          >
            {/* Tag ID */}
            {!hiddenFields.has("_field_tagId") && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 24px",
                borderBottom: "1px solid #f8fafc",
              }}
            >
              <Text style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                Tag ID
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.isDark ? "#d4d4d8" : "#1e293b",
                  fontFamily: "monospace",
                  fontWeight: 500,
                }}
              >
                {card.tagId}
              </Text>
            </div>
            )}

            {/* Metadata rows */}
            {displayRows.map(
              ([key, value], idx) =>
                value !== null &&
                value !== undefined &&
                value !== "" &&
                !hiddenFields.has(key) && (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "12px 24px",
                      borderBottom:
                        idx < displayRows.length - 1
                          ? "1px solid #f8fafc"
                          : "none",
                      gap: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#94a3b8",
                        fontWeight: 500,
                        flex: "none",
                      }}
                    >
                      {formatFieldName(key)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.isDark ? "#d4d4d8" : "#374151",
                        textAlign: "right",
                        wordBreak: "break-word",
                      }}
                    >
                      {String(value)}
                    </Text>
                  </div>
                ),
            )}

            {/* Business URL */}
            {card.businessUrl && !hiddenFields.has("_field_businessUrl") && (
              <div
                style={{ padding: "12px 24px", borderTop: "1px solid #f8fafc" }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    fontWeight: 500,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Business URL
                </Text>
                <a
                  href={
                    card.businessUrl.startsWith("http")
                      ? card.businessUrl
                      : `https://${card.businessUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 13,
                    color: "#1e293b",
                    wordBreak: "break-all",
                  }}
                >
                  {card.businessUrl}
                </a>
              </div>
            )}
          </Card>

          {/* Stats */}
          <Card
            style={{
              borderRadius: 14,
              border: "1px solid #e4e4e7",
              background: theme.isDark ? "#18181b" : "#fff",
            }}
            bodyStyle={{ padding: "16px 24px" }}
          >
            <Row gutter={24}>
              <Col span={12}>
                <Statistic
                  title={
                    <span
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        fontWeight: 500,
                      }}
                    >
                      Tap Count
                    </span>
                  }
                  value={card.tapCount ?? 0}
                  valueStyle={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: theme.isDark ? "#f4f4f5" : "#09090b",
                  }}
                />
              </Col>
              <Col span={12}>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      fontWeight: 500,
                      marginBottom: 4,
                    }}
                  >
                    Status
                  </div>
                  <Tag
                    color={card.isActive ? "green" : "default"}
                    style={{
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 13,
                      padding: "2px 10px",
                    }}
                  >
                    {card.isActive ? "Active" : "Inactive"}
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      </div>

      {isOwner && (
        <Drawer
          title={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 600,
              }}
            >
              <FaPalette style={{ color: theme.primaryColor }} />
              <span>Card Panel</span>
            </div>
          }
          placement="right"
          width={isMobile ? "92vw" : 390}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        >
          {sidebarContent}
        </Drawer>
      )}
    </div>
  );
}

export default CardView;
