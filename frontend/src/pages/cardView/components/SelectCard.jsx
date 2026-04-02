import { Button, Card, message, Avatar } from "antd";
import { CopyOutlined, UserOutlined } from "@ant-design/icons";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

const resolveImg = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
};

// Keys that are never shown on the card face (internal / design settings)
const INTERNAL_KEYS = new Set([
  "name",
  "title",
  "custom",
  "shortCode",
  "createdBy",
  "section",
  "_design",
  "__templateId",
]);

// Metadata keys intentionally hidden from card body in all designs.
const HIDDEN_DISPLAY_FIELDS = new Set(["photo"]);

const FIELD_LABELS = {
  // common
  email: "Email",
  phone: "Phone",
  address: "Address",
  // school
  studentId: "Roll No",
  grade: "Class",
  section: "Section",
  house: "House",
  guardianName: "Guardian",
  guardianPhone: "Guardian Phone",
  // hospital
  employeeId: "Employee ID",
  department: "Department",
  specialization: "Specialization",
  licenseNumber: "License No",
  emergencyContact: "Emergency Contact",
  // business
  company: "Company",
  position: "Position",
  linkedIn: "LinkedIn",
  website: "Website",
};

/**
 * Build display rows from a card's metadata.
 *
 * When `templateFields` is supplied (array of {key, label, order}), rows are
 * returned in template order using only the keys defined in the template.
 * Otherwise every non-internal, non-empty metadata entry is returned.
 */
const getDisplayRows = (card, templateFields) => {
  if (!card?.metadata) return [];

  if (templateFields && templateFields.length > 0) {
    return templateFields
      .filter((f) => !INTERNAL_KEYS.has(f.key))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((f) => [f.key, card.metadata[f.key], f.label])
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      );
  }

  return Object.entries(card.metadata)
    .filter(([key, value]) => value && !INTERNAL_KEYS.has(key))
    .map(([key, value]) => [key, value, null]); // label will be resolved by formatFieldName
};

export const formatFieldLabel = (key) =>
  FIELD_LABELS[key] ||
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

/**
 * Resolve the display name and subtitle for the card header.
 * When a template is present, the first non-internal field of type "text"
 * is treated as the name, and the second (or a field named "title"/"position"/"designation")
 * as the subtitle.  Falls back to metadata.name / metadata.title.
 */
const resolveNameAndTitle = (card, templateFields) => {
  const rawName = card.metadata?.name || "";
  const rawTitle = card.metadata?.title || card.metadata?.position || "";

  if (!templateFields || templateFields.length === 0)
    return { name: rawName, title: rawTitle };

  // Look for a template field whose key is "name" / "fullName" / "fullname"
  const nameField = templateFields.find((f) =>
    /^(name|fullname|fullName|studentName|employeeName)$/i.test(f.key),
  );
  // Look for a field whose key is "title" / "position" / "designation" / "jobTitle"
  const titleField = templateFields.find((f) =>
    /^(title|position|designation|jobTitle|role|grade|class)$/i.test(f.key),
  );

  const resolvedName =
    (nameField ? card.metadata[nameField.key] : rawName) || rawName;
  const resolvedTitle =
    (titleField ? card.metadata[titleField.key] : rawTitle) || rawTitle;

  return { name: resolvedName, title: resolvedTitle };
};

const copyToClipboard = async (text) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    message.success("Copied!");
  } catch {
    message.error("Unable to copy");
  }
};

const toDisplayValue = (value) => {
  if (typeof value !== "string") return value;

  const parts = value.split(".");
  const ext = parts[parts.length - 1]?.toLowerCase();
  const imageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

  if (imageExtensions.has(ext)) {
    return parts.slice(0, -1).join(".");
  }

  return value;
};

const DARK_TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const DARK_TEXT_SECONDARY = "rgba(255, 255, 255, 0.78)";
const DARK_TEXT_MUTED = "rgba(255, 255, 255, 0.68)";
const DARK_SURFACE_BASE = "#111827";
const DARK_SURFACE_ELEVATED = "#1f2937";
const DARK_BORDER_SOFT = "rgba(255, 255, 255, 0.2)";

