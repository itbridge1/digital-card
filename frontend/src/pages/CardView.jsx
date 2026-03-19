import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cardAPI, tenantAPI } from "../services/api";
import { Button, Card, Typography, Divider, message, Tag } from "antd";
import {
  FaArrowLeft,
  FaIdCard,
  FaGraduationCap,
  FaUsers,
  FaUserShield,
  FaPhone,
  FaLink,
  FaCopy,
  FaTimesCircle,
  FaHospital,
  FaBriefcase,
  FaEnvelope,
} from "react-icons/fa";
import { APP_THEME, hexToRgba } from "../theme/theme";

const { Title, Text } = Typography;

function CardView() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCard();
  }, [tagId]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      let tenantId =
        params.get("tenantId") || localStorage.getItem("selectedTenantId");

      if (!tenantId) {
        setError("Tenant ID is required. Please select a tenant.");
        setLoading(false);
        return;
      }

      const cardResponse = await cardAPI.getById(tagId, tenantId);
      setCard(cardResponse.data.data);

      const tenantResponse = await tenantAPI.getAll();
      const currentTenant = tenantResponse.data.data.find(
        (t) => t.tenantId === tenantId,
      );
      setTenant(currentTenant);

      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch card");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success("Copied to clipboard!");
  };

  const getFieldIcon = (fieldName) => {
    const iconMap = {
      email: { icon: FaEnvelope, color: APP_THEME.primaryColor },
      phone: { icon: FaPhone, color: APP_THEME.secondaryColor },
      studentId: { icon: FaIdCard, color: APP_THEME.primaryColor },
      employeeId: { icon: FaIdCard, color: APP_THEME.primaryColor },
      grade: { icon: FaGraduationCap, color: APP_THEME.secondaryColor },
      section: { icon: FaUsers, color: APP_THEME.secondaryColor },
      guardianName: { icon: FaUserShield, color: APP_THEME.primaryColor },
      guardianPhone: { icon: FaPhone, color: APP_THEME.primaryColor },
      department: { icon: FaHospital, color: APP_THEME.secondaryColor },
      specialization: { icon: FaUsers, color: APP_THEME.secondaryColor },
      licenseNumber: { icon: FaIdCard, color: APP_THEME.primaryColor },
      emergencyContact: { icon: FaPhone, color: APP_THEME.secondaryColor },
      company: { icon: FaBriefcase, color: APP_THEME.primaryColor },
      position: { icon: FaIdCard, color: APP_THEME.secondaryColor },
      linkedIn: { icon: FaLink, color: APP_THEME.primaryColor },
      website: { icon: FaLink, color: APP_THEME.secondaryColor },
    };
    return (
      iconMap[fieldName] || { icon: FaIdCard, color: APP_THEME.primaryColor }
    );
  };

  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const isUrl = (value) =>
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://"));

  if (loading) {
    return (
      <div className="app-theme-page-bg min-h-screen flex items-center justify-center">
        <div className="app-theme-spinner animate-spin w-12 h-12 rounded-full"></div>
        <Text className="ml-4">Loading card details...</Text>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 px-4">
        <Card className="max-w-md w-full text-center border-red-300 border">
          <div className="flex flex-col items-center gap-4">
            <FaTimesCircle className="text-4xl text-red-600" />
            <Text type="danger">{error || "Card not found"}</Text>
            <Button type="primary" onClick={() => navigate("/")}>
              <FaArrowLeft className="mr-2" /> Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-theme-page-bg min-h-screen py-8 px-4 flex flex-col items-center">
      {/* Card */}
      <Card
        className="w-full max-w-3xl shadow-xl rounded-2xl p-6"
        style={{ borderTop: `4px solid ${APP_THEME.primaryColor}` }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Avatar */}
          <div
            className="relative w-36 h-36 rounded-full border-4 shadow-lg flex items-center justify-center"
            style={{
              borderColor: hexToRgba(APP_THEME.secondaryColor, 0.3),
              backgroundColor: hexToRgba(APP_THEME.secondaryColor, 0.12),
            }}
          >
            <Text
              className="text-6xl font-bold"
              style={{ color: APP_THEME.primaryColor }}
            >
              {card.metadata?.name?.charAt(0)?.toUpperCase() || "N"}
            </Text>
            <div
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white"
              style={{ backgroundColor: APP_THEME.secondaryColor }}
            ></div>
          </div>
          {/* Name & Title */}
          <div className="flex-1 text-center md:text-left">
            <Title level={2}>{card.metadata?.name || "No Name"}</Title>
            <div className="mt-1 flex flex-wrap gap-2 justify-center md:justify-start">
              <Text type="secondary">
                {card.metadata?.title || tenant?.name}
              </Text>
              {tenant?.type && (
                <Tag color={APP_THEME.secondaryColor}>{tenant.type}</Tag>
              )}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-gray-600">
              <FaIdCard />
              <Text code>ID: {card.tagId}</Text>
            </div>
          </div>
        </div>

        <Divider />

        {/* Metadata Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {card.metadata &&
            Object.entries(card.metadata).map(([key, value]) => {
              if (
                !value ||
                key === "name" ||
                key === "title" ||
                key === "custom"
              )
                return null;
              const { icon: Icon, color } = getFieldIcon(key);
              const label = formatFieldName(key);
              const isLink = isUrl(value);

              return (
                <Card
                  key={key}
                  size="small"
                  className="flex items-center gap-3 shadow-sm hover:shadow-md transition-all"
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: hexToRgba(color, 0.12),
                      color,
                    }}
                  >
                    <Icon />
                  </div>
                  <div className="flex-1">
                    <Text type="secondary" className="text-xs">
                      {label} :
                    </Text>
                    {isLink ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-semibold app-theme-link hover:underline wrap-break-words"
                      >
                        {value}
                      </a>
                    ) : (
                      <Text strong>{value}</Text>
                    )}
                  </div>
                </Card>
              );
            })}
        </div>

        {/* Business URL */}
        {card.businessUrl && (
          <div className="mt-6">
            <Title level={4}>Quick Link</Title>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Text code className="break-all">
                {card.businessUrl}
              </Text>
              <Button
                icon={<FaCopy />}
                onClick={() => copyToClipboard(card.businessUrl)}
              >
                Copy Link
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default CardView;
