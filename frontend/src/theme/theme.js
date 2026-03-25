const APP_THEME = {
  primaryColor: "#1e293b",
  primaryDark: "#0f172a",
  primaryLight: "#475569",
  secondaryColor: "#475569",
  accentColor: "#334155",
  backgroundColor: "#f8fafc",
  surfaceColor: "#ffffff",
  sidebarColor: "#09090b",
  textColor: "#0f172a",
  textMuted: "#64748b",
  borderColor: "#e2e8f0",
  successColor: "#15803d",
  warningColor: "#a16207",
  errorColor: "#b91c1c",
};

const hexToRgb = (hexColor) => {
  const normalized = hexColor.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : normalized;

  const intValue = Number.parseInt(value, 16);

  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

const hexToRgba = (hexColor, alpha = 1) => {
  const { r, g, b } = hexToRgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const applyAppThemeVariables = (theme = APP_THEME) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const primaryRgb = hexToRgb(theme.primaryColor);
  const secondaryRgb = hexToRgb(theme.secondaryColor);

  root.style.setProperty("--app-color-primary", theme.primaryColor);
  root.style.setProperty("--app-color-secondary", theme.secondaryColor);
  root.style.setProperty("--app-color-background", theme.backgroundColor);
  root.style.setProperty("--app-color-surface", theme.surfaceColor);
  root.style.setProperty("--app-color-text", theme.textColor);
  root.style.setProperty(
    "--app-color-primary-rgb",
    `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,
  );
  root.style.setProperty(
    "--app-color-secondary-rgb",
    `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`,
  );
  root.style.setProperty("--color-sidebar", theme.sidebarColor);
  root.style.setProperty("--color-border", theme.borderColor);
  root.style.setProperty("--color-text-muted", theme.textMuted);
  root.style.setProperty("--color-success", theme.successColor);
  root.style.setProperty("--color-warning", theme.warningColor);
  root.style.setProperty("--color-error", theme.errorColor);
};

const antdThemeConfig = {
  token: {
    colorPrimary: APP_THEME.primaryColor,
    colorInfo: APP_THEME.primaryColor,
    colorLink: APP_THEME.primaryColor,
    colorSuccess: APP_THEME.successColor,
    colorWarning: APP_THEME.warningColor,
    colorError: APP_THEME.errorColor,
    colorTextBase: APP_THEME.textColor,
    colorBgBase: APP_THEME.surfaceColor,
    colorBgLayout: APP_THEME.backgroundColor,
    borderRadius: 8,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
    controlHeight: 36,
  },
  components: {
    Layout: {
      siderBg: APP_THEME.sidebarColor,
      headerBg: APP_THEME.surfaceColor,
      bodyBg: APP_THEME.backgroundColor,
    },
    Menu: {
      darkItemBg: APP_THEME.sidebarColor,
      darkSubMenuItemBg: "#111113",
      darkItemSelectedBg: "rgba(255, 255, 255, 0.10)",
      darkItemSelectedColor: "#ffffff",
      darkItemHoverBg: "rgba(255, 255, 255, 0.06)",
      darkItemColor: "rgba(255, 255, 255, 0.60)",
      darkItemHoverColor: "rgba(255, 255, 255, 0.90)",
      itemBorderRadius: 8,
      iconSize: 15,
    },
    Card: {
      borderRadiusLG: 12,
    },
    Button: {
      borderRadius: 8,
      fontWeight: 500,
      paddingContentHorizontal: 16,
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
    },
    Table: {
      borderRadius: 10,
      headerBg: "#f8fafc",
      headerColor: "#64748b",
      headerSortActiveBg: "#f1f5f9",
    },
    Tag: {
      borderRadius: 20,
      fontSize: 11,
      fontSizeSM: 10,
    },
    Modal: {
      borderRadiusLG: 14,
    },
    Drawer: {
      borderRadiusLG: 14,
    },
    Alert: {
      borderRadius: 10,
    },
    Statistic: {
      contentFontSize: 28,
      titleFontSize: 13,
    },
  },
};

export { APP_THEME, antdThemeConfig, applyAppThemeVariables, hexToRgba };