function CardDesignOne({
  card,
  tenant,
  formatFieldName,
  theme,
  templateFields,
}) {
  const displayRows = getDisplayRows(card, templateFields)
    .filter(([key]) => !HIDDEN_DISPLAY_FIELDS.has(key))
    .map(([key, value, tplLabel]) => [key, toDisplayValue(value), tplLabel]);
  const { name: displayName, title: displayTitle } = resolveNameAndTitle(
    card,
    templateFields,
  );

  const {
    primaryColor,
    secondaryColor,
    accentColor,
    surfaceColor,
    isDark,
    hexToRgba,
  } = theme;
  const bodyTextColor = isDark ? DARK_TEXT_PRIMARY : "#1f2937";
  const mutedTextColor = isDark ? DARK_TEXT_SECONDARY : "#666";
  const labelColor = isDark ? DARK_TEXT_MUTED : "#888";
  const cardSurfaceColor = isDark ? DARK_SURFACE_BASE : surfaceColor;
  const valueColor = isDark ? DARK_TEXT_PRIMARY : primaryColor;

  return (
    <Card
      style={{
        width: "min(340px, 100%)",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        background: cardSurfaceColor,
        border: isDark ? `1px solid ${DARK_BORDER_SOFT}` : undefined,
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* 🔷 Top Right Diagonal */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "100%",
          height: "130px",
          background: primaryColor,
          clipPath: "polygon(40% 0, 100% 0, 100% 100%, 70% 100%)",
        }}
      />

      {/* 🔶 Bottom Left Diagonal */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "130px",
          background: secondaryColor,
          clipPath: "polygon(0 0, 30% 0, 60% 100%, 0% 100%)",
        }}
      />

      {/* 🏢 Company Section with Logo */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "flex",
          alignItems: "flex-start", // ✅ FIXED
          gap: 6,
          color: "#fff",
        }}
      >
        <Avatar
          size={20}
          icon={<UserOutlined />}
          src={resolveImg(tenant?.logoUrl)}
          style={{ background: "#fff" }}
        />
        <div style={{ textAlign: "right", lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: "bold" }}>
            {tenant?.name || "Company"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>{tenant?.type}</div>
        </div>
      </div>

      {/* 📦 Content */}
      <div style={{ padding: "20px", position: "relative" }}>
        {/* 👤 BIGGER Avatar */}
        <div
          style={{
            width: 100, // 🔥 increased
            height: 100, // 🔥 increased
            borderRadius: "50%",
            overflow: "hidden",
            margin: "20px auto",
            border: isDark
              ? `3px solid ${DARK_BORDER_SOFT}`
              : "4px solid white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {card.profileImageUrl ? (
            <img
              src={resolveImg(card.profileImageUrl)}
              alt="profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: hexToRgba(primaryColor, 0.3),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: "bold",
                color: "#fff",
              }}
            >
              {displayName?.charAt(0)?.toUpperCase() || "N"}
            </div>
          )}
        </div>

        {/* 🧑 Name */}
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <h3 style={{ marginBottom: 0 }}>
            <span style={{ color: primaryColor }}>
              {displayName?.split(" ")[0] || "Name"}
            </span>{" "}
            <span style={{ color: secondaryColor }}>
              {displayName?.split(" ")[1] || ""}
            </span>
          </h3>

          <p style={{ fontSize: 12, color: mutedTextColor, margin: 0 }}>
            {displayTitle || "Member"}
          </p>
        </div>

        {/* 📋 Data */}
        <div style={{ marginTop: 12, fontSize: 12 }}>
          {/* ID */}
          {/* <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: labelColor }}>ID</span>
            <strong style={{ color: accentColor }}>{card.tagId}</strong>
          </div> */}
          {/* Dynamic Rows */}
          {displayRows.map(([key, value, tplLabel]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <span style={{ color: labelColor }}>
                {tplLabel || formatFieldName(key)}
              </span>
              <strong style={{ color: valueColor }}>{value}</strong>
            </div>
          ))}
        </div>

        {/* 🌐 Business URL + COPY BUTTON ✅
        {card.businessUrl && (
          <div
            style={{
              marginTop: 10,
              padding: "6px 10px",
              borderRadius: 20,
              background: hexToRgba(accentColor, 0.1),
              border: isDark
                ? `1px solid ${hexToRgba(accentColor, 0.35)}`
                : undefined,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 10,
              gap: 6,
            }}
          >
            <span
              style={{
                color: accentColor,
                fontWeight: "bold",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 180,
              }}
            >
              {card.businessUrl}
            </span>

            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(card.businessUrl)}
            />
          </div>
        )} */}

        {/* <div style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, marginTop: 4, color: bodyTextColor }}>
            {tenant?.website || "www.company.com"}
          </div>
        </div> */}
      </div>
    </Card>
  );
}

