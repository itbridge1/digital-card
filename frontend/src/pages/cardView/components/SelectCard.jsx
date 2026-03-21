import { Button, Card, Divider, Typography, message } from "antd";
import { FaCopy } from "react-icons/fa";

const { Title, Text } = Typography;

const getDisplayRows = (card) => {
  if (!card?.metadata) {
    return [];
  }

  return Object.entries(card.metadata).filter(([key, value]) => {
    if (!value) {
      return false;
    }

    return key !== "name" && key !== "title" && key !== "custom";
  });
};

const copyToClipboard = async (text) => {
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    message.success("Copied!");
  } catch {
    message.error("Unable to copy");
  }
};

const DARK_TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const DARK_TEXT_SECONDARY = "rgba(255, 255, 255, 0.78)";
const DARK_TEXT_MUTED = "rgba(255, 255, 255, 0.68)";

function CardDesignOne({ card, tenant, formatFieldName, theme }) {
  const displayRows = getDisplayRows(card);
  const {
    primaryColor,
    secondaryColor,
    accentColor,
    surfaceColor,
    isDark,
    hexToRgba,
  } = theme;

  return (
    <Card
      className="overflow-hidden"
      style={{ 
        width: 340, 
        background: isDark ? "#1f1f1f" : "white",
        borderRadius: '24px',
        position: 'relative',
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Curved Header Background */}
      <div
        className="relative overflow-hidden"
        style={{
          background: primaryColor,
          borderRadius: '0 0 40px 40px',
          position: 'relative',
        }}
      >
        <div className="py-3 text-center text-white relative z-10">
          <Text strong className="text-xs text-white">
            {tenant?.name || "Organization"}
          </Text>
          <div className="text-[8px] opacity-80">{tenant?.type}</div>
        </div>
        {/* Decorative curved shape */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-8"
          style={{
            background: isDark ? "#1f1f1f" : "white",
            borderRadius: '40px 40px 0 0',
          }}
        />
      </div>

      <div className="mt-2 flex flex-col items-center px-4">
        {/* Larger Avatar Container */}
        <div
          className="flex h-28 w-28 items-center justify-center text-3xl font-bold shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
            color: 'white',
            borderRadius: '28px',
            transform: 'rotate(45deg)',
          }}
        >
          <span style={{ transform: 'rotate(-45deg)', fontSize: '32px' }}>
            {card.metadata?.name?.charAt(0)?.toUpperCase() || "N"}
          </span>
        </div>

        {/* Curved Name Background */}
        <div 
          className="mt-2 px-4 py-0.5 rounded-full"
          style={{
            background: hexToRgba(secondaryColor, 0.15),
            borderRadius: '30px',
          }}
        >
          <Title
            level={5}
            className={`mb-0 text-center ${isDark ? "text-white" : ""}`}
            style={{ color: isDark ? DARK_TEXT_PRIMARY : primaryColor, fontSize: '12px', marginBottom: 0 }}
          >
            {card.metadata?.name || "No Name"}
          </Title>
        </div>

        <Text
          type={isDark ? undefined : "secondary"}
          className="text-[8px] mt-0.5"
          style={{ color: isDark ? DARK_TEXT_SECONDARY : undefined }}
        >
          {card.metadata?.title || "Member"}
        </Text>
      </div>

      {/* Curved Divider */}
      <div className="relative my-2 px-4">
        <div className="border-t border-dashed" style={{ borderColor: hexToRgba(primaryColor, 0.3) }} />
        <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 px-2 rounded-full" style={{ background: isDark ? "#1f1f1f" : "white" }}>
          <Text className="text-[6px]" style={{ color: primaryColor }}>✦</Text>
        </div>
      </div>

      {/* Curved Content Container */}
      <div className="mx-3 mb-3 rounded-2xl overflow-hidden" style={{
        background: hexToRgba(primaryColor, 0.05),
        borderRadius: '20px',
      }}>
        <div className="p-2 space-y-1">
          {/* ID with curved background */}
          <div
            className="flex justify-between rounded-xl p-1.5"
            style={{
              background: hexToRgba(primaryColor, 0.1),
              borderRadius: '16px',
            }}
          >
            <Text
              strong
              className={isDark ? "text-gray-300" : ""}
              style={{ color: isDark ? DARK_TEXT_SECONDARY : primaryColor, fontSize: '9px' }}
            >
              ID
            </Text>
            <Text
              className={isDark ? "text-gray-300" : ""}
              style={{
                color: isDark ? DARK_TEXT_PRIMARY : accentColor,
                fontWeight: "bold",
                fontSize: '9px',
              }}
            >
              {card.tagId}
            </Text>
          </div>

          {displayRows.map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between gap-3 rounded-xl p-1.5 transition-all hover:scale-[1.02]"
              style={{
                background: hexToRgba(secondaryColor, 0.08),
                borderRadius: '16px',
              }}
            >
              <Text
                type={isDark ? undefined : "secondary"}
                style={{ color: isDark ? DARK_TEXT_SECONDARY : undefined, fontSize: '8px' }}
              >
                {formatFieldName(key)}
              </Text>
              <Text
                strong
                className={`truncate text-right ${isDark ? "text-white" : ""}`}
                style={{
                  maxWidth: 150,
                  color: isDark ? DARK_TEXT_PRIMARY : primaryColor,
                  fontSize: '8px',
                }}
              >
                {value}
              </Text>
            </div>
          ))}
        </div>
      </div>

      {card.businessUrl && (
        <div className="px-4 pb-3">
          <div
            className="flex items-center justify-between gap-2 rounded-2xl p-1.5"
            style={{
              background: hexToRgba(accentColor, 0.1),
              borderRadius: '30px',
            }}
          >
            <Text
              className={`truncate ${isDark ? "text-gray-400" : ""}`}
              style={{
                color: isDark ? DARK_TEXT_MUTED : accentColor,
                fontWeight: "bold",
                fontSize: '7px',
              }}
            >
              {card.businessUrl}
            </Text>
            <Button
              size="small"
              icon={<FaCopy style={{ fontSize: '8px' }} />}
              onClick={() => copyToClipboard(card.businessUrl)}
              style={{ color: accentColor }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function CardDesignTwo({ card, tenant, formatFieldName, theme }) {
  const displayRows = getDisplayRows(card);
  const {
    primaryColor,
    secondaryColor,
    accentColor,
    surfaceColor,
    isDark,
    hexToRgba,
  } = theme;

  return (
    <Card
      className="overflow-hidden"
      style={{ 
        width: 340, 
        background: isDark ? "#1f1f1f" : "white",
        borderRadius: '32px',
        position: 'relative',
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Curved Header with Bottom Wave */}
      <div
        className="relative"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          borderRadius: '0 0 50% 50% / 0 0 30px 30px',
          overflow: 'hidden',
        }}
      >
        <div className="py-2 px-4">
          <Text strong className="text-xs text-white">
            {tenant?.name || "Organization"}
          </Text>
          <div className="text-[7px] opacity-90">{tenant?.type}</div>
        </div>
        {/* Wave decoration */}
        <svg className="absolute bottom-0 left-0 w-full h-5" preserveAspectRatio="none" viewBox="0 0 1440 120">
          <path fill={isDark ? "#1f1f1f" : "white"} fillOpacity="1" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" />
        </svg>
      </div>

      {/* Larger Circular Avatar with Curved Background */}
      <div className="relative flex justify-center mt-1">
        <div 
          className="absolute -top-12 w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, ${secondaryColor}, ${primaryColor})`,
            boxShadow: `0 0 0 3px ${isDark ? "#1f1f1f" : "white"}, 0 0 0 6px ${hexToRgba(secondaryColor, 0.3)}`,
          }}
        >
          <span className="text-3xl font-bold text-white">
            {card.metadata?.name?.charAt(0)?.toUpperCase() || "N"}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="mt-14 px-4 pb-3">
        {/* Curved Name Badge */}
        <div className="text-center mb-2">
          <div 
            className="inline-block px-4 py-0.5 rounded-full"
            style={{
              background: hexToRgba(primaryColor, 0.1),
              borderRadius: '40px',
            }}
          >
            <Title
              level={5}
              className={`mb-0 ${isDark ? "text-white" : ""}`}
              style={{ color: isDark ? DARK_TEXT_PRIMARY : primaryColor, fontSize: '11px', marginBottom: 0 }}
            >
              {card.metadata?.name || "No Name"}
            </Title>
          </div>
          <Text
            type={isDark ? undefined : "secondary"}
            className="text-[7px] block mt-0.5"
            style={{ color: isDark ? DARK_TEXT_SECONDARY : undefined }}
          >
            {card.metadata?.title || "Member"}
          </Text>
        </div>

        {/* Curved ID Badge */}
        <div className="flex justify-center mb-3">
          <div
            className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[8px]"
            style={{
              background: hexToRgba(accentColor, 0.15),
              color: accentColor,
              borderRadius: '30px',
              border: `1px solid ${hexToRgba(accentColor, 0.3)}`,
            }}
          >
            <span className="font-medium">ID:</span>
            <span className="font-mono font-bold">{card.tagId}</span>
          </div>
        </div>

        {/* Curved Cards Container */}
        <div className="space-y-1.5">
          {displayRows.map(([key, value]) => (
            <div
              key={key}
              className="group flex items-center rounded-2xl p-1.5 transition-all hover:translate-x-1"
              style={{
                background: hexToRgba(secondaryColor, 0.08),
                borderRadius: '20px',
                borderLeft: `2px solid ${accentColor}`,
              }}
            >
              <Text
                type={isDark ? undefined : "secondary"}
                className="text-[8px]"
                style={{
                  minWidth: 85,
                  color: isDark ? DARK_TEXT_SECONDARY : undefined,
                  fontSize: '8px'
                }}
              >
                {formatFieldName(key)}
              </Text>
              <div className="flex-1 text-right">
                <Text
                  className={`font-medium ${isDark ? "text-gray-300" : "text-gray-800"}`}
                  style={{ color: isDark ? DARK_TEXT_PRIMARY : primaryColor, fontSize: '8px' }}
                >
                  {value}
                </Text>
              </div>
            </div>
          ))}
        </div>

        {/* Curved URL Container */}
        {card.businessUrl && (
          <div className="mt-3">
            <div
              className="flex items-center justify-between rounded-2xl p-1.5"
              style={{
                background: hexToRgba(secondaryColor, 0.1),
                borderRadius: '40px',
              }}
            >
              <div className="flex items-center gap-1 overflow-hidden flex-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: hexToRgba(secondaryColor, 0.2) }}>
                  <FaCopy className="text-[7px]" style={{ color: secondaryColor }} />
                </div>
                <Text
                  className={`truncate ${isDark ? "text-gray-400" : ""}`}
                  style={{ color: isDark ? DARK_TEXT_MUTED : undefined, fontSize: '7px' }}
                >
                  {card.businessUrl}
                </Text>
              </div>
              <Button
                size="small"
                type="text"
                icon={<FaCopy style={{ fontSize: '7px' }} />}
                onClick={() => copyToClipboard(card.businessUrl)}
                className="opacity-0 group-hover:opacity-100"
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function CardDesignThree({ card, tenant, formatFieldName, theme }) {
  const displayRows = getDisplayRows(card);
  const {
    primaryColor,
    secondaryColor,
    accentColor,
    surfaceColor,
    isDark,
    hexToRgba,
  } = theme;

  return (
    <Card
      className="overflow-hidden"
      style={{ 
        width: 340, 
        background: isDark ? "#1f1f1f" : "white",
        borderRadius: '28px',
        position: 'relative',
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Curved Top Section with Diagonal Blend */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            clipPath: "ellipse(100% 80% at 50% 0%)",
          }}
        />
        <div className="relative p-3 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <Text className="text-[7px] text-white/80 block">ORGANIZATION</Text>
              <Text strong className="text-xs text-white block">
                {tenant?.name || "Company"}
              </Text>
            </div>
            <div className="text-right">
              <Text className="text-[7px] text-white/80 block">TYPE</Text>
              <Text className="text-[8px] text-white font-medium">
                {tenant?.type || "Member"}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Main content with Curved Containers */}
      <div className="px-3 pb-3 -mt-3">
        {/* Profile section with larger curved container */}
        <div className="flex items-end gap-3 mb-2">
          <div
            className="h-24 w-24 rounded-2xl shadow-lg flex items-center justify-center text-3xl font-bold text-white"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${secondaryColor}, ${primaryColor})`,
              borderRadius: '24px',
              transform: 'rotate(5deg)',
            }}
          >
            <span style={{ transform: 'rotate(-5deg)', fontSize: '32px' }}>
              {card.metadata?.name?.charAt(0)?.toUpperCase() || "N"}
            </span>
          </div>
          <div className="flex-1">
            <div 
              className="inline-block px-3 py-0.5 rounded-full"
              style={{
                background: hexToRgba(primaryColor, 0.1),
                borderRadius: '30px',
              }}
            >
              <Text
                strong
                className={`text-xs block ${isDark ? "text-white" : ""}`}
                style={{ color: isDark ? DARK_TEXT_PRIMARY : primaryColor }}
              >
                {card.metadata?.name || "No Name"}
              </Text>
            </div>
            <Text
              className={`text-[7px] block mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
              style={{ color: isDark ? DARK_TEXT_SECONDARY : undefined }}
            >
              {card.metadata?.title || "Member"}
            </Text>
          </div>
        </div>

        {/* Curved ID Badge */}
        <div
          className={`mt-2 p-2 rounded-2xl`}
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(accentColor, 0.1)}, ${hexToRgba(primaryColor, 0.05)})`,
            borderRadius: '24px',
            border: `1px solid ${hexToRgba(accentColor, 0.2)}`,
          }}
        >
          <Text
            className={`text-[7px] block ${isDark ? "text-gray-400" : "text-gray-500"}`}
            style={{ color: isDark ? DARK_TEXT_SECONDARY : primaryColor }}
          >
            ID Number
          </Text>
          <div className="flex items-center justify-between mt-0.5">
            <Text
              className="text-xs font-mono font-bold"
              style={{ color: accentColor }}
            >
              {card.tagId}
            </Text>
            <div className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full" style={{ background: accentColor }} />
              ))}
            </div>
          </div>
        </div>

        {/* Two column curved cards */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {displayRows.slice(0, 4).map(([key, value]) => (
            <div
              key={key}
              className="p-1.5 rounded-2xl transition-all hover:scale-105"
              style={{
                background: hexToRgba(secondaryColor, 0.08),
                borderRadius: '20px',
                backdropFilter: 'blur(2px)',
              }}
            >
              <Text
                className={`text-[6px] block uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}
                style={{ color: isDark ? DARK_TEXT_MUTED : undefined }}
              >
                {formatFieldName(key)}
              </Text>
              <Text
                strong
                className={`text-[7px] block truncate mt-0.5 ${isDark ? "text-white" : ""}`}
                style={{ color: isDark ? DARK_TEXT_PRIMARY : primaryColor }}
              >
                {value}
              </Text>
            </div>
          ))}
        </div>

        {/* Additional rows with curved left border */}
        {displayRows.length > 4 && (
          <div className="mt-2 space-y-1">
            {displayRows.slice(4).map(([key, value]) => (
              <div
                key={key}
                className="flex justify-between items-center rounded-2xl p-1.5 transition-all"
                style={{
                  background: hexToRgba(accentColor, 0.05),
                  borderRadius: '18px',
                  borderLeft: `2px solid ${accentColor}`,
                }}
              >
                <Text
                  className={`text-[7px] ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  style={{ color: isDark ? DARK_TEXT_SECONDARY : undefined }}
                >
                  {formatFieldName(key)}
                </Text>
                <Text
                  className={`text-[7px] font-medium ${isDark ? "text-white" : ""}`}
                  style={{ color: isDark ? DARK_TEXT_PRIMARY : primaryColor }}
                >
                  {value}
                </Text>
              </div>
            ))}
          </div>
        )}

        {/* Curved URL section */}
        {card.businessUrl && (
          <div
            className={`mt-2 p-2 rounded-3xl`}
            style={{
              background: hexToRgba(accentColor, 0.08),
              borderRadius: '30px',
            }}
          >
            <Text
              className={`text-[6px] block uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}
              style={{ color: isDark ? DARK_TEXT_MUTED : primaryColor }}
            >
              Digital Link
            </Text>
            <div className="flex items-center justify-between mt-0.5">
              <Text
                className={`text-[7px] truncate flex-1 ${isDark ? "text-gray-300" : ""}`}
                style={{ color: isDark ? DARK_TEXT_SECONDARY : accentColor }}
              >
                {card.businessUrl}
              </Text>
              <Button
                size="small"
                type="text"
                icon={<FaCopy style={{ fontSize: '7px' }} />}
                onClick={() => copyToClipboard(card.businessUrl)}
                className={isDark ? "text-white hover:text-gray-300" : "text-gray-800"}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

const CARD_DESIGNS = {
  one: CardDesignOne,
  two: CardDesignTwo,
  three: CardDesignThree,
};

function SelectCard({ design = "one", card, tenant, formatFieldName, theme }) {
  const SelectedDesign = CARD_DESIGNS[design] || CARD_DESIGNS.one;

  return (
    <div className="flex items-center justify-center">
      <SelectedDesign
        card={card}
        tenant={tenant}
        formatFieldName={formatFieldName}
        theme={theme}
      />
    </div>
  );
}

export default SelectCard;
