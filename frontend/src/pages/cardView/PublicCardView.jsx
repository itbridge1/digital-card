import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { publicAPI } from "../../services/api";
import { Card, Typography } from "antd";
import { FaTimesCircle } from "react-icons/fa";
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Text>Loading card...</Text>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-gray-100">
        <Card className="max-w-md w-full text-center border-red-300 border">
          <FaTimesCircle className="text-4xl text-red-600 mx-auto mb-3" />
          <Text type="danger">{error || "Card not found"}</Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <SelectCard
        design="one"
        card={card}
        tenant={tenant}
        formatFieldName={formatFieldName}
        theme={DEFAULT_THEME}
      />
      <p className="mt-6 text-xs text-gray-400">NFC Digital Card</p>
    </div>
  );
}

export default PublicCardView;