function CardDesignTwo({
  card,
  tenant,
  formatFieldName,
  theme,
  templateFields,
}) {
  const displayRows = getDisplayRows(card, templateFields)
    .filter(([key]) => !HIDDEN_DISPLAY_FIELDS.has(key))
    .map(([key, value, tplLabel]) => [key, toDisplayValue(value), tplLabel]);
  const { name: displayName, title: displayTitle } = resolveNameAndTitle(
    card,
    templateFields,
  );

  const { primaryColor, secondaryColor, surfaceColor, isDark, hexToRgba } =
    theme;
  const bodyTextColor = isDark ? DARK_TEXT_PRIMARY : "#1f2937";
  const mutedTextColor = isDark ? DARK_TEXT_SECONDARY : "#888";
  const labelColor = isDark ? DARK_TEXT_MUTED : "#777";
  const cardSurfaceColor = isDark ? DARK_SURFACE_BASE : surfaceColor;
  const valueColor = isDark ? DARK_TEXT_PRIMARY : primaryColor;

  return (
    <Card
      style={{
        width: "min(340px, 100%)",
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
        background: cardSurfaceColor,
        border: isDark ? `1px solid ${DARK_BORDER_SOFT}` : undefined,
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* 🔺 TOP MULTI COLOR WAVE */}
      <div style={{ position: "relative" }}>
        {/* Dark Top */}
        <div
          style={{
            background: hexToRgba(primaryColor, 0.95),
            padding: "10px 16px",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            <Avatar
              size={22}
              icon={<UserOutlined />}
              src={resolveImg(tenant?.logoUrl)}
            />
            <div>
              <div style={{ fontSize: 12, fontWeight: "bold" }}>
                {tenant?.name || "Company Name"}
              </div>
              <div style={{ fontSize: 9, opacity: 0.7 }}>
                {tenant?.type || "Slogan here"}
              </div>
            </div>
          </div>
        </div>

        {/* Red Wave */}
        <svg
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          <path
            d="M0,40 C150,80 350,0 500,40 L500,0 L0,0 Z"
            style={{ fill: primaryColor }}
          />
        </svg>

        {/* Second Wave Layer */}
        <svg
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          style={{ marginTop: -40 }}
        >
          <path
            d="M0,50 C150,10 350,90 500,50 L500,0 L0,0 Z"
            style={{ fill: secondaryColor, opacity: 0.7 }}
          />
        </svg>
      </div>

      {/* 👤 Avatar */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            overflow: "hidden",
            margin: "0 auto",
            border: `4px solid ${primaryColor}`,
            background: isDark ? DARK_SURFACE_ELEVATED : "#fff",
          }}
        >
          {card.profileImageUrl ? (
            <img
              src={resolveImg(card.profileImageUrl)}
              alt="profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: "bold",
                background: hexToRgba(primaryColor, 0.3),
                color: "#fff",
              }}
            >
              {displayName?.charAt(0)?.toUpperCase() || "N"}
            </div>
          )}
        </div>
      </div>

      {/* 📦 CONTENT */}
      <div style={{ padding: "16px" }}>
        {/* Name */}
        <div style={{ textAlign: "center" }}>
          <h3
            style={{
              marginBottom: 0,
              color: isDark ? DARK_TEXT_PRIMARY : primaryColor,
            }}
          >
            {displayName || "Your Name"}
          </h3>
          <p style={{ fontSize: 12, color: mutedTextColor, margin: 0 }}>
            {displayTitle || "Designation"}
          </p>
        </div>

        {/* ID */}
        {/* <div style={{ textAlign: "center", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: bodyTextColor }}>
            ID No: <strong>{card.tagId}</strong>
          </span>
        </div> */}

        {/* 📋 Dynamic Fields */}
        <div style={{ marginTop: 10, fontSize: 12 }}>
          {displayRows.map(([key, value, tplLabel]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                borderBottom: `1px dashed ${hexToRgba(primaryColor, 0.2)}`,
                paddingBottom: 2,
              }}
            >
              <span style={{ color: labelColor }}>
                {tplLabel || formatFieldName(key)}
              </span>
              <strong style={{ color: valueColor }}>{value}</strong>
            </div>
          ))}
        </div>

        {/* 🌐 URL + COPY */}
        {/* {card.businessUrl && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: hexToRgba(primaryColor, 0.1),
              border: isDark
                ? `1px solid ${hexToRgba(primaryColor, 0.35)}`
                : undefined,
              padding: "6px 10px",
              borderRadius: 20,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: isDark ? DARK_TEXT_PRIMARY : primaryColor,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                maxWidth: 180,
              }}
            >
              {card.businessUrl}
            </span>

            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(card.businessUrl)}
            />
          </div>
        )} */}
      </div>

      {/* <svg viewBox="0 0 500 80" preserveAspectRatio="none">
        <path
          d="M0,40 C150,0 350,80 500,40 L500,80 L0,80 Z"
          style={{ fill: primaryColor }}
        />
      </svg> */}
    </Card>
  );
}

