import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { publicAPI } from "../../services/api";
import { Card, Typography } from "antd";
import SelectCard from "./components/SelectCard";
import { formatFieldLabel } from "./components/SelectCard";

const { Text } = Typography;

const DEFAULT_THEME = {
  design: "one",
  preset: "ocean",
  primaryColor: "#1890ff",
  secondaryColor: "#52c41a",
  accentColor: "#ff6b6b",
  surfaceColor: "#f0f2f5",
  textColor: "#1f2937",
  nameTextColor: "#1f2937",
  valueTextColor: "#1f2937",
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  isDark: false,
  contrast: 100,
};

const formatFieldName = (key) => formatFieldLabel(key);

function PublicCardView() {
  const { tagId } = useParams();
  const [card, setCard] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [templateFields, setTemplateFields] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDesign, setSelectedDesign] = useState("one");
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [hiddenFields, setHiddenFields] = useState(new Set());

  const buildThemeContext = (themeConfig) => {
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

    return {
      ...themeConfig,
      hexToRgba: (hex, opacity) =>
        hexToRgba(hex, opacity, themeConfig?.contrast ?? 100),
    };
  };

  useEffect(() => {
    const fetchCard = async () => {
      try {
        setLoading(true);
        const res = await publicAPI.getCard(tagId);
        const fetchedCard = res.data.data;
        setCard(fetchedCard);
        setTenant(res.data.tenant);
        setTemplateFields(res.data.templateFields || null);

        const savedDesign = fetchedCard?.metadata?._design;
        if (savedDesign && typeof savedDesign === "object") {
          setSelectedDesign(savedDesign.design || "one");
          setTheme({
            ...DEFAULT_THEME,
            ...savedDesign,
            layout: {
              ...DEFAULT_THEME.layout,
              ...(savedDesign.layout || {}),
            },
          });
          setHiddenFields(new Set(Array.isArray(savedDesign.hiddenFields) ? savedDesign.hiddenFields : []));
        } else {
          setSelectedDesign("one");
          setTheme(DEFAULT_THEME);
          setHiddenFields(new Set());
        }

        setError("");
      } catch (err) {
        setError(err.response?.data?.error || "Card not found");
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [tagId]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f5f9",
      }}>
        <Text style={{ color: "#64748b" }}>Loading card...</Text>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f5f9",
        padding: 24,
      }}>
        <Card
          style={{
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
            borderRadius: 16,
            border: "1px solid #fecaca",
          }}
        >
          <div style={{ fontSize: 36, color: "#ef4444", marginBottom: 12, lineHeight: 1 }}>&#10005;</div>
          <Text type="danger">{error || "Card not found"}</Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#f1f5f9",
      padding: "16px 12px",
    }}>
      <SelectCard
        design={selectedDesign}
        card={card}
        tenant={tenant}
        formatFieldName={formatFieldName}
        theme={buildThemeContext(theme)}
        templateFields={templateFields}
        hiddenFields={hiddenFields}
      />
      <p style={{ marginTop: 24, fontSize: 11, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>NFC Digital Card</p>
    </div>
  );
}

export default PublicCardView;
