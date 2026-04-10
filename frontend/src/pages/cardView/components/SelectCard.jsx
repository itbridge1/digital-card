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
  hiddenFields,
}) {
  const displayRows = getDisplayRows(card, templateFields)
    .filter(([key]) => !HIDDEN_DISPLAY_FIELDS.has(key))
    .filter(([key]) => !hiddenFields?.has(key))
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
    textColor,
    nameTextColor,
    valueTextColor,
    fontFamily,
    isDark,
    hexToRgba,
  } = theme;
  const bodyTextColor = textColor || (isDark ? DARK_TEXT_PRIMARY : "#1f2937");
  const nameColor = nameTextColor || bodyTextColor;
  const mutedTextColor = isDark
    ? DARK_TEXT_SECONDARY
    : hexToRgba(bodyTextColor, 0.78);
  const labelColor = isDark ? DARK_TEXT_MUTED : hexToRgba(bodyTextColor, 0.65);
  const cardSurfaceColor = isDark ? DARK_SURFACE_BASE : surfaceColor;
  const valueColor =
    valueTextColor || (isDark ? DARK_TEXT_PRIMARY : bodyTextColor);
  const layout = theme.layout || {};
  const avatarTop = layout.avatarTop ?? 22;
  const avatarSize = Math.max(72, (layout.avatarSize ?? 116) - 16);
  const nameTop = Math.max(0, (layout.nameTop ?? 14) - 4);
  const contentTop = layout.contentTop ?? 12;
  const contentGap = Math.max(4, Math.round((layout.contentGap ?? 8) * 0.6));
  const baseSidePadding = layout.contentSidePadding ?? 6;
  const contentLeftPadding = layout.contentLeftPadding ?? baseSidePadding;
  const contentRightPadding = layout.contentRightPadding ?? baseSidePadding;

  return (
    <Card
      style={{
        width: "min(340px, 100%)",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        background: cardSurfaceColor,
        fontFamily,
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
          height: "100px",
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
          height: "100px",
          background: secondaryColor,
          clipPath: "polygon(0 0, 30% 0, 60% 100%, 0% 100%)",
        }}
      />

      <div
        style={{
          width: "100%",
          height: 90,
          overflow: "hidden",
          position: "relative",
          zIndex: 1,
        }}
      >
        {resolveImg(tenant?.logoUrl) ? (
          <img
            src={resolveImg(tenant?.logoUrl)}
            alt={tenant?.name || "Top image"}
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
              background: hexToRgba(primaryColor, 0.2),
              color: primaryColor,
            }}
          >
            <UserOutlined style={{ fontSize: 36 }} />
          </div>
        )}
      </div>

      {/* 📦 Content */}
      <div
        style={{
          paddingTop: contentTop + 8,
          paddingBottom: 20,
          paddingLeft: `calc(20px + ${contentLeftPadding}px)`,
          paddingRight: `calc(20px + ${contentRightPadding}px)`,
          position: "relative",
        }}
      >
        {/* 👤 BIGGER Avatar */}
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: "50%",
            overflow: "hidden",
            margin: `${avatarTop}px auto 0`,
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
        <div style={{ textAlign: "center", marginTop: nameTop }}>
          <h3 style={{ marginBottom: 0 }}>
            <span style={{ color: nameColor || primaryColor }}>
              {displayName?.split(" ")[0] || "Name"}
            </span>{" "}
            <span style={{ color: nameColor || secondaryColor }}>
              {displayName?.split(" ")[1] || ""}
            </span>
          </h3>

          <p style={{ fontSize: 12, color: mutedTextColor, margin: 0 }}>
            {displayTitle || "Member"}
          </p>
        </div>

        {/* 📋 Data */}
        <div
          style={{
            marginTop: contentTop,
            fontSize: 12,
            paddingLeft: `clamp(0px, 1.6vw, ${contentLeftPadding}px)`,
            paddingRight: `clamp(0px, 1.6vw, ${contentRightPadding}px)`,
          }}
        >
          {/* ID */}
          {/* <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: labelColor }}>ID</span>
            <strong style={{ color: accentColor }}>{card.tagId}</strong>
          </div> */}
          {/* Dynamic Rows */}
          {displayRows.map(([key, value, tplLabel], idx) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: idx === 0 ? 0 : `clamp(3px, 1.2vw, ${contentGap}px)`,
              }}
            >
              <span style={{ color: labelColor }}>
                {tplLabel || formatFieldName(key)}
              </span>
              <strong style={{ color: valueColor, marginLeft: 6 }}>{value}</strong>
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
  hiddenFields,
}) {
  const displayRows = getDisplayRows(card, templateFields)
    .filter(([key]) => !HIDDEN_DISPLAY_FIELDS.has(key))
    .filter(([key]) => !hiddenFields?.has(key))
    .map(([key, value, tplLabel]) => [key, toDisplayValue(value), tplLabel]);
  const { name: displayName, title: displayTitle } = resolveNameAndTitle(
    card,
    templateFields,
  );

  const {
    primaryColor,
    secondaryColor,
    surfaceColor,
    textColor,
    nameTextColor,
    valueTextColor,
    fontFamily,
    isDark,
    hexToRgba,
  } = theme;
  const bodyTextColor = textColor || (isDark ? DARK_TEXT_PRIMARY : "#1f2937");
  const nameColor = nameTextColor || bodyTextColor;
  const mutedTextColor = isDark
    ? DARK_TEXT_SECONDARY
    : hexToRgba(bodyTextColor, 0.78);
  const labelColor = isDark ? DARK_TEXT_MUTED : hexToRgba(bodyTextColor, 0.65);
  const cardSurfaceColor = isDark ? DARK_SURFACE_BASE : surfaceColor;
  const valueColor =
    valueTextColor || (isDark ? DARK_TEXT_PRIMARY : bodyTextColor);
  const layout = theme.layout || {};
  const avatarTop = Math.max(0, (layout.avatarTop ?? 22) - 22);
  const avatarSize = Math.max(84, (layout.avatarSize ?? 116) + 4);
  const nameTop = Math.max(0, (layout.nameTop ?? 14) - 14);
  const contentTop = Math.max(0, (layout.contentTop ?? 12) - 2);
  const contentGap = Math.max(4, Math.round((layout.contentGap ?? 8) * 0.6));
  const baseSidePadding = layout.contentSidePadding ?? 6;
  const contentLeftPadding = layout.contentLeftPadding ?? baseSidePadding;
  const contentRightPadding = layout.contentRightPadding ?? baseSidePadding;

  return (
    <Card
      style={{
        width: "min(340px, 100%)",
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
        background: cardSurfaceColor,
        fontFamily,
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
            width: "100%",
            height: 90,
            overflow: "hidden",
            color: "#fff",
          }}
        >
          {resolveImg(tenant?.logoUrl) ? (
            <img
              src={resolveImg(tenant?.logoUrl)}
              alt={tenant?.name || "Top image"}
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
                background: hexToRgba(primaryColor, 0.2),
                color: primaryColor,
              }}
            >
              <UserOutlined style={{ fontSize: 36 }} />
            </div>
          )}
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
            width: avatarSize,
            height: avatarSize,
            borderRadius: "50%",
            overflow: "hidden",
            margin: `${avatarTop}px auto 0`,
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
      <div
        style={{
          paddingTop: 16 + contentTop,
          paddingBottom: 16,
          paddingLeft: `calc(16px + ${contentLeftPadding}px)`,
          paddingRight: `calc(16px + ${contentRightPadding}px)`,
        }}
      >
        {/* Name */}
        <div style={{ textAlign: "center", marginTop: nameTop }}>
          <h3
            style={{
              marginBottom: 0,
              color: nameColor || (isDark ? DARK_TEXT_PRIMARY : primaryColor),
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
        <div
          style={{
            marginTop: contentTop,
            fontSize: 12,
            paddingLeft: `clamp(0px, 1.6vw, ${contentLeftPadding}px)`,
            paddingRight: `clamp(0px, 1.6vw, ${contentRightPadding}px)`,
          }}
        >
          {displayRows.map(([key, value, tplLabel]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: `clamp(3px, 1.2vw, ${contentGap}px)`,
                borderBottom: `1px dashed ${hexToRgba(primaryColor, 0.2)}`,
                paddingBottom: 2,
              }}
            >
              <span style={{ color: labelColor }}>
                {tplLabel || formatFieldName(key)}
              </span>
              <strong style={{ color: valueColor, marginLeft: 6 }}>{value}</strong>
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
  hiddenFields,
}) {
  const displayRows = getDisplayRows(card, templateFields)
    .filter(([key]) => !HIDDEN_DISPLAY_FIELDS.has(key))
    .filter(([key]) => !hiddenFields?.has(key))
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
    textColor,
    nameTextColor,
    valueTextColor,
    fontFamily,
    isDark,
    hexToRgba,
  } = theme;
  const bodyTextColor = textColor || (isDark ? DARK_TEXT_PRIMARY : "#1f2937");
  const nameColor = nameTextColor || bodyTextColor;
  const valueColor = valueTextColor || bodyTextColor;
  const mutedTextColor = isDark
    ? DARK_TEXT_SECONDARY
    : hexToRgba(bodyTextColor, 0.78);
  const cardSurfaceColor = isDark ? DARK_SURFACE_BASE : surfaceColor;
  const layout = theme.layout || {};
  const avatarTop = layout.avatarTop ?? 22;
  const avatarSize = Math.max(64, (layout.avatarSize ?? 116) - 36);
  const nameTop = Math.max(0, (layout.nameTop ?? 14) - 14);
  const contentTop = layout.contentTop ?? 12;
  const contentGap = Math.max(4, Math.round((layout.contentGap ?? 8) * 0.6));
  const baseSidePadding = layout.contentSidePadding ?? 6;
  const contentLeftPadding = layout.contentLeftPadding ?? baseSidePadding;
  const contentRightPadding = layout.contentRightPadding ?? baseSidePadding;
  const profileTop = 68 + avatarTop;

  return (
    <Card
      style={{
        width: "min(340px, 100%)",
        borderRadius: "18px",
        overflow: "hidden",
        position: "relative",
        background: cardSurfaceColor,
        fontFamily,
        border: isDark ? `1px solid ${DARK_BORDER_SOFT}` : undefined,
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div
        style={{
          width: "100%",
          height: 80,
          overflow: "hidden",
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          color: "#fff",
        }}
      >
        {resolveImg(tenant?.logoUrl) ? (
          <img
            src={resolveImg(tenant?.logoUrl)}
            alt={tenant?.name || "Top image"}
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
              background: hexToRgba(primaryColor, 0.2),
              color: primaryColor,
            }}
          >
            <UserOutlined style={{ fontSize: 36 }} />
          </div>
        )}
      </div>
      <div
        style={{
          width: "100%",
          height: 8,
          background: primaryColor,
        }}
      />

      {/* 🟣 Profile Image (downward) */}
      <div
        style={{
          position: "absolute",
          top: profileTop,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
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
      <div
        style={{
          marginTop: avatarSize + contentTop,
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: `calc(14px + ${contentLeftPadding}px)`,
          paddingRight: `calc(14px + ${contentRightPadding}px)`,
        }}
      >
        {/* Name */}
        <div style={{ textAlign: "center", marginBottom: 8, marginTop: nameTop }}>
          <div style={{ fontWeight: "bold", fontSize: 14, color: nameColor }}>
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
        <div
          style={{
            fontSize: 11,
            lineHeight: "18px",
            paddingLeft: `clamp(0px, 1.6vw, ${contentLeftPadding}px)`,
            paddingRight: `clamp(0px, 1.6vw, ${contentRightPadding}px)`,
            display: "flex",
            flexDirection: "column",
            gap: `clamp(3px, 1.2vw, ${contentGap}px)`,
          }}
        >
          {displayRows.map(([key, value, tplLabel]) => (
            <div key={key}>
              <span style={{ color: accentColor, fontWeight: 500 }}>
                {tplLabel || formatFieldName(key)}:
              </span>{" "}
              <span style={{ color: valueColor, marginLeft: 4 }}>{value}</span>
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

function CardDesignFour({
  card,
  tenant,
  formatFieldName,
  theme,
  templateFields,
  hiddenFields,
}) {
  const displayRows = getDisplayRows(card, templateFields)
    .filter(([key]) => !HIDDEN_DISPLAY_FIELDS.has(key))
    .filter(([key]) => !hiddenFields?.has(key))
    .map(([key, value, tplLabel]) => [key, toDisplayValue(value), tplLabel]);
  const { name: displayName } = resolveNameAndTitle(card, templateFields);

  const {
    primaryColor,
    secondaryColor,
    textColor,
    nameTextColor,
    valueTextColor,
    surfaceColor,
    fontFamily,
    isDark,
    hexToRgba,
  } = theme;

  const labelColor = primaryColor;
  const fallbackText = textColor || "#111";
  const nameColor = nameTextColor || fallbackText;
  const valueColor = valueTextColor || fallbackText;
  const cardSurfaceColor = isDark ? DARK_SURFACE_BASE : surfaceColor;
  const layout = theme.layout || {};
  const avatarTop = Math.max(0, (layout.avatarTop ?? 22) - 10);
  const avatarSize = Math.max(100, (layout.avatarSize ?? 116) + 24);
  const nameTop = Math.max(0, (layout.nameTop ?? 14) - 14);
  const contentTop = Math.max(0, (layout.contentTop ?? 12) - 4);
  const contentGap = Math.max(4, Math.round((layout.contentGap ?? 8) * 0.75));
  const baseSidePadding = layout.contentSidePadding ?? 6;
  const contentLeftPadding = layout.contentLeftPadding ?? baseSidePadding;
  const contentRightPadding = layout.contentRightPadding ?? baseSidePadding;

  return (
    <Card
      style={{
        width: "min(340px, 100%)",
        borderRadius: 16,
        overflow: "hidden",
        background: cardSurfaceColor,
        fontFamily,
        border: isDark ? `1px solid ${DARK_BORDER_SOFT}` : undefined,
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* 🔷 TOP HEADER */}
      <div
        style={{
          background: hexToRgba(primaryColor, 0.95),
          width: "100%",
          height: 90,
          overflow: "hidden",
          color: "#fff",
        }}
      >
        {resolveImg(tenant?.logoUrl) ? (
          <img
            src={resolveImg(tenant?.logoUrl)}
            alt={tenant?.name || "Top image"}
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
              background: hexToRgba(primaryColor, 0.2),
              color: primaryColor,
            }}
          >
            <UserOutlined style={{ fontSize: 36 }} />
          </div>
        )}
      </div>

      {/* Accent strip below top image */}
      <div
        style={{
          height: 8,
          background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
        }}
      />

      {/* 📦 CONTENT */}
      <div
        className="text-center"
        style={{
          paddingTop: 20 + contentTop,
          paddingBottom: 16,
          paddingLeft: `calc(20px + ${contentLeftPadding}px)`,
          paddingRight: `calc(20px + ${contentRightPadding}px)`,
        }}
      >
        {/* 👤 Avatar */}
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: "50%",
            overflow: "hidden",
            margin: `${avatarTop}px auto 10px auto`,
            border: isDark
              ? `5px solid ${DARK_SURFACE_ELEVATED}`
              : "5px solid white",
            boxShadow: "0 6px 15px rgba(0,0,0,0.25)",
            background: "#eee",
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
                fontSize: 40,
                fontWeight: "bold",
                color: "#fff",
                background: hexToRgba(primaryColor, 0.6),
              }}
            >
              {card?.metadata?.name?.charAt(0)?.toUpperCase() || "N"}
            </div>
          )}
        </div>

        {/* 👤 Name (centered middle) */}
        {displayName ? (
          <div
            className="mx-auto mb-2 text-center"
            style={{
              marginTop: nameTop,
              fontSize: 18,
              fontWeight: 700,
              color: nameColor,
            }}
          >
            {displayName}
          </div>
        ) : null}

        {/* 📋 DETAILS */}
        <div
          className="text-left"
          style={{
            marginTop: contentTop,
            paddingLeft: `clamp(0px, 1.6vw, ${contentLeftPadding}px)`,
            paddingRight: `clamp(0px, 1.6vw, ${contentRightPadding}px)`,
          }}
        >
          {displayRows.map(([key, value, tplLabel]) => (
            <div
              key={key}
              style={{
                marginBottom: `clamp(4px, 1.2vw, ${contentGap}px)`,
                fontSize: 14,
                lineHeight: "20px",
              }}
            >
              <span
                style={{
                  color: labelColor,
                  fontWeight: 600,
                }}
              >
                {tplLabel || formatFieldName(key)}:
              </span>{" "}
              <span
                style={{
                  color: valueColor,
                  fontWeight: 500,
                  marginLeft: 4,
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom accent using theme colors */}
      <div
        style={{
          height: 26,
          background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
          opacity: 0.95,
        }}
      />
    </Card>
  );
}

function CardDesignFive({
  card,
  tenant,
  formatFieldName,
  theme,
  templateFields,
  hiddenFields,
}) {
  const displayRows = getDisplayRows(card, templateFields)
    .filter(([key]) => !HIDDEN_DISPLAY_FIELDS.has(key))
    .filter(([key]) => !hiddenFields?.has(key))
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
    textColor,
    nameTextColor,
    valueTextColor,
    fontFamily,
    isDark,
    hexToRgba,
  } = theme;

  const bodyTextColor = textColor || (isDark ? DARK_TEXT_PRIMARY : "#ffffff");
  const nameColor = nameTextColor || bodyTextColor;
  const valueColor = valueTextColor || bodyTextColor;
  const mutedTextColor = isDark
    ? DARK_TEXT_SECONDARY
    : hexToRgba(bodyTextColor, 0.8);
  const backgroundImage =
    resolveImg(tenant?.logoUrl) || resolveImg(card.profileImageUrl);
  const cardSurfaceColor = isDark ? DARK_SURFACE_BASE : surfaceColor;
  const layout = theme.layout || {};
  const avatarTop = layout.avatarTop ?? 22;
  const avatarSize = layout.avatarSize ?? 116;
  const nameTop = layout.nameTop ?? 14;
  const contentTop = layout.contentTop ?? 12;
  const contentGap = layout.contentGap ?? 8;
  const baseSidePadding = layout.contentSidePadding ?? 6;
  const contentLeftPadding = layout.contentLeftPadding ?? baseSidePadding;
  const contentRightPadding = layout.contentRightPadding ?? baseSidePadding;

  return (
    <Card
      style={{
        width: "min(340px, 100%)",
        height: 420,
        borderRadius: 18,
        overflow: "hidden",
        position: "relative",
        background: cardSurfaceColor,
        fontFamily,
        border: isDark ? `1px solid ${DARK_BORDER_SOFT}` : undefined,
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: !backgroundImage
            ? hexToRgba(primaryColor, 0.18)
            : undefined,
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          color: bodyTextColor,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: mutedTextColor,
            }}
          >
            {tenant?.name || "Your Brand"}
          </div>

          <div
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: "50%",
              overflow: "hidden",
              margin: `${avatarTop}px auto 0`,
              border: `4px solid ${hexToRgba("#ffffff", 0.85)}`,
              boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
              background: hexToRgba(primaryColor, 0.2),
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
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#fff",
                  background: hexToRgba(primaryColor, 0.45),
                }}
              >
                {displayName?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>

          <div style={{ marginTop: nameTop }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: nameColor,
                lineHeight: 1.15,
              }}
            >
              {displayName || "Your Name"}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: mutedTextColor }}>
              {displayTitle || "Job Position"}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `clamp(6px, 2.2vw, ${contentGap}px)`,
            paddingTop: contentTop,
            paddingLeft: `clamp(0px, 2vw, ${contentLeftPadding}px)`,
            paddingRight: `clamp(0px, 2vw, ${contentRightPadding}px)`,
          }}
        >
          {displayRows.map(([key, value, tplLabel]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "baseline",
                fontSize: 12,
                lineHeight: "18px",
              }}
            >
              <span
                style={{ color: accentColor, fontWeight: 600, flex: "none" }}
              >
                {tplLabel || formatFieldName(key)}:
              </span>
              <span
                style={{
                  color: valueColor,
                  fontWeight: 500,
                  marginLeft: 6,
                  textAlign: "right",
                  overflowWrap: "anywhere",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
const CARD_DESIGNS = {
  one: CardDesignOne,
  two: CardDesignTwo,
  three: CardDesignThree,
  four: CardDesignFour,
  five: CardDesignFive,
};

function SelectCard({
  design = "one",
  card,
  tenant,
  formatFieldName,
  theme,
  templateFields,
  hiddenFields,
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
        hiddenFields={hiddenFields}
      />
    </div>
  );
}

export default SelectCard;
