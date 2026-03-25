import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cardAPI, tenantAPI, useraccessAPI, tenantPortalAPI } from "../../services/api";
import {
  Button,
  Card,
  Typography,
  Slider,
  Switch,
  Drawer,
  Select,
  Grid,
} from "antd";
import {
  FaArrowLeft,
  FaTimesCircle,
  FaPalette,
  FaSun,
  FaMoon,
  FaRedo,
  FaSlidersH,
} from "react-icons/fa";
import SelectCard from "./components/SelectCard";
import { formatFieldLabel } from "./components/SelectCard";

const { Text } = Typography;

const THEME_PRESETS = {
  ocean: {
    primaryColor: "#1890ff",
    secondaryColor: "#52c41a",
    accentColor: "#ff6b6b",
    surfaceColor: "#f0f2f5",
  },
  sunset: {
    primaryColor: "#f97316",
    secondaryColor: "#facc15",
    accentColor: "#dc2626",
    surfaceColor: "#fff7ed",
  },
  royal: {
    primaryColor: "#4f46e5",
    secondaryColor: "#06b6d4",
    accentColor: "#db2777",
    surfaceColor: "#eef2ff",
  },
  forest: {
    primaryColor: "#166534",
    secondaryColor: "#22c55e",
    accentColor: "#b45309",
    surfaceColor: "#f0fdf4",
  },
};