function CardDesignThree({
  card,
  tenant,
  formatFieldName,
  theme,
  templateFields,
}) {
  const displayRows = getDisplayRows(card, templateFields)
    .filter(([key]) => !HIDDEN_DISPLAY_FIELDS.has(key))
    .map(([key, value, tplLabel]) => [key, toDisplayValue(value), tplLabel]);
  const { name: displayName, title: displayTitle } = resolveNameAndTitle(
    card,
    templateFields,
  );

  const {
    primaryColor,
    secondaryColor,
    accentColor,
    surfaceColor,
    isDark,
    hexToRgba,
  } = theme;
  const bodyTextColor = isDark ? DARK_TEXT_PRIMARY : "#1f2937";
  const mutedTextColor = isDark ? DARK_TEXT_SECONDARY : "#888";
  const cardSurfaceColor = isDark ? DARK_SURFACE_BASE : surfaceColor;

  return (
    <Card
      style={{
        width: "min(340px, 100%)",
        borderRadius: "18px",
        overflow: "hidden",
        position: "relative",
        background: cardSurfaceColor,
        border: isDark ? `1px solid ${DARK_BORDER_SOFT}` : undefined,
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* 🔵 Top with Company Logo */}
      <div
        style={{
          height: 80, // increased height for header
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          borderBottomLeftRadius: "100% 45%",
          borderBottomRightRadius: "100% 45%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          color: "#fff",
        }}
      >
        <Avatar size={28} src={resolveImg(tenant?.logoUrl)} />
        <div>
          <div style={{ fontSize: 12, fontWeight: "bold" }}>
            {tenant?.name || "Company Name"}
          </div>
          <div style={{ fontSize: 9, opacity: 0.8 }}>
            {tenant?.type || "Slogan"}
          </div>
        </div>
      </div>

      {/* 🟣 Profile Image (downward) */}
      <div
        style={{
          position: "absolute",
          top: 90, // moved image below header
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: 80, // increased image size
            height: 80,
            borderRadius: "50%",
            overflow: "hidden",
            border: `3px solid ${accentColor}`,
            background: isDark ? DARK_SURFACE_ELEVATED : "#fff",
          }}
        >
          {card.profileImageUrl ? (
            <img
              src={resolveImg(card.profileImageUrl)}
              alt="profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: "bold",
                background: hexToRgba(primaryColor, 0.3),
                color: "#fff",
              }}
            >
              {card?.metadata?.name?.charAt(0)?.toUpperCase() ||
                displayName?.charAt(0)?.toUpperCase() ||
                "U"}
            </div>
          )}
        </div>
      </div>

      {/* ⚪ Content */}
      <div style={{ marginTop: 80, padding: "14px" }}>
        {/* Name */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            style={{ fontWeight: "bold", fontSize: 14, color: bodyTextColor }}
          >
            {displayName || "Your Name"}
          </div>
          <div style={{ fontSize: 10, color: mutedTextColor }}>
            {displayTitle || "Job Position"}
          </div>
        </div>

        {/* ID */}
        {/* <div style={{ textAlign: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 9, color: mutedTextColor }}>ID: </span>
          <span
            style={{ fontSize: 11, fontWeight: "bold", color: accentColor }}
          >
            {card.tagId}
          </span>
        </div> */}

        {/* Simple Fields */}
        <div style={{ fontSize: 11, lineHeight: "18px" }}>
          {displayRows.map(([key, value, tplLabel]) => (
            <div key={key}>
              <span style={{ color: accentColor, fontWeight: 500 }}>
                {tplLabel || formatFieldName(key)}:
              </span>{" "}
              <span style={{ color: bodyTextColor }}>{value}</span>
            </div>
          ))}
        </div>

        {/* URL */}
        {/* {card.businessUrl && (
          <div style={{ marginTop: 8, fontSize: 10, color: bodyTextColor }}>
            <span style={{ color: accentColor }}>Link: </span>
            <span>{card.businessUrl}</span>
            <Button
              size="small"
              type="text"
              onClick={() => copyToClipboard(card.businessUrl)}
              style={{
                fontSize: 10,
                color: isDark ? DARK_TEXT_PRIMARY : undefined,
              }}
            >
              Copy
            </Button>
          </div>
        )} */}
      </div>

      {/* 🔵 Bottom */}
      <div
        style={{
          height: 50,
          background: secondaryColor,
          borderTopLeftRadius: "100% 45%",
          borderTopRightRadius: "100% 45%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 8,
          color: "#fff",
          fontSize: 10,
        }}
      >
        {tenant?.name || "Your Brand"}
      </div>
    </Card>
  );
}
const CARD_DESIGNS = {
  one: CardDesignOne,
  two: CardDesignTwo,
  three: CardDesignThree,
};

function SelectCard({
  design = "one",
  card,
  tenant,
  formatFieldName,
  theme,
  templateFields,
}) {
  const SelectedDesign = CARD_DESIGNS[design] || CARD_DESIGNS.one;

  return (
    <div className="flex w-full items-center justify-center">
      <SelectedDesign
        card={card}
        tenant={tenant}
        formatFieldName={formatFieldName}
        theme={theme}
        templateFields={templateFields}
      />
    </div>
  );
}

export default SelectCard;
