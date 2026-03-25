import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { publicAPI } from "../../services/api";
import { Card, Typography } from "antd";
import SelectCard from "./components/SelectCard";
import { formatFieldLabel } from "./components/SelectCard";

const { Text } = Typography;

const DEFAULT_THEME = {
  primaryColor: "#1890ff",
  secondaryColor: "#52c41a",
  accentColor: "#ff6b6b",
  surfaceColor: "#f0f2f5",
  isDark: false,
  contrast: 100,
  hexToRgba: (hex, opacity) => {
    if (!hex) return `rgba(0,0,0,${opacity})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  },
};

const formatFieldName = (key) => formatFieldLabel(key);

function PublicCardView() {
  const { tagId } = useParams();
  const [card, setCard] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCard = async () => {
      try {
        setLoading(true);
        const res = await publicAPI.getCard(tagId);
        setCard(res.data.data);
        setTenant(res.data.tenant);
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
        design="one"
        card={card}
        tenant={tenant}
        formatFieldName={formatFieldName}
        theme={DEFAULT_THEME}
      />
      <p style={{ marginTop: 24, fontSize: 11, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>NFC Digital Card</p>
    </div>
  );
}

export default PublicCardView;