const DEFAULT_THEME = {
  ...THEME_PRESETS.ocean,
  preset: "ocean",
  isDark: false,
  contrast: 100,
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
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("cardTheme");

    if (!savedTheme) {
      return DEFAULT_THEME;
    }

    try {
      const parsedTheme = JSON.parse(savedTheme);
      return { ...DEFAULT_THEME, ...parsedTheme };
    } catch {
      return DEFAULT_THEME;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    localStorage.setItem("cardTheme", JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = localStorage.getItem("token");

    // Unauthenticated users accessing a manager-scoped card URL
    // should be redirected to the public read-only view.
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
          setCard(tenantRes.data.data);
          setTenant(tenantRes.data.tenant);
          setIsOwner(true); // tenants can customise their own org's cards
        } else {
          // Fetch from organization context (admin / manager)
          cardRes = await useraccessAPI.getOrganizationCard(tenantId, tagId);
          setCard(cardRes.data.data);
          const fetchedTenant = cardRes.data.tenant;
          setTenant(fetchedTenant);

          // Only the owning manager (or an admin) may use the customization sidebar
          const owned =
            currentUser.role === "admin" ||
            fetchedTenant?.createdBy === currentUser.id;
          setIsOwner(owned);
        }
      } else {
        // Fetch from public context
        cardRes = await cardAPI.getById(tagId);
        setCard(cardRes.data.data);
        tenantRes = await tenantAPI.getAll();
        const currentTenant = tenantRes.data.data.find(
          (t) => t.tenantId === tenantId.toUpperCase(),
        );
        setTenant(currentTenant);
      }

      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch card");
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("tenantId")) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const prefix =
        currentUser.role === 'admin' ? '/admin' :
        currentUser.role === 'tenant' ? '/tenant' :
        '/manager';
      const backPath =
        currentUser.role === 'tenant'
          ? `${prefix}/card-holders`
          : `${prefix}/organizations/${params.get("tenantId")}`;
      navigate(backPath);
    } else {
      navigate("/");
    }
  };

  const formatFieldName = (fieldName) => formatFieldLabel(fieldName);

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
  const resetToDefault = () => setTheme(DEFAULT_THEME);

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
    <div className="space-y-4">
      <Card size="small" className="shadow-sm">
        <Text strong className="block">
          Card Design
        </Text>
        <Text type="secondary" className="mb-3 block text-xs">
          Select a design to preview instantly.
        </Text>
        <Select
          value={selectedDesign}
          onChange={setSelectedDesign}
          size="large"
          className="w-full"
          options={[
            { label: "Design 1", value: "one" },
            { label: "Design 2", value: "two" },
            { label: "Design 3", value: "three" },
          ]}
        />
      </Card>

      <Card size="small" className="shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <Text strong>Accessibility</Text>
          <Button
            size="small"
            icon={<FaRedo />}
            onClick={resetToDefault}
            className="text-xs"
          />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme.isDark ? <FaMoon /> : <FaSun />}
            <Text>Dark Mode</Text>
          </div>
          <Switch
            size="small"
            checked={theme.isDark}
            onChange={handleDarkModeToggle}
          />
        </div>

        <div className="mb-3">
          <Text className="mb-1 block text-xs">Theme Preset</Text>
          <Select
            value={theme.preset || "ocean"}
            onChange={handlePresetChange}
            size="middle"
            className="w-full"
            options={[
              { label: "Ocean", value: "ocean" },
              { label: "Sunset", value: "sunset" },
              { label: "Royal", value: "royal" },
              { label: "Forest", value: "forest" },
            ]}
          />
        </div>

        <div className="mb-3">
          <Text className="mb-1 block text-xs">Primary Color</Text>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) =>
                handleColorChange("primaryColor", e.target.value)
              }
              className="h-9 w-9 cursor-pointer rounded"
            />
            <input
              type="text"
              value={theme.primaryColor}
              onChange={(e) =>
                handleColorChange("primaryColor", e.target.value)
              }
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div className="mb-3">
          <Text className="mb-1 block text-xs">Secondary Color</Text>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.secondaryColor}
              onChange={(e) =>
                handleColorChange("secondaryColor", e.target.value)
              }
              className="h-9 w-9 cursor-pointer rounded"
            />
            <input
              type="text"
              value={theme.secondaryColor}
              onChange={(e) =>
                handleColorChange("secondaryColor", e.target.value)
              }
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div className="mb-3">
          <Text className="mb-1 block text-xs">Accent Color</Text>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.accentColor}
              onChange={(e) =>
                handleColorChange("accentColor", e.target.value)
              }
              className="h-9 w-9 cursor-pointer rounded"
            />
            <input
              type="text"
              value={theme.accentColor}
              onChange={(e) =>
                handleColorChange("accentColor", e.target.value)
              }
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div className="mb-3">
          <Text className="mb-1 block text-xs">Surface Color</Text>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.surfaceColor}
              onChange={(e) =>
                handleColorChange("surfaceColor", e.target.value)
              }
              className="h-9 w-9 cursor-pointer rounded"
            />
            <input
              type="text"
              value={theme.surfaceColor}
              onChange={(e) =>
                handleColorChange("surfaceColor", e.target.value)
              }
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs">
            <Text>Contrast</Text>
            <Text>{theme.contrast}%</Text>
          </div>
          <Slider
            min={50}
            max={150}
            value={theme.contrast}
            onChange={handleContrastChange}
            className="mt-1"
          />
        </div>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Text>Loading card...</Text>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 px-4">
        <Card className="max-w-md w-full text-center border-red-300 border">
          <FaTimesCircle className="text-4xl text-red-600 mx-auto" />
          <Text type="danger">{error || "Card not found"}</Text>
          <Button type="primary" onClick={handleBackClick}>
            <FaArrowLeft className="mr-2" /> Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen px-3 py-4 sm:p-6 transition-colors duration-300 ${
        theme.isDark ? "bg-gray-900" : "bg-gray-100"
      }`}
    >
      <div className="mx-auto mb-5 flex w-full max-w-5xl justify-end">
        {isOwner && (
          <Button
            size={isMobile ? "middle" : "large"}
            icon={<FaSlidersH />}
            onClick={() => setSidebarOpen(true)}
            style={{
              background: theme.primaryColor,
              borderColor: theme.primaryColor,
              color: "white",
            }}
          >
            Open Sidebar
          </Button>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-5xl justify-center">
        <SelectCard
          design={selectedDesign}
          card={card}
          tenant={tenant}
          formatFieldName={formatFieldName}
          theme={themeContext}
        />
      </div>

      {isOwner && (
        <Drawer
          title={
            <div className="flex items-center gap-2">
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
